import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

const UploadStatus = ({ status, errorDetails }) => {
  if (!status.message) return null;
  
  return (
    <>
      <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 text-sm ${
        status.type === 'error' ? 'bg-red-500 bg-opacity-10 text-white' : 
        status.type === 'success' ? 'bg-green-500 bg-opacity-10 text-white' : 'bg-white bg-opacity-10 text-white'
      }`}>
        {status.type === 'error' ? <AlertCircle className="h-4 w-4" /> :
         status.type === 'success' ? <CheckCircle className="h-4 w-4" /> :
         <Info className="h-4 w-4" />}
        <p>{status.message}</p>
      </div>
      
      {errorDetails && (
        <div className="mt-2 p-2 rounded-lg bg-red-500 bg-opacity-5 text-red-300 text-xs overflow-auto max-h-32">
          {errorDetails}
        </div>
      )}
    </>
  );
};

export default UploadStatus;