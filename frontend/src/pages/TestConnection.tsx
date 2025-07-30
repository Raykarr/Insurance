import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import apiService from '../lib/api';

const TestConnection: React.FC = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<string>('Testing...');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setStatus('Testing backend connection...');
      const response = await apiService.healthCheck();
      setStatus('Connected! ✅');
      setIsConnected(true);
      toast({
        title: "Backend Connected",
        description: "Successfully connected to the backend API",
      });
    } catch (error) {
      setStatus('Connection failed! ❌');
      setIsConnected(false);
      toast({
        title: "Connection Failed",
        description: "Could not connect to the backend API",
        variant: "destructive",
      });
      console.error('Connection error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Backend Connection Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="font-semibold">Status: {status}</p>
              <p className="text-sm text-gray-600 mt-2">
                Backend URL: http://localhost:8000
              </p>
            </div>
            
            <Button onClick={testConnection} className="w-full">
              Test Connection Again
            </Button>
            
            {isConnected && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800">✅ Backend is running!</h3>
                <p className="text-sm text-green-700 mt-1">
                  The frontend can successfully communicate with the backend API.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestConnection; 