# Insurance Document Analysis API

A FastAPI-based API for analyzing insurance documents using AI.

## Features

- PDF document processing and text extraction
- AI-powered analysis of insurance documents
- Vector search for document similarity
- Real-time analysis status tracking
- Chat interface for document queries

## API Endpoints

- `GET /health` - Health check
- `POST /ingest` - Upload and analyze PDF documents
- `GET /analysis/{document_id}` - Get analysis status
- `GET /findings/{document_id}` - Get analysis findings
- `POST /findings/{finding_id}/chat` - Chat about specific findings

## Environment Variables

Required for full functionality:
- `GROQ_API_KEY` - Groq API key for LLM analysis
- `PINECONE_API_KEY` - Pinecone API key for vector search
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase API key
- `HF_API_KEY` - Hugging Face API key (optional)

## Local Development

```bash
pip install -r requirements.txt
python app.py
```

The API will be available at `http://localhost:7860`

## Hugging Face Spaces Deployment

This app is configured for deployment on Hugging Face Spaces:

1. **Create a new Space** on Hugging Face
2. **Choose "Docker"** as the SDK
3. **Upload these files** to your Space:
   - `app.py` - Main FastAPI application
   - `requirements.txt` - Python dependencies
   - `README.md` - This file

4. **Set Environment Variables** in your Space settings:
   - `GROQ_API_KEY`
   - `PINECONE_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `HF_API_KEY` (optional)

5. **Deploy** - Hugging Face will automatically build and deploy your API

The API will be available at your Space URL (e.g., `https://your-username-insurance-api.hf.space`)

## Benefits of Hugging Face Spaces

- ✅ **Better Python support** than Vercel
- ✅ **No file size limits** like Vercel's 4.5MB
- ✅ **Longer execution times** for AI processing
- ✅ **Built-in GPU support** if needed
- ✅ **Free tier available**
- ✅ **Easy environment variable management** 