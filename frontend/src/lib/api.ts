import axios from 'axios';

// Determine sensible default base URL
// Priority:
// 1) VITE_API_URL env var if provided
// 2) If running on Vercel (or any hosted env) without env set, use the deployed HF Space URL
// 3) Otherwise default to local dev FastAPI
const inferredDefaultBaseUrl =
  typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app')
    ? 'https://raykarr-insurance-document-analyzer-api.hf.space'
    : 'http://localhost:7860';

export const API_BASE_URL = import.meta.env.VITE_API_URL || inferredDefaultBaseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 220000,
});

export interface IngestResponse {
  document_id: string;
  filename: string;
  total_pages: number;
  analysis_status: string;
}

export interface AnalysisStatus {
  document_id: string;
  status: string;
  findings_count?: number;
}

export interface Finding {
  id: number;
  category: string;
  severity: string;
  summary: string;
  recommendation?: string;
  page_num: number;
  confidence_score: number;
}

export interface ChatResponse {
  answer: string;
  finding_id: number;
  context: {
    category: string;
    summary: string;
    text_content: string;
  };
}

export const apiService = {
  async uploadDocument(file: File): Promise<IngestResponse> {
    console.log(`📤 [API] Uploading file: ${file.name} (${file.size} bytes) to ${API_BASE_URL}/ingest`);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post<IngestResponse>('/ingest', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log(`✅ [API] Upload successful:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ [API] Upload failed:`, error);
      throw error;
    }
  },

  async getAnalysisStatus(documentId: string): Promise<AnalysisStatus> {
    const response = await api.get<AnalysisStatus>(`/analysis/${documentId}`);
    return response.data;
  },

  async getFindings(documentId: string): Promise<Finding[]> {
    const response = await api.get<Finding[]>(`/findings/${documentId}`);
    return response.data;
  },

  async getFindingsByCategory(documentId: string, category: string): Promise<Finding[]> {
    const response = await api.get<Finding[]>(`/findings/${documentId}/category/${category}`);
    return response.data;
  },

  async sendChatMessage(findingId: number, question: string): Promise<ChatResponse> {
    const response = await api.post<ChatResponse>(`/findings/${findingId}/chat`, { q: question });
    return response.data;
  },

  async healthCheck(): Promise<{ status: string }> {
    console.log(`🔍 [API] Checking health at ${API_BASE_URL}/health`);
    try {
      const response = await api.get<{ status: string }>('/health');
      console.log(`✅ [API] Health check successful:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ [API] Health check failed:`, error);
      throw error;
    }
  },

  async getProgress(documentId: string): Promise<{
    status: string;
    progress: number;
    message: string;
    timestamp: string;
  }> {
    const response = await api.get(`/progress/${documentId}`);
    return response.data;
  },
};

export default apiService; 
