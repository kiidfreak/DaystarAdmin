import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Bluetooth, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Link, 
  Unlink,
  Signal,
  Wifi,
  XCircle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { CardLoading } from '@/components/ui/LoadingSpinner';
import { 
  useBeacons, 
  useBeaconAssignments, 
  useCreateBeacon, 
  useUpdateBeacon, 
  useDeleteBeacon, 
  useAssignBeacon, 
  useUnassignBeacon 
} from '@/hooks/use-api';
import type { Database } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

type Beacon = Database['public']['Tables']['ble_beacons']['Row'];
type Course = Database['public']['Tables']['courses']['Row'];

interface BeaconFormData {
  name: string;
  mac_address: string;
  uuid?: string;
  major?: number;
  minor?: number;
  location?: string;
  description?: string;
  is_active?: boolean;
}

interface BeaconAssignment {
  beacon_id: string;
  course_id: string;
  session_id?: string;
}

export const BeaconManager: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBeacon, setEditingBeacon] = useState<Beacon | null>(null);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [selectedBeacon, setSelectedBeacon] = useState<Beacon | null>(null);
  const [formData, setFormData] = useState<BeaconFormData>({
    name: '',
    mac_address: '',
    uuid: '',
    major: 1,
    minor: 1,
    location: '',
    description: '',
    is_active: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all beacons
  const { data: beacons, isLoading: beaconsLoading } = useBeacons();

  // Get all courses
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

  // Get beacon assignments
  const { data: assignments, isLoading: assignmentsLoading } = useBeaconAssignments();

  // Create beacon mutation
  const createBeacon = useCreateBeacon();

  // Update beacon mutation
  const updateBeacon = useUpdateBeacon();

  // Delete beacon mutation
  const deleteBeacon = useDeleteBeacon();

  // Assign beacon to course
  const assignBeacon = useAssignBeacon();

  // Unassign beacon from course
  const unassignBeacon = useUnassignBeacon();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBeacon) {
      updateBeacon.mutate({ id: editingBeacon.id, updates: formData });
      setEditingBeacon(null);
      setFormData({
        name: '',
        mac_address: '',
        uuid: '',
        major: 1,
        minor: 1,
        location: '',
        description: '',
        is_active: true
      });
    } else {
      // Auto-generate UUID if not present
      const beaconData = {
        ...formData,
        uuid: formData.uuid || uuidv4(),
      };
      createBeacon.mutate(beaconData);
      setShowCreateForm(false);
      setFormData({
        name: '',
        mac_address: '',
        uuid: '',
        major: 1,
        minor: 1,
        location: '',
        description: '',
        is_active: true
      });
    }
  };

  const handleEdit = (beacon: Beacon) => {
    setEditingBeacon(beacon);
    setFormData({
      name: beacon.name || '',
      mac_address: beacon.mac_address,
      uuid: beacon.uuid || '',
      major: beacon.major || 1,
      minor: beacon.minor || 1,
      location: beacon.location || '',
      description: beacon.description || '',
      is_active: beacon.is_active || true
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this beacon? This will also remove all its course assignments and session references.')) {
      deleteBeacon.mutate(id);
    }
  };

  const handleAssign = (beacon: Beacon) => {
    setSelectedBeacon(beacon);
    setShowAssignmentForm(true);
  };

  const handleAssignmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const courseId = formData.get('course_id') as string;
    
    if (selectedBeacon && courseId) {
      assignBeacon.mutate({
        beacon_id: selectedBeacon.id,
        course_id: courseId
      });
      setShowAssignmentForm(false);
      setSelectedBeacon(null);
    }
  };

  const getBeaconStatus = (beacon: Beacon) => {
    if (!beacon.is_active) return 'inactive';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: <Badge className="bg-green-500/20 text-green-400 border-green-500/30">🟢 Active</Badge>,
      inactive: <Badge className="bg-red-500/20 text-red-400 border-red-500/30">🔴 Inactive</Badge>
    };
    return badges[status as keyof typeof badges] || badges.inactive;
  };

  if (beaconsLoading || coursesLoading || assignmentsLoading) {
    return <CardLoading text="Loading beacons..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">BLE Beacon Manager</h2>
          <p className="text-gray-400">Manage BLE beacons and their course assignments</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="glass-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Beacon
        </Button>
      </div>

      {/* Create/Edit Beacon Form */}
      {(showCreateForm || editingBeacon) && (
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {editingBeacon ? 'Edit Beacon' : 'Add New Beacon'}
            </h3>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateForm(false);
                setEditingBeacon(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Beacon Name</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Room 101 Beacon"
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">MAC Address</label>
                <Input
                  type="text"
                  value={formData.mac_address}
                  onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>

              {formData.uuid && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">UUID</label>
                  <Input
                    type="text"
                    value={formData.uuid}
                    readOnly
                    className="bg-white/10 border-white/10 text-white cursor-not-allowed"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Major</label>
                <Input
                  type="number"
                  value={formData.major}
                  onChange={(e) => setFormData({ ...formData, major: parseInt(e.target.value) })}
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Minor</label>
                <Input
                  type="number"
                  value={formData.minor}
                  onChange={(e) => setFormData({ ...formData, minor: parseInt(e.target.value) })}
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                <Input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Room 101, Building A"
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <Input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-white/10 bg-white/5"
              />
              <label htmlFor="is_active" className="text-sm text-gray-300">
                Active Beacon
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingBeacon(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBeacon.isPending || updateBeacon.isPending}
                className="glass-button"
              >
                {createBeacon.isPending || updateBeacon.isPending ? 'Saving...' : (editingBeacon ? 'Update Beacon' : 'Create Beacon')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Beacon Assignment Form */}
      {showAssignmentForm && selectedBeacon && (
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Assign Beacon: {selectedBeacon.name}
            </h3>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAssignmentForm(false);
                setSelectedBeacon(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleAssignmentSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Course</label>
              <select
                name="course_id"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-blue/50"
                required
              >
                <option value="">Select a course</option>
                {courses?.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowAssignmentForm(false);
                  setSelectedBeacon(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignBeacon.isPending}
                className="glass-button"
              >
                {assignBeacon.isPending ? 'Assigning...' : 'Assign Beacon'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Beacons List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Beacons</h3>
        
        {beacons?.length === 0 ? (
          <Card className="glass-card p-8 text-center">
            <Bluetooth className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No beacons configured yet</p>
            <p className="text-sm text-gray-500">Add your first BLE beacon to get started</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {beacons?.map((beacon) => {
              const status = getBeaconStatus(beacon);
              const beaconAssignments = assignments?.filter(a => a.beacon_id === beacon.id) || [];
              
              return (
                <Card key={beacon.id} className="glass-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-white">
                          {beacon.name}
                        </h4>
                        {getStatusBadge(status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Bluetooth className="w-4 h-4 text-sky-blue" />
                          <span>{beacon.mac_address}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Signal className="w-4 h-4 text-sky-blue" />
                          <span>Major: {beacon.major}, Minor: {beacon.minor}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-sky-blue" />
                          <span>{beacon.location}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Link className="w-4 h-4 text-sky-blue" />
                          <span>{beaconAssignments.length} course(s) assigned</span>
                        </div>
                      </div>

                      {beaconAssignments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-sm text-gray-400 mb-2">Assigned Courses:</p>
                          <div className="flex flex-wrap gap-2">
                            {beaconAssignments.map((assignment) => (
                              <Badge key={assignment.id} className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                {assignment.courses?.name || 'Unknown Course'}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => unassignBeacon.mutate(assignment.id)}
                                  className="ml-2 p-0 h-auto text-blue-400 hover:text-blue-300"
                                >
                                  <Unlink className="w-3 h-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleAssign(beacon)}
                        className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                      >
                        <Link className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleEdit(beacon)}
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDelete(beacon.id)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}; 