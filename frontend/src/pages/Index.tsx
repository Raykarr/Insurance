import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { fileState } from '@/lib/state';

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    
    if (!file.type.includes('pdf')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    // Store file in state and navigate to analysis page
    fileState.setFile(file);
    navigate('/analysis');
  }, [navigate, toast]);

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

  return (
    <div className="min-h-screen bg-gradient-insurance">
      {/* Header */}
      <header className="bg-card shadow-lg border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-primary rounded-xl shadow-insurance animate-glow">
                <span className="text-primary-foreground font-bold text-xl">I</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Insurance Document Analyzer
                </h1>
                <p className="text-sm text-muted-foreground">
                  Proactive policy analysis with AI
                </p>
              </div>
            </div>
            
            <nav className="flex items-center space-x-8">
              <a href="#features" className="text-foreground/70 hover:text-insurance-blue transition-colors font-medium">
                Features
              </a>
              <a href="#how-it-works" className="text-foreground/70 hover:text-insurance-blue transition-colors font-medium">
                How It Works
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Understand Your Insurance Policy
            <span className="text-transparent bg-clip-text bg-gradient-primary"> Instantly</span>
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Upload your insurance policy and let AI identify key concerns, exclusions, and important details automatically.
          </p>
        </div>
        
        {/* Upload Section */}
        <div className="max-w-4xl mx-auto mb-20">
          <Card 
            className={`border-2 border-dashed transition-colors shadow-insurance ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-insurance-blue/30 hover:border-insurance-blue/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="p-16">
              <div className="text-center space-y-6">
                <div className="mx-auto w-24 h-24 bg-accent rounded-full flex items-center justify-center shadow-lg animate-float">
                  <Upload className="w-12 h-12 text-insurance-blue" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold text-foreground">
                    Upload Insurance Policy
                  </h3>
                  <p className="text-xl text-muted-foreground">
                    {isDragOver ? 'Drop your PDF here' : 'Drag & drop your insurance policy PDF here'}
                  </p>
                  <p className="text-lg text-muted-foreground/70">
                    Supported format: PDF | Maximum file size: 10MB
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg" 
                    onClick={handleChooseFile}
                    disabled={isUploading}
                    className="mt-8 px-8 py-4 bg-gradient-primary hover:shadow-card-hover transition-all transform hover:scale-105"
                  >
                    {isUploading ? 'Uploading...' : 'Choose File'}
                  </Button>
                  <Button 
                    variant="outline"
                    size="lg"
                    onClick={() => navigate('/analysis')}
                    className="mt-8 px-8 py-4"
                  >
                    View Demo
                  </Button>

                </div>

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
        </div>

        {/* Features Section */}
        <div id="features" className="mb-20">
          <h3 className="text-4xl font-bold text-foreground text-center mb-12">
            Powerful Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-accent rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-insurance-blue text-2xl">🔍</span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-foreground mb-4">Smart Analysis</h4>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      AI automatically scans your policy for exclusions, limitations, and important clauses with high accuracy.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-accent rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-insurance-accent text-2xl">📍</span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-foreground mb-4">Interactive Highlights</h4>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Click on findings to see exactly where they appear in your PDF document with precise highlighting.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-accent rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-insurance-warning text-2xl">💬</span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-foreground mb-4">Contextual Chat</h4>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Ask questions about specific findings and get detailed explanations with confidence scores.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="mb-16">
          <Card className="shadow-xl">
            <CardContent className="p-12">
              <h3 className="text-4xl font-bold text-foreground text-center mb-12">
                How It Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-primary text-primary-foreground rounded-full mx-auto text-xl font-bold shadow-insurance">
                    1
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-foreground mb-3">Upload PDF</h4>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Drag and drop your insurance policy PDF into our secure system
                    </p>
                  </div>
                </div>
                
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-primary text-primary-foreground rounded-full mx-auto text-xl font-bold shadow-insurance">
                    2
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-foreground mb-3">AI Analysis</h4>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Our advanced AI scans for concerns and categorizes them by severity
                    </p>
                  </div>
                </div>
                
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-primary text-primary-foreground rounded-full mx-auto text-xl font-bold shadow-insurance">
                    3
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-foreground mb-3">Review Findings</h4>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Browse categorized findings with confidence scores and explanations
                    </p>
                  </div>
                </div>
                
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-primary text-primary-foreground rounded-full mx-auto text-xl font-bold shadow-insurance">
                    4
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-foreground mb-3">Ask Questions</h4>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Get detailed explanations about specific clauses and their implications
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-primary text-primary-foreground shadow-xl">
          <CardContent className="p-12 text-center">
            <h3 className="text-4xl font-bold mb-6">
              Ready to Analyze Your Policy?
            </h3>
            <p className="text-xl mb-8 opacity-90">
              Get started in seconds with our powerful AI analysis
            </p>
            <Button 
              variant="secondary"
              size="lg"
              className="px-10 py-4 font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Start Analysis Now
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold">I</span>
              </div>
              <span className="text-xl font-bold text-foreground">Insurance Document Analyzer</span>
            </div>
            <p className="text-muted-foreground text-lg">
              &copy; Pro Insurance Document Analyzer. Built with modern AI technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;