import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmUploadModal = ({ selectedFile, onConfirmUpload, onCancelUpload }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-zinc-800 bg-opacity-90 rounded-xl border border-white border-opacity-20 p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-500 bg-opacity-20 p-2 rounded-full">
            <AlertTriangle className="text-amber-400 h-6 w-6" />
          </div>
          <h3 className="text-white text-xl font-bold">Confirm Upload</h3>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Are you sure you want to upload this file?
          </p>
          
          <div className="bg-zinc-700 bg-opacity-50 p-3 rounded-lg mb-2">
            <p className="text-gray-400 text-sm mb-1">File Name</p>
            <p className="text-white font-medium">{selectedFile.name}</p>
          </div>
          
          <div className="flex gap-2">
            <div className="bg-zinc-700 bg-opacity-50 p-3 rounded-lg flex-1">
              <p className="text-gray-400 text-sm mb-1">Type</p>
              <p className="text-white">{selectedFile.type || 'Unknown'}</p>
            </div>
            <div className="bg-zinc-700 bg-opacity-50 p-3 rounded-lg flex-1">
              <p className="text-gray-400 text-sm mb-1">Size</p>
              <p className="text-white">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancelUpload}
            className="flex-1 py-2 px-4 bg-zinc-700 rounded-lg text-white hover:bg-zinc-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmUpload}
            className="flex-1 py-2 px-4 bg-white text-black rounded-lg font-medium hover:bg-opacity-90 transition-colors"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmUploadModal;