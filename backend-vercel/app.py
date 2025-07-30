import asyncio
import hashlib
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

import fitz 
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
from pydantic import BaseModel
from tiktoken import get_encoding

# API-based services
import requests
from pinecone import Pinecone
from supabase import create_client, Client
from groq import Groq

# Configure logger for production
logger.remove()
logger.add(lambda msg: print(msg, end=""), colorize=True,
           format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level}</level> | {message}",
           level="INFO")

# Load environment variables
try:
    from dotenv import load_dotenv
    from pathlib import Path
    
    # This ensures the .env file is loaded from the `backend` directory
    # regardless of where the script is run from.
    env_path = Path(__file__).parent / '.env'
    if env_path.is_file():
        load_dotenv(dotenv_path=env_path)
        logger.info(f"✅ Loaded environment variables from: {env_path}")
    else:
        logger.warning(f"⚠️ .env file not found at {env_path}. Relying on system environment variables.")

except ImportError:
    logger.info("dotenv not installed, skipping .env file load.")

# --- API Keys & Client Initialization ---

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
HF_API_KEY = os.getenv("HF_API_KEY")

# Pinecone
pc: Optional[Pinecone] = None
if PINECONE_API_KEY:
    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)
        logger.info("✅ Pinecone client initialized.")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Pinecone: {e}")
else:
    logger.warning("⚠️ PINECONE_API_KEY not set. Vector search will be disabled.")

# Supabase
supabase_client: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✅ Supabase client initialized.")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Supabase: {e}")
else:
    logger.warning("⚠️ Supabase credentials not set. Database operations will be disabled.")

# Vercel serverless functions have read-only file system
# We'll store files in database instead
UPLOADS_DIR = None


# --- Production-Ready Core Functions ---

def get_llm_client() -> Optional[Groq]:
    """Initializes and returns a Groq client if the API key is available."""
    if not GROQ_API_KEY:
        logger.error("❌ GROQ_API_KEY not set. LLM analysis is disabled.")
        return None
    try:
        return Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        logger.error(f"❌ Failed to create Groq client: {e}")
        return None

async def get_embeddings_huggingface(texts: List[str]) -> List[List[float]]:
    """Get embeddings using Hugging Face Inference API with requests."""
    if not HF_API_KEY:
        logger.error("❌ HF_API_KEY not set. Cannot generate embeddings.")
        raise HTTPException(status_code=500, detail="Embedding service is not configured.")

    try:
        import requests
        
        headers = {
            "Authorization": f"Bearer {HF_API_KEY}",
            "Content-Type": "application/json"
        }
        model = "sentence-transformers/all-mpnet-base-v2"
        
        embeddings = []
        for text in texts:
            response = requests.post(
                f"https://api-inference.huggingface.co/models/{model}",
                headers=headers,
                json={"inputs": [text]},
                timeout=30
            )
            if response.status_code == 200:
                data = response.json()
                # Preferred response format: {"embedding": [...] }
                if isinstance(data, dict) and "embedding" in data:
                    embeddings.append(data["embedding"])
                    continue
                # Fallback: some models return list directly
                if isinstance(data, list):
                    embeddings.append(data[0] if isinstance(data[0], list) else data)
                    continue
                logger.warning(f"⚠️ Unexpected HF response format: {type(data)}")
            else:
                logger.debug(f"⚠️ HF API HTTP {response.status_code}: {response.text[:120]}")
            # Fallback embedding when HF call fails
            embeddings.append(_get_fallback_embedding(text))
        
        logger.info(f"✅ Generated {len(embeddings)} embeddings using HF API")
        return embeddings
        
    except Exception as e:
        logger.error(f"❌ Hugging Face API error during embedding generation: {e}")
        # Return fallback embeddings instead of raising exception
        return [_get_fallback_embedding(text) for text in texts]

def _get_fallback_embedding(text: str) -> List[float]:
    """Generate fallback embedding using hash for 768 dimensions."""
    import hashlib
    hash_obj = hashlib.md5(text.encode())
    # all-mpnet-base-v2 has 768 dimensions
    return [float(x) / 255.0 for x in hash_obj.digest()] * 48  # 768 dimensions

# --- PDF Processing and Chunking ---

