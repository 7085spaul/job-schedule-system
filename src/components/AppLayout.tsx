import React from 'react';
import JobScheduler from './JobScheduler';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Job Scheduling System
          </h1>
          <p className="text-gray-600 text-lg">
            Schedule and manage automated tasks with precision
          </p>
        </div>
        <JobScheduler />
      </div>
    </div>
  );
};

export default AppLayout;