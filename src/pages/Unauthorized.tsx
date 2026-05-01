import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';

export default function Unauthorized() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="w-24 h-24 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto shadow-xl shadow-danger/5">
          <ShieldAlert size={48} />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Access Denied</h1>
          <p className="text-text-secondary leading-relaxed">
            Your current role does not have the required permissions to view this section. 
            If you believe this is an error, please contact your system administrator.
          </p>
        </div>
        <div className="flex justify-center gap-4 pt-4">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            Go Back
          </Button>
          <Button variant="primary" onClick={() => navigate('/dashboard')}>
            System Overview
          </Button>
        </div>
      </div>
    </div>
  );
}