def _sync_extract_with_coordinates(pdf_bytes: bytes) -> List[Dict[str, Any]]:
    """Synchronous core logic for text and coordinate extraction."""
    text_blocks = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page_num, page in enumerate(doc, 1):
            blocks = page.get_text("dict").get("blocks", [])
            for block in blocks:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            if span["text"].strip():
                                text_blocks.append({
                                    "text": span["text"].strip(),
                                    "page_num": page_num,
                                    "coordinates": list(span["bbox"]),
                                    "block_id": f"p{page_num}b{len(text_blocks)}"
                                })
    return text_blocks

async def extract_text_with_coordinates(pdf_bytes: bytes) -> List[Dict[str, Any]]:
    """Extracts text blocks with page numbers and coordinates from a PDF."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_extract_with_coordinates, pdf_bytes)

async def chunk_text_with_coordinates(text_blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Creates semantic chunks from text blocks while preserving location info."""
    chunks = []
    current_chunk_text = ""
    current_chunk_blocks = []
    
    enc = get_encoding("cl100k_base")
    CHUNK_SIZE_TOKENS = 250
    MIN_CHUNK_SIZE_CHARS = 50

    for block in text_blocks:
        block_text = block["text"]
        
        if (enc.encode(current_chunk_text + " " + block_text)) and (len(enc.encode(current_chunk_text + " " + block_text)) > CHUNK_SIZE_TOKENS):
            if len(current_chunk_text) >= MIN_CHUNK_SIZE_CHARS:
                first_block = current_chunk_blocks[0]
                chunks.append({
                    "id": f"chunk_{len(chunks)}",
                    "text": current_chunk_text.strip(),
                    "page_num": first_block["page_num"],
                    "coordinates": [b["coordinates"] for b in current_chunk_blocks],
                    "token_count": len(enc.encode(current_chunk_text))
                })
            current_chunk_text = ""
            current_chunk_blocks = []

        current_chunk_text += " " + block_text
        current_chunk_blocks.append(block)

    if current_chunk_text and len(current_chunk_text) >= MIN_CHUNK_SIZE_CHARS:
        first_block = current_chunk_blocks[0]
        chunks.append({
            "id": f"chunk_{len(chunks)}",
            "text": current_chunk_text.strip(),
            "page_num": first_block["page_num"],
            "coordinates": [b["coordinates"] for b in current_chunk_blocks],
            "token_count": len(enc.encode(current_chunk_text))
        })

    logger.info(f"✅ Created {len(chunks)} chunks.")
    return chunks


# --- Background Analysis Engine ---

ANALYST_PROMPT = """
You are an expert insurance policy analyst. Analyze the following text for potential policyholder concerns like exclusions, limitations, high costs, or complex duties.

IMPORTANT: You must respond with ONLY a valid JSON object. Do not include any other text, explanations, or formatting. The JSON must have these exact fields:

{
    "is_concern": true/false,  // Must be a boolean
    "category": "EXCLUSION" | "LIMITATION" | "WAITING_PERIOD" | "DEDUCTIBLE" | "COPAYMENT" | "COINSURANCE" | "POLICYHOLDER_DUTY" | "RENEWAL_RESTRICTION" | "CLAIM_PROCESS" | "NETWORK_RESTRICTION",
    "severity": "HIGH" | "MEDIUM" | "LOW",
    "summary": "A one-sentence, easy-to-understand summary of the concern.",
    "recommendation": "A concise, actionable recommendation for the policyholder."
}

TEXT TO ANALYZE:
{text_content}
"""

