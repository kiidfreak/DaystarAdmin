import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Monitor, Clock, RotateCcw, Database as DatabaseIcon, QrCode, History, QrCode as QrCodeIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qrCodeApi } from '@/lib/api';
import { CardLoading } from '@/components/ui/LoadingSpinner';
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
    return <CardLoading text="Loading courses..." />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="glass-card p-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-2">Database-Backed QR Code Generator</h2>
          <p className="text-gray-400">Generate QR codes linked to courses for student check-in</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Select Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3 focus:outline-none focus:border-purple-400"
            >
              <option value="">Select a course</option>
              {courses?.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Session Duration (minutes)
            </label>
            <Input
              type="number"
              value={sessionDuration}
              onChange={(e) => setSessionDuration(Number(e.target.value))}
              className="bg-white/5 border-white/10 text-white rounded-2xl"
              min="5"
              max="180"
            />
          </div>
        </div>

        <Button
          onClick={() => createQRCode.mutate()}
          disabled={createQRCode.isPending || !selectedCourse || !!activeQRCode}
          className="w-full glass-button h-12 mb-4"
        >
          <DatabaseIcon className="w-5 h-5 mr-2" />
          {createQRCode.isPending ? 'Generating...' : activeQRCode ? 'QR Code Active' : 'Generate QR Code'}
        </Button>

        {activeQRCode && (
          <div className="text-center">
            <Badge className="status-online border rounded-xl mb-2">
              <Clock className="w-4 h-4 mr-1" />
              {formatTime(timeLeft)} remaining
            </Badge>
            <p className="text-sm text-gray-400">Course: {activeQRCode.course_name}</p>
            <p className="text-sm text-gray-400">QR ID: {activeQRCode.id}</p>
          </div>
        )}
      </Card>

      <Card className="glass-card p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-4">QR Code Display</h3>
          
          {activeQRCode ? (
            <div className="bg-white p-8 rounded-3xl mb-4">
              <div className="w-48 h-48 mx-auto bg-black rounded-2xl flex items-center justify-center">
                <div className="text-white text-center">
                  {/* Render the real QR code here */}
                  <QRCodeCanvas value={activeQRCode.id} size={160} bgColor="#000000" fgColor="#ffffff" includeMargin={false} />
                  <p className="text-xs break-all mt-2">{activeQRCode.id}</p>
                  <p className="text-xs mt-2">{activeQRCode.course_name}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-48 h-48 mx-auto bg-white/5 border-2 border-dashed border-white/20 rounded-3xl flex items-center justify-center mb-4">
              <div className="text-center text-gray-400">
                <DatabaseIcon className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">Select Course & Generate</p>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-400">
            Students can scan this QR code for course-specific check-in
          </p>
        </div>
      </Card>

      {/* QR Code History */}
      <Card className="glass-card p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">QR Code History</h3>
          <History className="w-5 h-5 text-gray-400" />
        </div>
        
        {historyLoading ? (
          <div className="text-center py-8 text-gray-400">Loading history...</div>
        ) : qrHistory && qrHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-gray-400 font-medium text-sm">Course</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium text-sm">Created</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium text-sm">Expires</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium text-sm">Status</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium text-sm">QR ID</th>
                </tr>
              </thead>
              <tbody>
                {qrHistory.map((qr) => {
                  const isExpired = Date.now() > qr.expires_at;
                  return (
                    <tr key={qr.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-3 text-white text-sm">{qr.course_name}</td>
                      <td className="py-3 px-3 text-gray-300 text-sm">{formatDate(qr.created_timestamp)}</td>
                      <td className="py-3 px-3 text-gray-300 text-sm">{formatDate(qr.expires_at)}</td>
                      <td className="py-3 px-3">
                        <Badge className={isExpired ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"}>
                          {isExpired ? 'Expired' : 'Active'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-gray-300 text-sm font-mono">{qr.id.slice(0, 8)}...</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">No QR code history available</div>
        )}
      </Card>
    </div>
  );
};
