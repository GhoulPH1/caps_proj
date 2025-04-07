import React, { useState } from 'react';
import axios from 'axios';
import { TokenHandler } from '../../services/token.handler';
import { Shield, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const FileCheck = () => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    // Clear previous results when selecting a new file
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
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

  const handleVerify = async () => {
    if (!file) {
      setResult({ error: 'Please select a file first' });
      return;
    }

    const token = TokenHandler.getToken();

    if (!token) {
      setResult({ error: 'Authentication required. Please log in first.' });
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Using TokenHandler's getAuthHeader to get authorization headers
      const res = await axios.post('/api/verify-cid', formData, {
        headers: {
          ...TokenHandler.getAuthHeader()
        }
      });
      setResult(res.data);
    } catch (error) {
      setResult({ 
        error: error.response?.data?.message || 'Verification failed',
        details: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-zinc-800 bg-opacity-45 backdrop-blur-md rounded-lg border border-white border-opacity-10 shadow-lg transition-all duration-300 hover:bg-opacity-50">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-white bg-opacity-10 p-2 rounded-lg">
          <Shield className="text-white h-5 w-5" />
        </div>
        <h2 className="text-white text-xl font-bold">Verify File on Blockchain</h2>
      </div>
      
      <div 
        className={`mb-6 p-5 border-2 ${isDragging ? 'border-white' : 'border-white border-opacity-10'} border-dashed rounded-lg bg-zinc-800 bg-opacity-30 flex flex-col items-center justify-center cursor-pointer transition-all duration-300`}
        onClick={() => document.getElementById('file-input').click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input 
          id="file-input"
          type="file" 
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-white mb-2">{isDragging ? 'Release to Upload' : 'Drop file here or click to select'}</p>
        <p className="text-gray-400 text-sm">Select the file you want to verify</p>
      </div>

      {file && (
        <div className="mb-4 p-3 bg-zinc-700 bg-opacity-40 rounded-lg text-white">
          <p className="font-medium">Selected file: {file.name}</p>
          <p className="text-gray-300 text-sm">
            {file.size > 1024 * 1024
              ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
              : `${(file.size / 1024).toFixed(2)} KB`}
          </p>
        </div>
      )}

      <button 
        className={`px-4 py-2 rounded flex items-center justify-center gap-2 w-full transition-all ${
          isLoading 
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
            : 'bg-white text-black hover:bg-opacity-90'
        }`}
        onClick={handleVerify}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader className="h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <Shield className="h-4 w-4" />
            Verify CID
          </>
        )}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded-lg ${
          result.error 
            ? 'bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30' 
            : 'bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30'
        } transition-all duration-300`}>
          {result.error ? (
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5" />
                <p className="font-semibold">Verification Failed</p>
              </div>
              <p>{result.error}</p>
              {result.details && <p className="text-sm mt-2 text-white">{result.details}</p>}
            </div>
          ) : (
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5" />
                <p className="font-semibold">Verification Successful</p>
              </div>
              <div className="bg-black bg-opacity-30 p-3 rounded-lg text-white mt-2">
                <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileCheck;