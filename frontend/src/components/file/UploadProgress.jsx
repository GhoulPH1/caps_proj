import React from 'react';

const UploadProgress = ({ isLoading, uploadProgress }) => {
  if (!isLoading) return null;

  return (
    <div className="mt-4 flex flex-col items-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      <p className="mt-2">Processing file...</p>
      {uploadProgress > 0 && (
        <div className="w-full max-w-xs bg-gray-800 rounded mt-2 overflow-hidden">
          <div className="bg-blue-600 h-2" style={{ width: `${uploadProgress}%` }}></div>
        </div>
      )}
    </div>
  );
};

export default UploadProgress;
