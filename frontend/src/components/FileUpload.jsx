import React, { useState } from 'react';
import axios from 'axios';

const FileUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorDetails, setErrorDetails] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setStatus({ type: '', message: '' });
      setUploadProgress(0);
      setErrorDetails('');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const handleUploadClick = () => {
    if (!selectedFile) {
      setStatus({ type: 'error', message: 'Please select a file first' });
      return;
    }
    
    setShowConfirm(true);
  };

  const handleConfirmUpload = async () => {
    setIsLoading(true);
    setStatus({ type: 'info', message: 'Preparing file...' });
    setShowConfirm(false);
    setUploadProgress(0);
    setErrorDetails('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }
      
      setStatus({ type: 'info', message: 'Uploading to IPFS...' });
      
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` 
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      setStatus({
        type: 'success',
        message: `File uploaded successfully! IPFS CID: ${response.data.cid}`
      });

      setSelectedFile(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      
      const errorMessage = error.response?.data?.message || error.message;
      setStatus({
        type: 'error',
        message: `Upload failed: ${errorMessage}`
      });
      
      setErrorDetails(
        `Error details: ${JSON.stringify(error.response?.data || 'No response data')}`
      );
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelUpload = () => {
    setShowConfirm(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
      <h2 className="text-2xl font-bold mb-4">Upload File to IPFS</h2>
      
      <div className="flex flex-col items-center space-y-4 bg-gray-900 p-6 rounded-lg shadow-lg w-full max-w-lg">
        <input
          type="file"
          id="file-input"
          onChange={handleFileSelect}
          disabled={isLoading}
          className="hidden"
        />
        <label htmlFor="file-input" className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded cursor-pointer">Select File</label>
        <button 
          onClick={handleUploadClick} 
          disabled={!selectedFile || isLoading}
          className="bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          Upload to IPFS
        </button>
      </div>
      
      {selectedFile && (
        <div className="mt-4 text-sm bg-gray-800 p-4 rounded-lg shadow-lg">
          <p>Selected File: <strong>{selectedFile.name}</strong></p>
          <p>Size: <strong>{formatFileSize(selectedFile.size)}</strong></p>
          <p>Type: <strong>{selectedFile.type || 'text/plain'}</strong></p>
        </div>
      )}
      
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold mb-2">Confirm Upload</h3>
            <p>Are you sure you want to upload this file to IPFS?</p>
            <p className="mt-2">File: <strong>{selectedFile.name}</strong></p>
            <p>Size: <strong>{formatFileSize(selectedFile.size)}</strong></p>
            <div className="mt-4 flex justify-end space-x-2">
              <button onClick={handleCancelUpload} className="bg-red-600 hover:bg-red-500 text-white py-2 px-4 rounded">Cancel</button>
              <button onClick={handleConfirmUpload} className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded">Upload</button>
            </div>
          </div>
        </div>
      )}
      
      {status.message && (
        <div className={`mt-4 p-3 rounded ${status.type === 'success' ? 'bg-green-600' : status.type === 'error' ? 'bg-red-600' : 'bg-yellow-600'}`}>{status.message}</div>
      )}
      
      {isLoading && (
        <div className="mt-4 flex flex-col items-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2">Processing file...</p>
          {uploadProgress > 0 && (
            <div className="w-full max-w-xs bg-gray-800 rounded mt-2 overflow-hidden">
              <div className="bg-blue-600 h-2" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;