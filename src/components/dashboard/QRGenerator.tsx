import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Clock, RotateCcw, Database as DatabaseIcon, QrCode, History, QrCode as QrCodeIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qrCodeApi } from '@/lib/api';
import { CardLoading, PageLoading } from '@/components/ui/LoadingSpinner';
import type { Database } from '@/lib/supabase';
import { QRCodeCanvas } from 'qrcode.react';

type Course = Database['public']['Tables']['courses']['Row'];
type QRCodePrompt = Database['public']['Tables']['check_in_prompts']['Row'] & {
  courses?: {
    id: string;
    name: string;
    code: string;
  } | null;
};

export const QRGenerator: React.FC = () => {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [sessionDuration, setSessionDuration] = useState<number>(15);
  const [activeQRCode, setActiveQRCode] = useState<QRCodePrompt | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all courses for selection
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Get active QR code for selected course
  const { data: activeQR, isLoading: activeQRLoading } = useQuery({
    queryKey: ['active-qr', selectedCourse],
    queryFn: () => qrCodeApi.getActiveQRCode(selectedCourse),
    enabled: !!selectedCourse,
  });

  // Get QR code history
  const { data: qrHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['qr-history', selectedCourse],
    queryFn: () => qrCodeApi.getQRCodeHistory(selectedCourse),
  });

  // Create QR code mutation
  const createQRCode = useMutation({
    mutationFn: async () => {
      if (!selectedCourse) throw new Error('Please select a course');
      
      const course = courses?.find(c => c.id === selectedCourse);
      if (!course) throw new Error('Course not found');
      
      return qrCodeApi.createQRCode(course.id, course.name, sessionDuration);
    },
    onSuccess: (data) => {
      setActiveQRCode(data);
      queryClient.invalidateQueries({ queryKey: ['active-qr', selectedCourse] });
      queryClient.invalidateQueries({ queryKey: ['qr-history', selectedCourse] });
      toast({
        title: "QR Code Generated",
        description: `Valid for ${sessionDuration} minutes`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Generate QR Code",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Update active QR code when data changes
  useEffect(() => {
    if (activeQR) {
      setActiveQRCode(activeQR);
      const now = Date.now();
      const expiresAt = activeQR.expires_at;
      const remaining = Math.max(0, expiresAt - now);
      setTimeLeft(Math.floor(remaining / 1000));
    } else {
      setActiveQRCode(null);
      setTimeLeft(0);
    }
  }, [activeQR]);

  // Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeQRCode && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setActiveQRCode(null);
            queryClient.invalidateQueries({ queryKey: ['active-qr', selectedCourse] });
      toast({
        title: "QR Code Expired",
        description: "Generate a new QR code for continued access",
        variant: "destructive",
      });
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeQRCode, timeLeft, selectedCourse, queryClient, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (coursesLoading) {
    return <PageLoading text="Loading QR Generator..." />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="professional-card p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Database-Backed QR Code Generator</h2>
          <p className="text-gray-600 text-lg">Generate QR codes linked to courses for student check-in</p>
        </div>

        <div className="space-y-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Course
            </label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full h-12 text-base">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses?.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Session Duration (minutes)
            </label>
            <Input
              type="number"
              value={sessionDuration}
              onChange={(e) => setSessionDuration(Number(e.target.value))}
              className="h-12 text-base"
              min="5"
              max="180"
              placeholder="Enter duration in minutes"
            />
          </div>
        </div>

        <Button
          onClick={() => createQRCode.mutate()}
          disabled={createQRCode.isPending || !selectedCourse || !!activeQRCode}
          className="w-full h-12 text-base font-semibold mb-4"
        >
          <DatabaseIcon className="w-5 h-5 mr-2" />
          {createQRCode.isPending ? 'Generating...' : activeQRCode ? 'QR Code Active' : 'Generate QR Code'}
        </Button>

        {activeQRCode && (
          <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
            <Badge className="bg-green-100 text-green-800 border-green-300 rounded-lg px-3 py-1 mb-2">
              <Clock className="w-4 h-4 mr-1" />
              {formatTime(timeLeft)} remaining
            </Badge>
            <p className="text-sm text-gray-700 font-medium">Course: {activeQRCode.course_name}</p>
          </div>
        )}
      </Card>

      <Card className="professional-card p-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">QR Code Display</h3>
          
          {activeQRCode ? (
            <div className="bg-white p-8 rounded-3xl mb-4 border-2 border-gray-200 shadow-lg">
              {/* QR Code Container - Full space for scanning */}
              <div className="w-48 h-48 mx-auto bg-white rounded-2xl flex items-center justify-center mb-4">
                <QRCodeCanvas 
                  value={activeQRCode.id} 
                  size={180} 
                  bgColor="#ffffff" 
                  fgColor="#000000" 
                  includeMargin={false} 
                />
              </div>
              
              {/* Text information below the QR code */}
              <div className="text-center">
                <p className="text-sm text-gray-700 font-medium">{activeQRCode.course_name}</p>
              </div>
            </div>
          ) : (
            <div className="w-48 h-48 mx-auto bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl flex items-center justify-center mb-4">
              <div className="text-center text-gray-500">
                <DatabaseIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium">Select Course & Generate</p>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-600">
            Students can scan this QR code for course-specific check-in
          </p>
        </div>
      </Card>

      {/* QR Code History */}
      <Card className="professional-card p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">QR Code History</h3>
          <History className="w-5 h-5 text-gray-500" />
        </div>
        
        {historyLoading ? (
          <div className="text-center py-8 text-gray-500">Loading history...</div>
        ) : qrHistory && qrHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th className="text-left py-4 px-6 text-gray-700 font-semibold">Course</th>
                  <th className="text-left py-4 px-6 text-gray-700 font-semibold">Created</th>
                  <th className="text-left py-4 px-6 text-gray-700 font-semibold">Expires</th>
                  <th className="text-left py-4 px-6 text-gray-700 font-semibold">Status</th>
                  <th className="text-left py-4 px-6 text-gray-700 font-semibold">QR ID</th>
                </tr>
              </thead>
              <tbody>
                {qrHistory.map((qr) => {
                  const isExpired = Date.now() > qr.expires_at;
                  return (
                    <tr key={qr.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="py-4 px-6 text-gray-900 font-medium">{qr.course_name}</td>
                      <td className="py-4 px-6 text-gray-600">{formatDate(qr.created_timestamp)}</td>
                      <td className="py-4 px-6 text-gray-600">{formatDate(qr.expires_at)}</td>
                      <td className="py-4 px-6">
                        <Badge className={isExpired ? "bg-red-100 text-red-700 border-red-200" : "bg-green-100 text-green-700 border-green-200"}>
                          {isExpired ? 'Expired' : 'Active'}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-gray-600 font-mono text-sm">{qr.id.slice(0, 8)}...</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No QR code history available</div>
        )}
      </Card>
    </div>
  );
};
