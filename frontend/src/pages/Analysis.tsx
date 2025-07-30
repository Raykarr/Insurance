import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import apiService from '../lib/api';
import { Finding, AnalysisStatus } from '../lib/api';
import { fileState } from '@/lib/state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  X, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  FileCheck,
  Brain,
  Search,
  MessageCircle,
  Database,
  Cpu,
  Network,
  HardDrive,
  RotateCw,
  Eye
} from 'lucide-react';
import PDFViewer from '@/components/PDFViewer';
import ChatPanel from '@/components/ChatPanel';

interface AnalysisState {
  documentId: string | null;
  filename: string | null;
  isUploading: boolean;
  isAnalyzing: boolean;
}

interface ProcessStep {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  message: string;
  timestamp: Date;
  duration?: number;
  icon?: React.ReactNode;
}

const Analysis: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    documentId: null,
    filename: null,
    isUploading: false,
    isAnalyzing: false,
  });
  
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [itemsPerPage] = useState(10);

  // Add process step helper
  const addProcessStep = useCallback((step: Omit<ProcessStep, 'timestamp'>) => {
    setProcessSteps(prev => [...prev, { ...step, timestamp: new Date() }]);
  }, []);

  const updateProcessStep = useCallback((id: string, updates: Partial<ProcessStep>) => {
    setProcessSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  }, []);

  // Check for stored file on component mount and auto-start upload
  useEffect(() => {
    const storedFile = fileState.getFile();
    if (storedFile && !currentFile) {
      console.log('📁 [Frontend] Found stored file, auto-starting upload:', storedFile.name);
      setCurrentFile(storedFile);
      handleFileUpload(storedFile);
      fileState.clearFile(); // Clear after use
    }
  }, [currentFile]);

  // Check backend health on component mount
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        console.log('🔍 [Frontend] Checking backend health...');
        const health = await apiService.healthCheck();
        console.log('✅ [Frontend] Backend health:', health);
        addProcessStep({
          id: 'backend-health-check',
          title: 'Backend Connection',
          status: 'completed',
          message: 'Successfully connected to backend server.',
          icon: <Network className="w-4 h-4" />
        });
      } catch (error) {
        console.error('❌ [Frontend] Backend health check failed:', error);
        addProcessStep({
          id: 'backend-health-check',
          title: 'Backend Connection',
          status: 'error',
          message: 'Failed to connect to backend server. Please ensure the backend is running.',
          icon: <AlertCircle className="w-4 h-4" />
        });
      }
    };
    
    checkBackendHealth();
  }, [addProcessStep]);

  // Query for analysis status and progress
  const { data: analysisStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['analysis-status', analysisState.documentId],
    queryFn: () => apiService.getAnalysisStatus(analysisState.documentId!),
    enabled: !!analysisState.documentId,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Query for real-time progress
  const { data: progressData } = useQuery({
    queryKey: ['progress', analysisState.documentId],
    queryFn: () => apiService.getProgress(analysisState.documentId!),
    enabled: !!analysisState.documentId && analysisStatus?.status !== 'completed',
    refetchInterval: 2000, // Poll every 2 seconds for progress
    retry: 3,
    retryDelay: 1000,
  });

  // Handle analysis status and progress updates
  useEffect(() => {
    if (analysisStatus) {
      console.log('🔍 [Frontend] Analysis status update:', analysisStatus);
      if (analysisStatus.status === 'completed') {
        setAnalysisProgress(100);
        updateProcessStep('analysis', {
          status: 'completed',
          message: `Analysis completed! Found ${analysisStatus.findings_count || 0} concerns.`,
          icon: <CheckCircle2 className="w-4 h-4" />
        });
        setAnalysisState(prev => ({ ...prev, isAnalyzing: false }));
      } else if (analysisStatus.status === 'failed') {
        updateProcessStep('analysis', {
          status: 'error',
          message: 'Analysis failed. Please try again.',
          icon: <AlertCircle className="w-4 h-4" />
        });
        setAnalysisState(prev => ({ ...prev, isAnalyzing: false }));
      }
    }
  }, [analysisStatus, updateProcessStep]);

  // Handle real-time progress updates
  useEffect(() => {
    if (progressData) {
      console.log('📊 [Frontend] Progress update:', progressData);
      setAnalysisProgress(progressData.progress);
      
      if (progressData.status === 'analyzing') {
        updateProcessStep('analysis', {
          status: 'in-progress',
          message: progressData.message,
          icon: <Brain className="w-4 h-4" />
        });
      } else if (progressData.status === 'pending') {
        updateProcessStep('analysis', {
          status: 'in-progress',
          message: progressData.message,
          icon: <Clock className="w-4 h-4" />
        });
      } else if (progressData.status === 'completed') {
        updateProcessStep('analysis', {
          status: 'completed',
          message: 'Analysis completed successfully!',
          icon: <CheckCircle2 className="w-4 h-4" />
        });
        setAnalysisProgress(100);
      } else if (progressData.status === 'failed') {
        updateProcessStep('analysis', {
          status: 'error',
          message: 'Analysis failed. Please try again.',
          icon: <AlertCircle className="w-4 h-4" />
        });
      }
    }
  }, [progressData, updateProcessStep]);

  // Query for findings
  const { data: findings = [], refetch: refetchFindings, error: findingsError } = useQuery({
    queryKey: ['findings', analysisState.documentId],
    queryFn: () => apiService.getFindings(analysisState.documentId!),
    enabled: !!analysisState.documentId && analysisStatus?.status === 'completed',
    retry: 3,
    retryDelay: 1000,
  });

  // Handle findings updates
  useEffect(() => {
    if (findings.length > 0) {
      console.log('✅ [Frontend] Findings loaded:', findings.length, 'findings');
      addProcessStep({
        id: 'findings-loaded',
        title: 'Findings Retrieved',
        status: 'completed',
        message: `Successfully loaded ${findings.length} findings from analysis.`,
        icon: <FileCheck className="w-4 h-4" />
      });
    }
  }, [findings, addProcessStep]);

  // Handle findings errors
  useEffect(() => {
    if (findingsError) {
      console.error('❌ [Frontend] Findings error:', findingsError);
      addProcessStep({
        id: 'findings-error',
        title: 'Findings Error',
        status: 'error',
        message: `Failed to load findings: ${findingsError instanceof Error ? findingsError.message : 'Unknown error'}`,
        icon: <AlertCircle className="w-4 h-4" />
      });
    }
  }, [findingsError, addProcessStep]);

  // Upload mutation with detailed logging and progress simulation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('📤 [Frontend] Starting file upload:', file.name, file.size, 'bytes');
      
      // Add initial upload step
      addProcessStep({
        id: 'upload-start',
        title: 'File Upload Started',
        status: 'in-progress',
        message: `Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`,
        icon: <Upload className="w-4 h-4" />
      });

      // Simulate upload progress (0-30%)
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 30) {
            clearInterval(uploadInterval);
            return 30;
          }
          return prev + 5;
        });
      }, 200);

      try {
        const result = await apiService.uploadDocument(file);
        clearInterval(uploadInterval);
        setUploadProgress(50); // Upload complete, now processing
        
        console.log('✅ [Frontend] Upload successful:', result);
        updateProcessStep('upload-start', {
          status: 'completed',
          message: `Upload completed! Document ID: ${result.document_id.substring(0, 8)}...`,
          icon: <CheckCircle2 className="w-4 h-4" />
        });

        // Add processing steps based on backend response
        addProcessStep({
          id: 'text-extraction',
          title: 'Text Extraction',
          status: 'completed',
          message: `Extracted ${result.total_pages} pages successfully.`,
          icon: <FileText className="w-4 h-4" />
        });

        addProcessStep({
          id: 'embedding-generation',
          title: 'Embedding Generation',
          status: 'in-progress',
          message: 'Generating document embeddings for semantic search...',
          icon: <Cpu className="w-4 h-4" />
        });

        // Simulate embedding generation progress (50-75%)
        const embeddingInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 75) {
              clearInterval(embeddingInterval);
              return 75;
            }
            return prev + 2;
          });
        }, 500);

        // Update embedding step after a delay (simulating backend processing)
        setTimeout(() => {
          updateProcessStep('embedding-generation', {
            status: 'completed',
            message: 'Document embeddings generated successfully.',
            icon: <CheckCircle2 className="w-4 h-4" />
          });
          clearInterval(embeddingInterval);
          setUploadProgress(75);
        }, 3000);

        addProcessStep({
          id: 'vector-store',
          title: 'Vector Database',
          status: 'in-progress',
          message: 'Storing document chunks in vector database...',
          icon: <Database className="w-4 h-4" />
        });

        // Update vector store step
        setTimeout(() => {
          updateProcessStep('vector-store', {
            status: 'completed',
            message: 'Document chunks stored in vector database.',
            icon: <CheckCircle2 className="w-4 h-4" />
          });
        }, 4000);

        addProcessStep({
          id: 'analysis',
          title: 'AI Analysis',
          status: 'in-progress',
          message: 'Starting AI-powered insurance concern analysis...',
          icon: <Brain className="w-4 h-4" />
        });

        setAnalysisProgress(25);

        return result;
      } catch (error) {
        clearInterval(uploadInterval);
        setUploadProgress(0);
        console.error('❌ [Frontend] Upload failed:', error);
        updateProcessStep('upload-start', {
          status: 'error',
          message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          icon: <AlertCircle className="w-4 h-4" />
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('🎉 [Frontend] Upload mutation success:', data);
      
      setAnalysisState(prev => ({
        ...prev,
        documentId: data.document_id,
        filename: data.filename,
        isUploading: false,
        isAnalyzing: true,
      }));

      toast({
        title: "Upload successful! 🎉",
        description: "Your document is being analyzed. This may take a few minutes.",
      });
    },
    onError: (error: any) => {
      console.error('💥 [Frontend] Upload mutation error:', error);
      
      setAnalysisState(prev => ({
        ...prev,
        isUploading: false,
      }));

      const errorMessage = error.response?.data?.detail || 
                          error.message || 
                          "Failed to upload document";

      toast({
        title: "Upload failed ❌",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle file upload with validation
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    
    console.log('📁 [Frontend] File selected:', file.name, file.type, file.size);
    
    // Reset state
    setProcessSteps([]);
    setUploadProgress(0);
    setAnalysisProgress(0);
    setSelectedFinding(null);
    setCurrentFile(file);

    // Validation
    if (!file.type.includes('pdf')) {
      console.error('❌ [Frontend] Invalid file type:', file.type);
      toast({
        title: "Invalid file type ❌",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      console.error('❌ [Frontend] File too large:', file.size);
      toast({
        title: "File too large ❌",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ [Frontend] File validation passed, starting upload...');
    
    setAnalysisState(prev => ({ ...prev, isUploading: true }));
    uploadMutation.mutate(file);
  }, [uploadMutation, toast]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // File input change handler
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // Trigger file input
  const handleChooseFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'exclusions': return <X className="w-4 h-4" />;
      case 'limitations': return <AlertTriangle className="w-4 h-4" />;
      case 'waiting periods': return <Clock className="w-4 h-4" />;
      case 'deductible': return <AlertTriangle className="w-4 h-4" />;
      case 'copayment': return <AlertTriangle className="w-4 h-4" />;
      case 'coinsurance': return <AlertTriangle className="w-4 h-4" />;
      case 'policyholder duty': return <Info className="w-4 h-4" />;
      case 'renewal restriction': return <Clock className="w-4 h-4" />;
      case 'claim process': return <FileCheck className="w-4 h-4" />;
      case 'network restriction': return <X className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(findings.map(f => f.category)))];
  
  // Filter findings by selected category
  const filteredFindings = selectedCategory === 'all' 
    ? findings 
    : findings.filter(finding => finding.category === selectedCategory);
  
  // Paginate findings
  const totalPages = Math.ceil(filteredFindings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFindings = filteredFindings.slice(startIndex, endIndex);
  
  // Group findings by category for the category view
  const findingsByCategory = findings.reduce((acc, finding) => {
    if (!acc[finding.category]) {
      acc[finding.category] = [];
    }
    acc[finding.category].push(finding);
    return acc;
  }, {} as Record<string, Finding[]>);

  // Process step status icon
  const getStepIcon = (step: ProcessStep) => {
    if (step.icon) return step.icon;
    
    switch (step.status) {
      case 'pending': return <Clock className="w-4 h-4 text-gray-400" />;
      case 'in-progress': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  // If no document is being processed and no stored file, show upload interface
  if (!analysisState.documentId && !currentFile) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Document Analysis</h1>
          <p className="text-gray-600 mt-2">
            Upload your insurance document to analyze it for potential concerns
          </p>
        </div>

        {/* Upload Area */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>Upload Insurance Document</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Drop your PDF here
              </h3>
              <p className="text-gray-500 mb-4">
                or click to browse files
              </p>
              <Button onClick={handleChooseFile} disabled={analysisState.isUploading}>
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Process Steps */}
        {processSteps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5" />
                <span>Processing Steps</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Upload Progress */}
                {analysisState.isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Upload Progress</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                {/* Analysis Progress */}
                {analysisState.isAnalyzing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Analysis Progress</span>
                      <span>{analysisProgress}%</span>
                    </div>
                    <Progress value={analysisProgress} className="w-full" />
                  </div>
                )}

                {/* Process Steps */}
                <div className="space-y-3">
                  {processSteps.map((step) => (
                    <div key={step.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      {getStepIcon(step)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{step.title}</h4>
                          <span className="text-xs text-gray-500">
                            {step.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{step.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analysis Results</h1>
            <p className="text-gray-600 mt-2">
              Document: {currentFile?.name || analysisState.filename?.substring(0, 20)}...
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={analysisStatus?.status === 'completed' ? 'default' : 'secondary'}>
              {analysisStatus?.status || 'Unknown'}
            </Badge>
            {analysisStatus?.findings_count !== undefined && (
              <Badge variant="outline">
                {analysisStatus.findings_count} findings
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('🔄 [Frontend] Manual refresh triggered');
                refetchStatus();
                refetchFindings();
              }}
              disabled={!analysisState.documentId}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>



      {/* Top Row: Debug Info and Insurance Concerns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
        {/* Debug Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div><strong>Document ID:</strong> {analysisState.documentId}</div>
            <div><strong>Analysis Status:</strong> {analysisStatus?.status || 'unknown'}</div>
            <div><strong>Findings Count:</strong> {findings.length}</div>
            <div><strong>Progress Data:</strong> {JSON.stringify(progressData)}</div>
            <div><strong>Upload Progress:</strong> {uploadProgress}%</div>
            <div><strong>Analysis Progress:</strong> {analysisProgress}%</div>
            <div><strong>Process Steps:</strong> {processSteps.length}</div>
          </CardContent>
        </Card>

        {/* Insurance Concerns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5" />
                <span>Insurance Concerns</span>
                <Badge variant="outline">{filteredFindings.length}</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Scroll to findings section or expand it
                  const findingsSection = document.getElementById('findings-section');
                  if (findingsSection) {
                    findingsSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-xs"
              >
                <Eye className="w-4 h-4 mr-1" />
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Category Filters */}
            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-2">Filter by Category</h4>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(category);
                      setCurrentPage(1); // Reset to first page
                    }}
                    className="text-xs"
                  >
                    {category === 'all' ? 'All' : category}
                    {category !== 'all' && (
                      <Badge variant="secondary" className="ml-1">
                        {findings.filter(f => f.category === category).length}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Findings List */}
            <div id="findings-section" className="space-y-3 max-h-96 overflow-y-auto">
              {paginatedFindings.map((finding) => (
                <Card 
                  key={finding.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedFinding?.id === finding.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedFinding(finding)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(finding.category)}
                        <Badge variant={getSeverityColor(finding.severity)}>
                          {finding.severity}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        Page {finding.page_num}
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs mb-1">
                      {finding.category}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {finding.summary}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {Math.round(finding.confidence_score * 100)}% confidence
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Document Viewer and Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF Viewer */}
        <div>
          <PDFViewer 
            documentId={analysisState.documentId}
            selectedFinding={selectedFinding}
            findings={findings}
          />
        </div>

        {/* Chat Panel */}
        <div>
          {selectedFinding ? (
            <ChatPanel finding={selectedFinding} />
          ) : (
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5" />
                  <span>Chat with AI</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a finding to start chatting</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analysis; 