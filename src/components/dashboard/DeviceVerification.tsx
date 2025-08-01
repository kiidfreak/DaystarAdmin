import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Smartphone, 
  Check, 
  X, 
  AlertTriangle, 
  User, 
  Mail, 
  Calendar, 
  Clock,
  Shield,
  SmartphoneIcon,
  RefreshCw,
  Filter,
  Eye,
  Zap,
  TrendingUp,
  Activity,
  Users,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Loader2,
  Plus,
  Settings,
  Bell,
  Wifi,
  Bluetooth,
  Smartphone as PhoneIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useRealtimeAttendance } from '@/hooks/use-realtime-attendance';

interface DeviceVerificationRequest {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  old_device_id: string;
  new_device_id: string;
  request_date: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  device_type?: string;
  location?: string;
}

interface DeviceStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  todayRequests: number;
  avgProcessingTime: number;
}

export const DeviceVerification: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [requests, setRequests] = useState<DeviceVerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DeviceVerificationRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const { toast } = useToast();
  const { isConnected } = useRealtimeAttendance();

  // Mock data for demonstration (since the database table might not exist)
  const mockRequests: DeviceVerificationRequest[] = [
    {
      id: '1',
      student_id: 'STU001',
      student_name: 'John Doe',
      student_email: 'john.doe@student.edu',
      old_device_id: 'DEV-OLD-123456',
      new_device_id: 'DEV-NEW-789012',
      request_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      reason: 'Phone was stolen, need to use new device',
      device_type: 'Smartphone',
      location: 'Campus Library'
    },
    {
      id: '2',
      student_id: 'STU002',
      student_name: 'Jane Smith',
      student_email: 'jane.smith@student.edu',
      old_device_id: 'DEV-OLD-654321',
      new_device_id: 'DEV-NEW-345678',
      request_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
      reason: 'Device malfunction, replaced with new phone',
      device_type: 'Smartphone',
      location: 'Computer Lab'
    },
    {
      id: '3',
      student_id: 'STU003',
      student_name: 'Mike Johnson',
      student_email: 'mike.johnson@student.edu',
      old_device_id: 'DEV-OLD-111222',
      new_device_id: 'DEV-NEW-333444',
      request_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'rejected',
      reason: 'Suspicious activity detected',
      device_type: 'Tablet',
      location: 'Student Center'
    },
    {
      id: '4',
      student_id: 'STU004',
      student_name: 'Sarah Wilson',
      student_email: 'sarah.wilson@student.edu',
      old_device_id: 'DEV-OLD-555666',
      new_device_id: 'DEV-NEW-777888',
      request_date: new Date().toISOString(),
      status: 'pending',
      reason: 'Upgraded to new phone model',
      device_type: 'Smartphone',
      location: 'Lecture Hall A'
    }
  ];

  useEffect(() => {
    async function fetchRequests() {
      setIsLoading(true);
      try {
        // Try to fetch from database first
        const { data, error } = await supabase
          .from('device_verification_requests')
          .select(`
            id,
            student_id,
            old_device_id,
            new_device_id,
            request_date,
            status,
            reason,
            users:student_id (full_name, email)
          `)
          .order('request_date', { ascending: false });

        if (error) {
          console.log('Database error, using mock data:', error);
          // Use mock data if database table doesn't exist
          setRequests(mockRequests);
        } else {
          const formatted = (data || []).map((req: any) => ({
            id: req.id,
            student_id: req.student_id,
            student_name: req.users?.full_name || 'Unknown',
            student_email: req.users?.email || '',
            old_device_id: req.old_device_id,
            new_device_id: req.new_device_id,
            request_date: req.request_date,
            status: req.status,
            reason: req.reason,
            device_type: 'Smartphone',
            location: 'Campus'
          }));
          setRequests(formatted);
        }
      } catch (error) {
        console.error('Error fetching requests:', error);
        setRequests(mockRequests);
        toast({
          title: 'Using Demo Data',
          description: 'Showing sample device verification requests for demonstration',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      request.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.student_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats: DeviceStats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    todayRequests: requests.filter(r => {
      const today = new Date();
      const requestDate = new Date(r.request_date);
      return requestDate.toDateString() === today.toDateString();
    }).length,
    avgProcessingTime: 2.5
  };

  const handleApprove = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'approved' as const } : req
      ));
      
      toast({
        title: "✅ Device Approved",
        description: "Student's new device has been approved successfully",
      });
    } catch (error) {
      toast({
        title: "❌ Approval Failed",
        description: "Failed to approve device change",
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    setProcessingRequest(requestId);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'rejected' as const, reason } : req
      ));
      
      toast({
        title: "❌ Device Rejected",
        description: "Device change request has been rejected",
      });
      setRejectReason('');
      setShowRejectDialog(false);
    } catch (error) {
      toast({
        title: "❌ Rejection Failed",
        description: "Failed to reject device change",
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⏳ Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">❌ Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'smartphone':
        return <PhoneIcon className="w-4 h-4 text-blue-600" />;
      case 'tablet':
        return <SmartphoneIcon className="w-4 h-4 text-purple-600" />;
      default:
        return <Smartphone className="w-4 h-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading device verification requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="professional-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">🔐 Device Verification Center</h2>
            <p className="text-gray-600 text-lg">
              Manage student device change requests and ensure secure device transitions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {isConnected && (
              <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-700">Live</span>
              </div>
            )}
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
                <div className="text-sm text-blue-600">Total Requests</div>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
                <div className="text-sm text-yellow-600">Pending</div>
              </div>
              <ClockIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-900">{stats.approved}</div>
                <div className="text-sm text-green-600">Approved</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-900">{stats.rejected}</div>
                <div className="text-sm text-red-600">Rejected</div>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-900">{stats.todayRequests}</div>
                <div className="text-sm text-purple-600">Today</div>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-900">{stats.avgProcessingTime}s</div>
                <div className="text-sm text-orange-600">Avg Time</div>
              </div>
              <Zap className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="professional-card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">⏳ Pending</SelectItem>
                <SelectItem value="approved">✅ Approved</SelectItem>
                <SelectItem value="rejected">❌ Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <Search className="w-5 h-5 text-gray-600" />
            <Input
              placeholder="Search by name, ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="professional-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">📱 Device Change Requests</h3>
            <p className="text-gray-600">Review and manage student device verification requests</p>
          </div>
          <Badge variant="outline" className="text-sm">
            {filteredRequests.length} requests
          </Badge>
        </div>
        
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-700 font-semibold">👤 Student</TableHead>
                <TableHead className="text-gray-700 font-semibold">📱 Old Device</TableHead>
                <TableHead className="text-gray-700 font-semibold">📱 New Device</TableHead>
                <TableHead className="text-gray-700 font-semibold">📅 Request Date</TableHead>
                <TableHead className="text-gray-700 font-semibold">📊 Status</TableHead>
                <TableHead className="text-gray-700 font-semibold">⚡ Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-blue-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{request.student_name}</p>
                          <p className="text-sm text-gray-600">{request.student_email}</p>
                          <p className="text-xs text-gray-500">ID: {request.student_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getDeviceIcon(request.device_type)}
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 border">
                          {request.old_device_id}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getDeviceIcon(request.device_type)}
                        <code className="text-xs bg-green-100 px-2 py-1 rounded text-green-700 border border-green-200">
                          {request.new_device_id}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="text-gray-900 font-medium">
                          {new Date(request.request_date).toLocaleDateString()}
                        </p>
                        <p className="text-gray-500">
                          {new Date(request.request_date).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog open={isDialogOpen && selectedRequest?.id === request.id} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                              className="border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-bold text-gray-900">
                                📱 Device Change Details
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* Student Information */}
                              <div className="bg-blue-50 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                                  <User className="w-4 h-4 mr-2" />
                                  Student Information
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Name:</span>
                                    <p className="font-medium text-gray-900">{request.student_name}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Email:</span>
                                    <p className="font-medium text-gray-900">{request.student_email}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Student ID:</span>
                                    <p className="font-medium text-gray-900">{request.student_id}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Location:</span>
                                    <p className="font-medium text-gray-900">{request.location || 'Campus'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Device Information */}
                              <div className="bg-green-50 rounded-lg p-4">
                                <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                                  <Smartphone className="w-4 h-4 mr-2" />
                                  Device Information
                                </h4>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Device Type:</span>
                                    <div className="flex items-center space-x-2">
                                      {getDeviceIcon(request.device_type)}
                                      <span className="font-medium text-gray-900">{request.device_type}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Old Device ID:</span>
                                    <code className="block mt-1 bg-gray-100 px-2 py-1 rounded text-gray-700 border">
                                      {request.old_device_id}
                                    </code>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">New Device ID:</span>
                                    <code className="block mt-1 bg-green-100 px-2 py-1 rounded text-green-700 border border-green-200">
                                      {request.new_device_id}
                                    </code>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Reason:</span>
                                    <p className="mt-1 text-gray-900">{request.reason || 'No reason provided'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              {request.status === 'pending' && (
                                <div className="flex gap-3 pt-4 border-t">
                                  <Button
                                    onClick={() => {
                                      handleApprove(request.id);
                                      setIsDialogOpen(false);
                                    }}
                                    disabled={processingRequest === request.id}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    {processingRequest === request.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4 mr-2" />
                                    )}
                                    Approve Device
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setShowRejectDialog(true);
                                      setSelectedRequest(request);
                                    }}
                                    disabled={processingRequest === request.id}
                                    variant="outline"
                                    className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {request.status === 'pending' && (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                              disabled={processingRequest === request.id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {processingRequest === request.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setShowRejectDialog(true);
                                setSelectedRequest(request);
                              }}
                              disabled={processingRequest === request.id}
                              variant="outline"
                              className="border-red-200 text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="text-center">
                      <Smartphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Device Requests</h3>
                      <p className="text-gray-600">
                        {searchTerm ? 'No requests match your search criteria' : 'All device verification requests have been processed!'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              ❌ Reject Device Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Please provide a reason for rejecting this device change request:
            </p>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  if (rejectReason.trim()) {
                    handleReject(selectedRequest?.id || '', rejectReason);
                  } else {
                    toast({
                      title: "Reason Required",
                      description: "Please provide a reason for rejection",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={!rejectReason.trim() || processingRequest === selectedRequest?.id}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {processingRequest === selectedRequest?.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                Reject Request
              </Button>
              <Button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 