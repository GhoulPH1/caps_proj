import React, { useState } from 'react';
import axios from 'axios';
import { formatFileSize } from '../../utls/utils';
import FileUploadForm  from '../forms/FileUploadForm';
import UploadProgress from './UploadProgress';
import UploadStatus from './UploadStatus';
import ConfirmUploadModal  from '../modals/ConfirmUploadModal';

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
        <FileUploadForm onFileSelect={handleFileSelect} isLoading={isLoading} onUploadClick={handleUploadClick} />
      </div>
      
      {selectedFile && (
        <div className="mt-4 text-sm bg-gray-800 p-4 rounded-lg shadow-lg">
          <p>Selected File: <strong>{selectedFile.name}</strong></p>
          <p>Size: <strong>{formatFileSize(selectedFile.size)}</strong></p>
          <p>Type: <strong>{selectedFile.type || 'text/plain'}</strong></p>
        </div>
      )}

      {showConfirm && (
        <ConfirmUploadModal 
          selectedFile={selectedFile} 
          onConfirmUpload={handleConfirmUpload} 
          onCancelUpload={handleCancelUpload} 
        />
      )}

      <UploadStatus status={status} />
      <UploadProgress isLoading={isLoading} uploadProgress={uploadProgress} />
    </div>
  );
};

export default FileUpload;