async def analyze_chunk_for_concerns(llm: Groq, chunk: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Analyzes a single text chunk for insurance concerns using the LLM."""
    if not llm: return None
    
    cache_key = f"analysis:{hashlib.sha1(chunk['text'].encode()).hexdigest()}"
    if supabase_client:
        try:
            response = supabase_client.table('cache').select('value').eq('key', cache_key).execute()
            if response.data:
                return json.loads(response.data[0]['value'])
        except Exception as e:
            logger.warning(f"⚠️ Cache lookup failed: {e}")

    try:
        # Provide a structured format for the model to follow
        prompt = f"""
        You are an expert insurance policy analyst. Analyze the following text for potential policyholder concerns.
        Please provide your analysis in the following format:
        
        Is Concern: [true/false]
        Category: [category]
        Severity: [severity]
        Summary: [one-sentence summary]
        Recommendation: [actionable recommendation]

        TEXT TO ANALYZE:
        {chunk['text']}
        """
        
        response = await asyncio.to_thread(
            llm.chat.completions.create,
            messages=[{"role": "user", "content": prompt}],
            model="llama‑3.1‑70b‑versatile",
            temperature=0.0,
            max_tokens=350,
        )
        
        result_text = response.choices[0].message.content
        
        # Parse the natural language response
        analysis_result = parse_llm_response(result_text)
        
        if analysis_result and analysis_result.get("is_concern"):
            if supabase_client:
                try:
                    supabase_client.table('cache').upsert({
                        'key': cache_key,
                        'value': json.dumps(analysis_result)
                    }).execute()
                except Exception as e:
                    logger.warning(f"⚠️ Cache save failed: {e}")
            return analysis_result
            
    except Exception as e:
        logger.error(f"❌ LLM analysis error for chunk {chunk.get('id', '')}: {e}")
    
    return None

def clean_llm_response(response: str) -> str:
    """More aggressively clean LLM response artifacts."""
    import re
    
    # Remove XML-style thinking tags and their entire content
    response = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove any other XML-like tags
    response = re.sub(r'<[^>]+>', '', response)
    
    # Remove lines that are just conversational filler or metadata
    lines = response.split('\n')
    cleaned_lines = []
    for line in lines:
        line_lower = line.strip().lower()
        if not any(phrase in line_lower for phrase in [
            "okay, so i need to analyze", "sure, i can help", "here is the analysis", "i have analyzed the text"
        ]):
            cleaned_lines.append(line)
            
    response = '\n'.join(cleaned_lines)
    
    # Standardize whitespace
    response = re.sub(r'\n\s*\n+', '\n', response.strip())
    
    return response

def parse_llm_response(response: str) -> Optional[Dict[str, Any]]:
    """Parse structured LLM response into a dictionary."""
    try:
        response = clean_llm_response(response)
        
        result = {
            "is_concern": False,
            "category": "UNCATEGORIZED",
            "severity": "UNKNOWN",
            "summary": "No concerns found",
            "recommendation": ""
        }

        # Regex to find key-value pairs, ignoring case and whitespace
        def get_value(key: str) -> Optional[str]:
            import re
            match = re.search(f"^{key}\\s*:\\s*(.*)", response, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip().replace("[", "").replace("]", "")
            return None

        is_concern_str = get_value("Is Concern")
        if is_concern_str:
            result["is_concern"] = "true" in is_concern_str.lower()

        # If the model says it's not a concern, we can stop here.
        if not result["is_concern"]:
            return result

        category_str = get_value("Category")
        if category_str:
            categories = [
                "EXCLUSION", "LIMITATION", "WAITING_PERIOD", "DEDUCTIBLE", 
                "COPAYMENT", "COINSURANCE", "POLICYHOLDER_DUTY", 
                "RENEWAL_RESTRICTION", "CLAIM_PROCESS", "NETWORK_RESTRICTION"
            ]
            for cat in categories:
                if cat.replace("_", " ").lower() in category_str.lower():
                    result["category"] = cat
                    break
        
        severity_str = get_value("Severity")
        if severity_str:
            severity_lower = severity_str.lower()
            if "high" in severity_lower: result["severity"] = "HIGH"
            elif "medium" in severity_lower: result["severity"] = "MEDIUM"
            elif "low" in severity_lower: result["severity"] = "LOW"

        summary_str = get_value("Summary")
        if summary_str:
            result["summary"] = summary_str

        recommendation_str = get_value("Recommendation")
        if recommendation_str:
            result["recommendation"] = recommendation_str

        # A final check to ensure we have a meaningful summary if a concern was flagged.
        if result["is_concern"] and (not result["summary"] or result["summary"] == "No concerns found"):
            # Fallback to grabbing the first meaningful line of text that is not a key-value pair.
            lines = [line.strip() for line in response.split('\n') if line.strip() and ":" not in line]
            if lines:
                result["summary"] = lines[0]
                
        return result
        
    except Exception as e:
        logger.error(f"❌ Failed to parse LLM response: {e}")
        return None

# --- Database Operations ---
# REMINDER: Ensure your Supabase schema matches. The 'documents' table needs:
# - id TEXT PRIMARY KEY
# - filename TEXT
# - total_pages INTEGER
# - analysis_status TEXT
# - analysis_completed_at TIMESTAMP WITH TIME ZONE
# - upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()

async def save_document_metadata(doc_id: str, filename: str, page_count: int):
    if not supabase_client: return
    try:
        supabase_client.table('documents').insert({
            'id': doc_id,
            'filename': filename,
            'total_pages': page_count,
            'analysis_status': 'pending',
        }).execute()
    except Exception as e:
        logger.error(f"❌ DB Error saving document metadata for {doc_id}: {e}")

async def save_finding(document_id: str, finding: Dict[str, Any], chunk: Dict[str, Any]):
    if not supabase_client: return
    try:
        # Calculate confidence score based on finding quality
        confidence_score = calculate_confidence_score(finding)
        
        supabase_client.table('findings').insert({
            'document_id': document_id,
            'page_num': chunk.get('page_num', 0),
            'coordinates': json.dumps(chunk.get('coordinates', [])),
            'text_content': chunk.get('text', ''),
            'category': finding.get('category', 'UNCATEGORIZED'),
            'severity': finding.get('severity', 'UNKNOWN'),
            'summary': finding.get('summary', 'No summary provided.'),
            'recommendation': finding.get('recommendation', ''),
            'confidence_score': confidence_score,
        }).execute()
    except Exception as e:
        logger.error(f"❌ DB Error saving finding for doc {document_id}: {e}")

def calculate_confidence_score(finding: Dict[str, Any]) -> float:
    """Calculate confidence score based on finding quality."""
    score = 0.5  # Base score
    
    # Adjust based on category
    if finding.get('category') != 'UNCATEGORIZED':
        score += 0.2
    
    # Adjust based on severity
    if finding.get('severity') in ['HIGH', 'MEDIUM', 'LOW']:
        score += 0.1
    
    # Adjust based on summary quality
    summary = finding.get('summary', '')
    if len(summary) > 20 and summary != 'No summary provided.':
        score += 0.1
    
    # Adjust based on recommendation quality
    recommendation = finding.get('recommendation', '')
    if len(recommendation) > 10:
        score += 0.1
    
    return min(1.0, max(0.0, score))  # Clamp between 0 and 1

async def update_analysis_status(document_id: str, status: str):
    if not supabase_client: return
    try:
        update_data = {'analysis_status': status}
        if status == 'completed':
            update_data['analysis_completed_at'] = datetime.now().isoformat()
        
        supabase_client.table('documents').update(update_data).eq('id', document_id).execute()
        logger.info(f"✅ Analysis status for {document_id} updated to '{status}'.")
    except Exception as e:
        logger.error(f"❌ DB Error updating status for doc {document_id}: {e}")

async def add_to_vectorstore(namespace: str, chunks: List[Dict[str, Any]]):
    if not pc: return
    try:
        texts = [chunk['text'] for chunk in chunks]
        embeddings = await get_embeddings_huggingface(texts)
        
        index = pc.Index("insurance-doc")
        # Ensure embedding dimension matches index (512)
        vectors = []
        for chunk, emb in zip(chunks, embeddings):
            if len(emb) != 512:
                emb = emb[:512] if len(emb) > 512 else (emb + [0.0]*(512-len(emb)))
            vectors.append({
                'id': f"{namespace}_{chunk['id']}",
                'values': emb,
                'metadata': {'text': chunk['text'], 'namespace': namespace}
            })
        
        index.upsert(vectors=vectors)
        logger.info(f"✅ Added {len(vectors)} vectors to Pinecone.")
    except Exception as e:
        logger.error(f"❌ Failed to add to vector store: {e}")

# --- Main Background Task ---

async def analyze_document_background(document_id: str):
    """The main background task to process and analyze a document."""
    logger.info(f"🔄 Starting full analysis for document: {document_id}")
    await update_analysis_status(document_id, 'analyzing')

    if not supabase_client:
        await update_analysis_status(document_id, 'failed')
        return

    try:
        # Get cached data
        blocks_response = supabase_client.table('cache').select('value').eq('key', f"blocks:{document_id}").execute()
        if not blocks_response.data:
            logger.error(f"❌ Text blocks not found in cache for {document_id}.")
            await update_analysis_status(document_id, 'failed')
            return
        
        text_blocks = json.loads(blocks_response.data[0]['value'])
        chunks = await chunk_text_with_coordinates(text_blocks)
        
        # Add to vector store in parallel
        asyncio.create_task(add_to_vectorstore(document_id, chunks))

        llm = get_llm_client()
        if not llm:
            await update_analysis_status(document_id, 'failed')
            return
            
        # Analyze chunks
        analysis_tasks = [analyze_chunk_for_concerns(llm, chunk) for chunk in chunks]
        results = await asyncio.gather(*analysis_tasks)

        # Save valid findings
        findings_count = 0
        for i, finding in enumerate(results):
            if finding and finding.get('is_concern'):
                await save_finding(document_id, finding, chunks[i])
                findings_count += 1
        
        logger.info(f"✅ Analysis complete for {document_id}. Found {findings_count} concerns.")
        await update_analysis_status(document_id, 'completed')

    except Exception as e:
        logger.error(f"❌ Unhandled error in background analysis for {document_id}: {e}")
        await update_analysis_status(document_id, 'failed')

# --- FastAPI App Setup ---

app = FastAPI(title="Insurance Document Analysis API", version="3.4.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Best to restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Static files mounting disabled for Vercel deployment
# app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- Pydantic Models ---

class IngestResponse(BaseModel):
    document_id: str
    filename: str
    total_pages: int
    analysis_status: str

class AnalysisStatus(BaseModel):
    document_id: str
    status: str
    findings_count: int

class Finding(BaseModel):
    id: int
    category: str
    severity: str
    summary: str
    recommendation: Optional[str]
    page_num: int
    confidence_score: float

# --- API Endpoints ---

@app.get("/")
async def root():
    return {"message": "Insurance Document Analysis API is running."}

@app.post("/ingest", response_model=IngestResponse)
async def ingest(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        pdf_bytes = await file.read()
        if not pdf_bytes:
            raise HTTPException(400, "Empty file received.")
        
        doc_id = hashlib.sha256(pdf_bytes).hexdigest()
        
        # CORRECTED: Allow re-analysis by deleting old data first.
        if supabase_client:
            existing = supabase_client.table('documents').select('id').eq('id', doc_id).execute()
            if existing.data:
                logger.warning(f"⚠️ Document {doc_id} already exists. Deleting old data to re-analyze.")
                # Delete old findings before starting new analysis
                supabase_client.table('findings').delete().eq('document_id', doc_id).execute()
                # We can keep the document entry and just update it
                supabase_client.table('documents').update({'analysis_status': 'pending'}).eq('id', doc_id).execute()
            else:
                 # If it doesn't exist, save new metadata
                text_blocks_temp = await extract_text_with_coordinates(pdf_bytes)
                page_count_temp = max(b['page_num'] for b in text_blocks_temp) if text_blocks_temp else 0
                await save_document_metadata(doc_id, file.filename, page_count_temp)


        # Process PDF directly without saving to disk (Vercel read-only file system)
        # pdf_bytes will be processed directly without saving to disk
        
        text_blocks = await extract_text_with_coordinates(pdf_bytes)
        page_count = max(b['page_num'] for b in text_blocks) if text_blocks else 0

        # Cache text blocks for the background worker
        if supabase_client:
            try:
                supabase_client.table('cache').upsert({
                    'key': f"blocks:{doc_id}",
                    'value': json.dumps(text_blocks)
                }).execute()
            except Exception as e:
                logger.warning(f"⚠️ Failed to cache text blocks for {doc_id}: {e}")
        
        background_tasks.add_task(analyze_document_background, doc_id)
        
        return IngestResponse(
            document_id=doc_id,
            filename=file.filename,
            total_pages=page_count,
            analysis_status="pending"
        )
    except Exception as e:
        logger.error(f"❌ Ingestion error: {e}")
        raise HTTPException(500, "An unexpected error occurred during file ingestion.")

@app.get("/analysis/{document_id}", response_model=AnalysisStatus)
async def get_analysis_status(document_id: str):
    if not supabase_client:
        raise HTTPException(503, "Database service is not available.")
    try:
        doc_response = supabase_client.table('documents').select('analysis_status').eq('id', document_id).execute()
        if not doc_response.data:
            raise HTTPException(404, "Document not found.")
        
        status = doc_response.data[0]['analysis_status']
        
        count_response = supabase_client.table('findings').select('id', count='exact').eq('document_id', document_id).execute()
        findings_count = count_response.count or 0
        
        return AnalysisStatus(
            document_id=document_id,
            status=status,
            findings_count=findings_count
        )
    except Exception as e:
        logger.error(f"❌ Failed to get analysis status for {document_id}: {e}")
        raise HTTPException(500, "Database error.")

@app.get("/findings/{document_id}", response_model=List[Finding])
async def get_findings(document_id: str):
    if not supabase_client:
        raise HTTPException(503, "Database service is not available.")
    try:
        response = supabase_client.table('findings').select('*').eq('document_id', document_id).order('severity').order('page_num').execute()
        
        # Deduplicate findings based on summary
        unique_findings = {}
        for row in response.data:
            summary = row['summary']
            if summary not in unique_findings:
                 unique_findings[summary] = Finding(**row)

        return list(unique_findings.values())
    except Exception as e:
        logger.error(f"❌ Failed to get findings for {document_id}: {e}")
        return []

@app.get("/documents/{document_id}/pdf")
async def get_pdf(document_id: str):
    """PDF serving disabled in Vercel deployment due to read-only file system."""
    raise HTTPException(404, "PDF serving not available in serverless deployment.")

@app.get("/progress/{document_id}")
async def get_processing_progress(document_id: str):
    """Return simple progress information for the frontend polling UI."""
    if not supabase_client:
        return {"status": "error", "progress": 0, "message": "Database not configured"}

    try:
        resp = supabase_client.table('documents').select('analysis_status').eq('id', document_id).execute()
        if not resp.data:
            return {"status": "not_found", "progress": 0, "message": "Document not found"}

        status = resp.data[0]['analysis_status']
        percent = {
            'pending': 10,
            'analyzing': 60,
            'completed': 100,
            'failed': 0
        }.get(status, 0)

        message = {
            'pending': 'Waiting for analysis to start',
            'analyzing': 'AI is analyzing the document',
            'completed': 'Analysis completed',
            'failed': 'Analysis failed'
        }.get(status, 'Unknown status')

        return {
            'status': status,
            'progress': percent,
            'message': message,
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Progress endpoint error: {e}")
        return {"status": "error", "progress": 0, "message": "Internal server error"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "groq": GROQ_API_KEY is not None,
            "pinecone": pc is not None,
            "supabase": supabase_client is not None,
            "huggingface": HF_API_KEY is not None
        }
    }

# --- Chat Endpoint ---

@app.post("/findings/{finding_id}/chat")
async def contextual_chat(finding_id: int, request: Dict[str, str]):
    """Contextual chat about specific finding"""
    llm = get_llm_client()
    if not llm:
        raise HTTPException(500, "Chat service not available")
    
    try:
        # Get finding details from database
        if not supabase_client:
            raise HTTPException(500, "Database not configured")
            
        resp = supabase_client.table('findings').select('*').eq('id', finding_id).execute()
        if not resp.data:
            raise HTTPException(404, "Finding not found")
        
        finding = resp.data[0]
        
        prompt = f"""
        You are an expert insurance policy analyst. Answer the user's question about this specific finding.
        
        Context:
        - Text Content: {finding['text_content']}
        - Finding: {finding['summary']}
        - Category: {finding['category']}
        - Severity: {finding['severity']}
        - Recommendation: {finding['recommendation']}
        
        Question: {request.get('q', '')}
        
        Provide a helpful, accurate answer based on the finding context above.
        """
        
        response = await asyncio.to_thread(
            llm.chat.completions.create,
            messages=[{"role": "user", "content": prompt}],
            model="llama‑3.1‑70b‑versatile",
            temperature=0.1,
            max_tokens=500,
        )
        
        return {
            "answer": response.choices[0].message.content,
            "finding_id": finding_id,
            "context": {
                "category": finding['category'],
                "summary": finding['summary'],
                "text_content": finding['text_content']
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Chat error for finding {finding_id}: {e}")
        raise HTTPException(500, f"Chat failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)