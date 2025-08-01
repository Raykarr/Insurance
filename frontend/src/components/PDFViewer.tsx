import React, { useState, useEffect } from 'react';
import { Finding } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// Set up PDF.js worker - disable worker completely cors issue de raha gadha
// pdfjs.GlobalWorkerOptions.workerSrc = '';

interface PDFViewerProps {
  documentId: string | null;
  selectedFinding: Finding | null;
  findings: Finding[];
}

const PDFViewer: React.FC<PDFViewerProps> = ({ documentId, selectedFinding, findings }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const pdfUrl = `http://localhost:7860/documents/${documentId}/pdf#view=FitH&toolbar=1`;

  useEffect(() => {
    if (documentId) {
      setLoading(true);
      setError(null);
      
      // Testinggggg 
      fetch(pdfUrl, { 
        method: 'GET',
        headers: {
          'Accept': 'application/pdf,application/octet-stream,*/*'
        }
      })
        .then(response => {
          if (response.ok) {
            setLoading(false);
          } else {
            console.error('PDF fetch error:', response.status, response.statusText);
            setError(`PDF not accessible (${response.status})`);
            setLoading(false);
          }
        })
        .catch(err => {
          console.error('PDF fetch error:', err);
          setError('Failed to load PDF');
          setLoading(false);
        });
    }
  }, [documentId, pdfUrl]);

  const handleDownload = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleViewInNewTab = () => {
    // Force reload the PDF viewer
    setLoading(true);
    setError(null);
    
    // Small delay to show loading state
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  const handleEmbeddedView = () => {
    // Try to reload the object tag
    const object = document.querySelector('object[data*="pdf"]') as HTMLObjectElement;
    if (object) {
      object.data = pdfUrl;
      setLoading(true);
      setError(null);
    }
  };



  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Document Viewer</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewInNewTab}
              className="flex items-center space-x-1"
            >
              <Eye className="w-4 h-4" />
              <span>View</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        {/* PDF Display */}
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 pdf-container" style={{ minHeight: '600px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading PDF...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Failed to load PDF</p>
                <p className="text-xs text-gray-500 mb-4">Try viewing in a new tab or downloading</p>
                <div className="flex space-x-2 justify-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleEmbeddedView}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Try Embedded View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleViewInNewTab}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full">
              <iframe
                src={pdfUrl}
                className="w-full h-full min-h-[600px]"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setError('Failed to load PDF');
                  setLoading(false);
                }}
                style={{ border: 'none' }}
              />
            </div>
          )}
        </div>

        {/* Selected Finding Info */}
        {selectedFinding && (
          <Card className="border-blue-500 border-2 mt-4">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Badge variant={selectedFinding.severity === 'HIGH' ? 'destructive' : selectedFinding.severity === 'MEDIUM' ? 'secondary' : 'default'}>
                    {selectedFinding.severity}
                  </Badge>
                  <Badge variant="outline">{selectedFinding.category}</Badge>
                </div>
                <span className="text-sm text-gray-500">
                  Page {selectedFinding.page_num} | {Math.round(selectedFinding.confidence_score * 100)}% confidence
                </span>
              </div>
              <h4 className="font-semibold text-sm mb-2">Selected Finding:</h4>
              <p className="text-sm text-gray-700 mb-2">{selectedFinding.summary}</p>
              {selectedFinding.recommendation && (
                <div>
                  <h5 className="font-medium text-sm mb-1">Recommendation:</h5>
                  <p className="text-sm text-gray-600">{selectedFinding.recommendation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}


      </CardContent>
    </Card>
  );
};

export default PDFViewer; 