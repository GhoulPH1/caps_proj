import React, { useState, useRef } from 'react';
import axios from 'axios';
import { TokenHandler } from '../../services/token.handler';
import { Upload, Lock, FileText, Edit2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import FileUploadForm from '../forms/FileUploadForm';
import UploadProgress from './UploadProgress';
import UploadStatus from './UploadProgress';
import ConfirmUploadModal from '../modals/ConfirmUploadModal';

export default function SecureFileVault() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [uploadProgress, setUploadProgress] = useState(0);   
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorDetails, setErrorDetails] = useState('');
  const fileInputRef = useRef(null);
  
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      setStatus({ type: '', message: '' });
      setUploadProgress(0);
      setErrorDetails('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setFileName(file.name);
      setStatus({ type: '', message: '' });
      setUploadProgress(0);
      setErrorDetails('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
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

      const token = TokenHandler.getToken();

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
      setFileName('');
      
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleRename = () => {
    setShowRenameInput(!showRenameInput);
  };

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header - Left aligned */}
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-white bg-opacity-10 rounded-lg p-2">
            <Lock className="text-white h-5 w-5" />
          </div>
          <h1 className="text-white text-2xl font-bold">SECURE FILE VAULT</h1>
        </div>
        
        <div className="mb-8">
          <p className="text-white">
            Upload your files for integrity tracking and version control
          </p>
          <p className="text-gray-400">
            No processing — just safe storage.
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          {/* Left Column */}
          <div className="w-full lg:w-3/5">
            {/* Upload Area */}
            <div 
              className={`bg-zinc-800 bg-opacity-45 backdrop-blur-md rounded-xl border ${isDragging ? 'border-white' : 'border-white border-opacity-10'} p-8 flex flex-col items-center justify-center mb-6 h-72 cursor-pointer transition-all duration-300 hover:bg-opacity-55`}
              onClick={() => fileInputRef.current.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className={`${isDragging ? 'scale-110' : 'scale-100'} transition-transform duration-200`}>
                <Upload className="text-white h-16 w-16 mb-4" />
                <p className="text-white text-xl font-medium mb-2">UPLOAD</p>
                <p className="text-gray-400 text-center">
                  {isDragging ? 'Release to upload' : 'Drop your file here or click to browse'}
                </p>
              </div>
            </div>
            
            {/* Upload Status */}
            <div className="bg-zinc-800 bg-opacity-45 backdrop-blur-md rounded-xl border border-white border-opacity-10 p-4 transition-all duration-300 hover:bg-opacity-55">
              <div className="flex justify-between items-center">
                <div className="text-white font-medium">UPLOAD STATUS</div>
                
                <div className="flex items-center gap-2">
                  {uploadProgress > 0 && (
                    <span className="text-white">
                      ({uploadProgress}%)
                    </span>
                  )}
                </div>
              </div>
              
              {selectedFile && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="text-white h-4 w-4" />
                    <span className="text-white">{fileName}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>{formatFileSize(selectedFile.size)}</span>
                    <span>{getCurrentDate()}</span>
                  </div>
                  
                  {/* Progress bar */}
                  {isLoading && (
                    <div className="w-full bg-white bg-opacity-10 rounded-full h-2 overflow-hidden mt-2">
                      <div 
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                  
                  {/* Status Message */}
                  {status.message && (
                    <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 text-sm ${
                      status.type === 'error' ? 'bg-red-500 bg-opacity-10 text-white' : 
                      status.type === 'success' ? 'bg-green-500 bg-opacity-10 text-white' : 'bg-white bg-opacity-10 text-white'
                    }`}>
                      {status.type === 'error' ? <AlertCircle className="h-4 w-4" /> :
                       status.type === 'success' ? <CheckCircle className="h-4 w-4" /> :
                       <Info className="h-4 w-4" />}
                      <p>{status.message}</p>
                    </div>
                  )}
                  
                  {errorDetails && (
                    <div className="mt-2 p-2 rounded-lg bg-red-500 bg-opacity-5 text-red-300 text-xs overflow-auto max-h-32">
                      {errorDetails}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column */}
          <div className="w-full lg:w-2/5">
            {/* File Information / Details */}
            <div className="bg-zinc-800 bg-opacity-45 backdrop-blur-md rounded-xl border border-white border-opacity-10 p-6 mb-6 h-72 transition-all duration-300 hover:bg-opacity-55">
              <h2 className="text-white text-xl font-medium mb-4">FILE INFORMATION</h2>
              
              {selectedFile ? (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="text-white h-5 w-5" />
                      {showRenameInput ? (
                        <input 
                          type="text" 
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          className="bg-zinc-700 text-white px-2 py-1 rounded-lg border border-white border-opacity-20 focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="text-white font-medium">{fileName}</span>
                      )}
                    </div>
                    <button 
                      onClick={handleRename} 
                      className="bg-white bg-opacity-10 p-1 rounded-lg hover:bg-opacity-20 transition-all"
                    >
                      <Edit2 className="text-white h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-zinc-700 bg-opacity-50 p-2 rounded-lg">
                      <p className="text-gray-400 text-xs mb-1">File Type</p>
                      <p className="text-white text-sm font-medium">{selectedFile.type || 'Unknown'}</p>
                    </div>
                    <div className="bg-zinc-700 bg-opacity-50 p-2 rounded-lg">
                      <p className="text-gray-400 text-xs mb-1">File Size</p>
                      <p className="text-white text-sm font-medium">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleUploadClick}
                    disabled={isLoading || !selectedFile}
                    className={`w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                      isLoading || !selectedFile ? 
                      'bg-gray-800 text-gray-500 cursor-not-allowed' : 
                      'bg-white text-black hover:bg-opacity-90'
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    {isLoading ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>
              ) : (
                <p className="text-gray-400 mt-8 text-center">
                  No file selected. Upload a file to see details.
                </p>
              )}
            </div>
            
            {/* File Validation */}
            <div className="bg-zinc-800 bg-opacity-45 backdrop-blur-md rounded-xl border border-white border-opacity-10 p-4 transition-all duration-300 hover:bg-opacity-55">
              <p className="text-white font-medium">FILE VALIDATION</p>
              
              {selectedFile && status.type === 'success' && (
                <div className="mt-2 p-2 rounded-lg bg-green-500 bg-opacity-10 flex items-center gap-2">
                  <CheckCircle className="text-green-400 h-4 w-4" />
                  <p className="text-green-400 text-sm">File validated successfully</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Integrity Assurance */}
          <div className="bg-zinc-800 bg-opacity-45 backdrop-blur-md rounded-xl border border-white border-opacity-10 p-6 transition-all duration-300 hover:bg-opacity-55 hover:translate-y-1">
            <h2 className="text-white text-lg font-bold mb-2">INTEGRITY ASSURANCE</h2>
            <p className="text-gray-300 text-sm">
              Your file is saved securely
              and assigned a digital fingerprint.<br />
              No Changes, No Tricks
            </p>
          </div>
          
          {/* Versioning Policy */}
          <div className="bg-zinc-800 bg-opacity-45 backdrop-blur-md rounded-xl border border-white border-opacity-10 p-6 transition-all duration-300 hover:bg-opacity-55 hover:translate-y-1">
            <h2 className="text-white text-lg font-bold mb-2">VERSIONING POLICY</h2>
            <p className="text-gray-300 text-sm">
              Uploading file with the same
              name will generate a new version
              without deleting the old one
            </p>
          </div>
          
          {/* Privacy First */}
          <div className="bg-zinc-800 bg-opacity-45 backdrop-blur-md rounded-xl border border-white border-opacity-10 p-6 transition-all duration-300 hover:bg-opacity-55 hover:translate-y-1">
            <h2 className="text-white text-lg font-bold mb-2">PRIVACY FIRST</h2>
            <p className="text-gray-300 text-sm">
              Your uploads are encrypted end-to-end.
              Only you have access to your files.
            </p>
          </div>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirm && (
        <ConfirmUploadModal 
          selectedFile={selectedFile} 
          onConfirmUpload={handleConfirmUpload} 
          onCancelUpload={handleCancelUpload} 
        />
      )}
    </div>
  );
}