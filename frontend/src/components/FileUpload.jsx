import React, { useState } from 'react';
import axios from 'axios';
// import './FileUpload.css';

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
      // Create FormData for the API request
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      setStatus({ type: 'info', message: 'Uploading to IPFS...' });
      
      // Upload the file to the server with progress tracking
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      // Set success status with IPFS details
      setStatus({
        type: 'success',
        message: `File uploaded successfully! IPFS CID: ${response.data.cid}`
      });

      // Reset selected file
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      
      // Get detailed error message from response if available
      const errorMessage = error.response?.data?.message || error.message;
      setStatus({
        type: 'error',
        message: `Upload failed: ${errorMessage}`
      });
      
      // Store detailed error info for debugging
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
    <div className="file-upload-container">
      <h2>Upload File to IPFS</h2>
      
      <div className="file-input-container">
        <input
          type="file"
          id="file-input"
          onChange={handleFileSelect}
          disabled={isLoading}
          className="hidden-input"
        />
        <label htmlFor="file-input" className="file-input-label">
          Select File
        </label>
        <button 
          onClick={handleUploadClick} 
          disabled={!selectedFile || isLoading}
          className="upload-button"
        >
          Upload to IPFS
        </button>
      </div>
      
      {selectedFile && (
        <div className="file-details">
          <p>Selected File: <strong>{selectedFile.name}</strong></p>
          <p>Size: <strong>{formatFileSize(selectedFile.size)}</strong></p>
          <p>Type: <strong>{selectedFile.type || 'text/plain'}</strong></p>
        </div>
      )}
      
      {showConfirm && (
        <div className="confirmation-dialog">
          <div className="confirmation-content">
            <h3>Confirm Upload</h3>
            <p>Are you sure you want to upload this file to IPFS?</p>
            <p>File: <strong>{selectedFile.name}</strong></p>
            <p>Size: <strong>{formatFileSize(selectedFile.size)}</strong></p>
            <div className="confirmation-buttons">
              <button onClick={handleCancelUpload} className="cancel-button">Cancel</button>
              <button onClick={handleConfirmUpload} className="confirm-button">Upload</button>
            </div>
          </div>
        </div>
      )}
      
      {status.message && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}
      
      {errorDetails && (
        <div className="error-details">
          <details>
            <summary>Show technical details</summary>
            <pre>{errorDetails}</pre>
          </details>
        </div>
      )}
      
      {isLoading && (
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Processing file...</p>
          </div>
          {uploadProgress > 0 && (
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
              <span className="progress-text">{uploadProgress}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;