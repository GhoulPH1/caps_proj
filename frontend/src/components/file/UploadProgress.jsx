import React from 'react';

const UploadProgress = ({ isLoading, uploadProgress }) => {
  if (!isLoading) return null;
  
  return (
    <div className="w-full bg-white bg-opacity-10 rounded-full h-2 overflow-hidden mt-2">
      <div 
        className="bg-white h-2 rounded-full transition-all duration-300"
        style={{ width: `${uploadProgress}%` }}
      ></div>
    </div>
  );
};

export default UploadProgress;