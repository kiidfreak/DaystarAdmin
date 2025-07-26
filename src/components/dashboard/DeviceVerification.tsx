import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Smartphone, Check, X, AlertTriangle, User, Mail, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useRealtimeAttendance } from '@/hooks/use-realtime-attendance';
import { PageLoading } from '@/components/ui/LoadingSpinner';

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
}

export const DeviceVerification: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [requests, setRequests] = useState<DeviceVerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DeviceVerificationRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isConnected } = useRealtimeAttendance();

  // Mock data - in real implementation, this would come from Supabase
  const mockRequests: DeviceVerificationRequest[] = [
    {
      id: '1',
      student_id: 'STU001',
      student_name: 'John Doe',
      student_email: 'john.doe@university.edu',
      old_device_id: 'device_old_123',
      new_device_id: 'device_new_456',
      request_date: '2024-01-15T10:30:00Z',
      status: 'pending',
      reason: 'Phone was damaged and replaced'
    },
    {
      id: '2',
      student_id: 'STU002',
      student_name: 'Jane Smith',
      student_email: 'jane.smith@university.edu',
      old_device_id: 'device_old_789',
      new_device_id: 'device_new_012',
      request_date: '2024-01-14T14:20:00Z',
      status: 'approved',
      reason: 'Upgraded to new phone'
    },
    {
      id: '3',
      student_id: 'STU003',
      student_name: 'Mike Johnson',
      student_email: 'mike.johnson@university.edu',
      old_device_id: 'device_old_345',
      new_device_id: 'device_new_678',
      request_date: '2024-01-13T09:15:00Z',
      status: 'rejected',
      reason: 'Suspicious activity detected'
    }
  ];

  React.useEffect(() => {
    setRequests(mockRequests);
  }, []);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      request.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.student_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (requestId: string) => {
    try {
      // In real implementation, this would update the database
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'approved' as const } : req
      ));
      
      toast({
        title: "Device Approved",
        description: "Student's new device has been approved successfully",
      });
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: "Failed to approve device change",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      // In real implementation, this would update the database
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'rejected' as const, reason } : req
      ));
      
      toast({
        title: "Device Rejected",
        description: "Device change request has been rejected",
      });
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: "Failed to reject device change",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <PageLoading text="Loading device verification requests..." />
      ) : (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Smartphone className="w-5 h-5 text-blue-400" />
              Device Verification
              {isConnected && (
                <div className="flex items-center space-x-2 ml-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">Live</span>
                </div>
              )}
            </CardTitle>
            <p className="text-gray-400">
              Manage student device change requests and verify new device IDs
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, ID, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Status</label>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="all" className="text-white hover:bg-gray-700">All Status</SelectItem>
                    <SelectItem value="pending" className="text-white hover:bg-gray-700">Pending</SelectItem>
                    <SelectItem value="approved" className="text-white hover:bg-gray-700">Approved</SelectItem>
                    <SelectItem value="rejected" className="text-white hover:bg-gray-700">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Actions</label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-300">Total Requests</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{requests.length}</p>
                </CardContent>
              </Card>

              <Card className="bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-300">Pending</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {requests.filter(r => r.status === 'pending').length}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-green-500/10 border-green-500/20 hover:bg-green-500/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Approved</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {requests.filter(r => r.status === 'approved').length}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-gray-300">Rejected</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {requests.filter(r => r.status === 'rejected').length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Requests Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Device Change Requests</h3>
                <Badge variant="outline" className="text-sm">
                  {filteredRequests.length} requests
                </Badge>
              </div>
              
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-800/50">
                      <TableHead className="text-gray-300">Student</TableHead>
                      <TableHead className="text-gray-300">Old Device</TableHead>
                      <TableHead className="text-gray-300">New Device</TableHead>
                      <TableHead className="text-gray-300">Request Date</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id} className="hover:bg-blue-50 transition-colors">
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">{request.student_name}</p>
                            <p className="text-sm text-gray-400">{request.student_email}</p>
                            <p className="text-xs text-gray-500">ID: {request.student_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-700 px-2 py-1 rounded text-white border border-gray-600">
                            {request.old_device_id}
                          </code>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-700 px-2 py-1 rounded text-white border border-gray-600">
                            {request.new_device_id}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="text-white">
                              {new Date(request.request_date).toLocaleDateString()}
                            </p>
                            <p className="text-gray-400">
                              {new Date(request.request_date).toLocaleTimeString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog open={isDialogOpen && selectedRequest?.id === request.id} onOpenChange={setIsDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedRequest(request)}
                                  className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                                >
                                  <User className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-gray-900 border-gray-700">
                                <DialogHeader>
                                  <DialogTitle className="text-white">Device Change Details</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-semibold text-white mb-2">Student Information</h4>
                                    <div className="space-y-2 text-sm">
                                      <p><span className="text-gray-400">Name:</span> <span className="text-white">{request.student_name}</span></p>
                                      <p><span className="text-gray-400">Email:</span> <span className="text-white">{request.student_email}</span></p>
                                      <p><span className="text-gray-400">ID:</span> <span className="text-white">{request.student_id}</span></p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-white mb-2">Device Information</h4>
                                    <div className="space-y-2 text-sm">
                                      <p><span className="text-gray-400">Old Device:</span> <code className="bg-gray-800 px-1 rounded text-white">{request.old_device_id}</code></p>
                                      <p><span className="text-gray-400">New Device:</span> <code className="bg-gray-800 px-1 rounded text-white">{request.new_device_id}</code></p>
                                      <p><span className="text-gray-400">Reason:</span> <span className="text-white">{request.reason || 'No reason provided'}</span></p>
                                    </div>
                                  </div>
                                  {request.status === 'pending' && (
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => {
                                          handleApprove(request.id);
                                          setIsDialogOpen(false);
                                        }}
                                        className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
                                      >
                                        <Check className="w-4 h-4 mr-2" />
                                        Approve
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          handleReject(request.id, 'Rejected by admin');
                                          setIsDialogOpen(false);
                                        }}
                                        className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
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
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(request.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleReject(request.id, 'Rejected by admin')}
                                  className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 