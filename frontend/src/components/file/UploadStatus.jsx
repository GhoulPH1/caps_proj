import React from 'react';

const UploadStatus = ({ status }) => {
  if (!status.message) return null;

  return (
    <div className={`mt-4 p-3 rounded ${status.type === 'success' ? 'bg-green-600' : status.type === 'error' ? 'bg-red-600' : 'bg-yellow-600'}`}>
      {status.message}
    </div>
  );
};

export default UploadStatus;
