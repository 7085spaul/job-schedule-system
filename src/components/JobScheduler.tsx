import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Pause, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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

  const fetchJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
    setJobs(data || []);
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

  const createJob = async () => {
    if (!newJob.name) {
      toast({ title: 'Error', description: 'Job name is required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const nextRun = calculateNextRun(newJob);
    
    const { data, error } = await supabase.from('jobs').insert({
      name: newJob.name,
      type: newJob.type,
      minute: newJob.minute,
      hour: newJob.hour,
      day_of_week: newJob.day_of_week,
      is_active: true,
      next_run: nextRun.toISOString()
    }).select().single();
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to create job', variant: 'destructive' });
    } else {
      setJobs(prev => [data, ...prev]);
      setNewJob({ type: 'hourly' });
      toast({ title: 'Success', description: 'Job created successfully' });
    }
    setLoading(false);
  };

  const executeJob = async (job: Job) => {
    try {
      // Call backend function to execute job
      const response = await fetch(
        'https://ptuzarufwgdwfzmacnab.supabase.co/functions/v1/764dfe57-a160-4d4e-ab94-967e838e7c6b',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'execute', jobId: job.id })
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`Job "${job.name}" executed: Hello World!`);
        setExecutions(prev => [
          `[${new Date().toLocaleTimeString()}] Job "${job.name}" executed: Hello World!`,
          ...prev.slice(0, 9)
        ]);
        
        // Log execution to database
        await supabase.from('job_executions').insert({
          job_id: job.id,
          output: 'Hello World'
        });
        
        // Update job with next run time
        const nextRun = calculateNextRun(job);
        await supabase.from('jobs').update({
          last_run: new Date().toISOString(),
          next_run: nextRun.toISOString()
        }).eq('id', job.id);
        
        fetchJobs();
      }
    } catch (error) {
      console.error('Job execution failed:', error);
    }
  };

  const toggleJobStatus = async (jobId: string, isActive: boolean) => {
    await supabase.from('jobs').update({ is_active: !isActive }).eq('id', jobId);
    fetchJobs();
  };

  const deleteJob = async (jobId: string) => {
    await supabase.from('jobs').delete().eq('id', jobId);
    fetchJobs();
  };

  useEffect(() => {
    fetchJobs();
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
              </>
            )}
            
            {newJob.type === 'weekly' && (
              <div>
                <Label>Day of Week</Label>
                <Select 
                  value={newJob.day_of_week?.toString()} 
                  onValueChange={(value) => setNewJob(prev => ({ ...prev, day_of_week: parseInt(value) }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button 
            onClick={createJob} 
            disabled={loading || !newJob.name} 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {loading ? 'Creating...' : 'Create Job'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Jobs ({jobs.filter(j => j.is_active).length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {jobs.map(job => (
                <div key={job.id} className="p-4 border rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-gray-900">{job.name}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={job.is_active ? 'default' : 'secondary'}>
                        {job.is_active ? 'Active' : 'Paused'}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => toggleJobStatus(job.id, job.is_active)}
                      >
                        {job.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => deleteJob(job.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Type: {job.type}</div>
                    <div>Next run: {job.next_run ? new Date(job.next_run).toLocaleString() : 'Not scheduled'}</div>
                    {job.last_run && <div>Last run: {new Date(job.last_run).toLocaleString()}</div>}
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No jobs scheduled yet. Create your first job above!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Execution Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {executions.map((log, index) => (
                <div key={index} className="text-sm font-mono bg-green-50 border border-green-200 p-3 rounded-lg">
                  {log}
                </div>
              ))}
              {executions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No executions yet. Jobs will appear here when they run.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobScheduler;