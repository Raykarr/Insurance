import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-insurance-document-analyzer-z7vbrtlu2-raykarrs-projects.vercel.app/';

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
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<IngestResponse>('/ingest', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
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
    const response = await api.get<{ status: string }>('/health');
    return response.data;
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
