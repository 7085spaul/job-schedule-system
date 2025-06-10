import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Pause, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Job {
  id: string;
  name: string;
  type: 'hourly' | 'daily' | 'weekly';
  minute?: number;
  hour?: number;
  day_of_week?: number;
  is_active: boolean;
  next_run?: string;
  last_run?: string;
}

const JobScheduler: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [executions, setExecutions] = useState<string[]>([]);
  const [newJob, setNewJob] = useState<Partial<Job>>({ type: 'hourly' });
  const [loading, setLoading] = useState(false);

  // Simple ID generator
  const generateId = () => Math.random().toString(36).substring(2, 11);

  const fetchJobs = () => {
    // In a real application, you might load initial jobs from localStorage or a simple API here
    // For this example, we'll just use the initial empty array.
  };

  const calculateNextRun = (job: Partial<Job>): Date => {
    const now = new Date();
    const next = new Date(now);
    
    if (job.type === 'hourly') {
      next.setMinutes(job.minute || 0, 0, 0);
      if (next <= now) next.setHours(next.getHours() + 1);
    } else if (job.type === 'daily') {
      next.setHours(job.hour || 0, job.minute || 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
    } else if (job.type === 'weekly') {
      const dayDiff = (job.day_of_week || 0) - next.getDay();
      next.setDate(next.getDate() + (dayDiff >= 0 ? dayDiff : dayDiff + 7));
      next.setHours(job.hour || 0, job.minute || 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 7);
    }
    return next;
  };

  const createJob = () => {
    if (!newJob.name) {
      toast({ title: 'Error', description: 'Job name is required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const nextRun = calculateNextRun(newJob);
    
    const jobToAdd: Job = {
      id: generateId(),
      name: newJob.name,
      type: newJob.type || 'hourly',
      minute: newJob.minute,
      hour: newJob.hour,
      day_of_week: newJob.day_of_week,
      is_active: true,
      next_run: nextRun.toISOString(),
      last_run: undefined,
    };
    
    setJobs(prev => [jobToAdd, ...prev]);
    setNewJob({ type: 'hourly' });
    toast({ title: 'Success', description: 'Job created successfully' });
    setLoading(false);
  };

  const executeJob = async (job: Job) => {
    try {
      // Simulate job execution
      console.log(`Job "${job.name}" executed: Hello World!`);
      setExecutions(prev => [
        `[${new Date().toLocaleTimeString()}] Job "${job.name}" executed: Hello World!`,
        ...prev.slice(0, 9)
      ]);
      
      // Update job with next run time and last run time locally
      const nextRun = calculateNextRun(job);
      setJobs(prevJobs =>
        prevJobs.map(j =>
          j.id === job.id
            ? { ...j, last_run: new Date().toISOString(), next_run: nextRun.toISOString() }
            : j
        )
      );
      
    } catch (error) {
      console.error('Job execution failed:', error);
    }
  };

  const toggleJobStatus = (jobId: string, isActive: boolean) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === jobId ? { ...job, is_active: !isActive } : job
      )
    );
  };

  const deleteJob = (jobId: string) => {
    setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
  };

  useEffect(() => {
    fetchJobs(); // This will no longer fetch from Supabase, just initialize local state if needed
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      jobs.forEach(job => {
        if (job.is_active && job.next_run && new Date(job.next_run) <= now) {
          executeJob(job);
        }
      });
    }, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [jobs]);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Clock className="h-5 w-5" />Job Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Job Name</Label>
              <Input 
                placeholder="Enter job name" 
                value={newJob.name || ''} 
                onChange={(e) => setNewJob(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Schedule Type</Label>
              <Select 
                value={newJob.type} 
                onValueChange={(value: 'hourly' | 'daily' | 'weekly') => 
                  setNewJob(prev => ({ ...prev, type: value, minute: undefined, hour: undefined, day_of_week: undefined }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newJob.type === 'hourly' && (
              <div>
                <Label>Minute (0-59)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="59" 
                  placeholder="0" 
                  value={newJob.minute || ''} 
                  onChange={(e) => setNewJob(prev => ({ ...prev, minute: parseInt(e.target.value) || 0 }))}
                />
              </div>
            )}
            
            {(newJob.type === 'daily' || newJob.type === 'weekly') && (
              <>
                <div>
                  <Label>Hour (0-23)</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="23" 
                    placeholder="0" 
                    value={newJob.hour || ''} 
                    onChange={(e) => setNewJob(prev => ({ ...prev, hour: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </>
            )}
            
            {newJob.type === 'weekly' && (
              <div>
                <Label>Day of Week (0-6, Sun-Sat)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="6" 
                  placeholder="0" 
                  value={newJob.day_of_week || ''} 
                  onChange={(e) => setNewJob(prev => ({ ...prev, day_of_week: parseInt(e.target.value) || 0 }))}
                />
              </div>
            )}
            
            <div className="flex items-end">
              <Button onClick={createJob} disabled={loading}>
                {loading ? 'Creating...' : 'Create Job'}
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-700">Scheduled Jobs</h3>
            {jobs.length === 0 ? (
              <p className="text-gray-600">No jobs scheduled yet.</p>
            ) : (
              jobs.map(job => (
                <Card key={job.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-grow">
                      <h4 className="font-bold text-gray-800 text-lg">{job.name}</h4>
                      <p className="text-sm text-gray-600">Type: {job.type}</p>
                      {job.next_run && (
                        <p className="text-sm text-gray-600">Next Run: {new Date(job.next_run).toLocaleString()}</p>
                      )}
                      {job.last_run && (
                        <p className="text-sm text-gray-600">Last Run: {new Date(job.last_run).toLocaleString()}</p>
                      )}
                      <Badge variant={job.is_active ? 'default' : 'secondary'} className="mt-2">
                        {job.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => toggleJobStatus(job.id, job.is_active)}
                        className="text-green-600 hover:text-green-800"
                      >
                        {job.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => deleteJob(job.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-blue-700">Execution Log</h3>
            {executions.length === 0 ? (
              <p className="text-gray-600">No executions yet.</p>
            ) : (
              <ul className="list-disc list-inside bg-gray-50 p-4 rounded-md border border-gray-200 h-40 overflow-y-auto">
                {executions.map((log, index) => (
                  <li key={index} className="text-sm text-gray-700">{log}</li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobScheduler;