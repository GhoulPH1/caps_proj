import React, { useEffect, memo } from 'react';
import useDashboardStore from '../../store/dashboard';

// Memoized components for better performance
const FileTableHeader = memo(({ sortBy, sortOrder, onSort }) => (
  <thead className="bg-gray-50">
    <tr>
      <th 
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
        onClick={() => onSort('name')}
      >
        File Name
        {sortBy === 'name' && (
          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
        )}
      </th>
      <th 
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
        onClick={() => onSort('fileSize')}
      >
        Size
        {sortBy === 'fileSize' && (
          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
        )}
      </th>
      <th 
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
        onClick={() => onSort('uploadedAt')}
      >
        Uploaded
        {sortBy === 'uploadedAt' && (
          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
        )}
      </th>
      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
        Actions
      </th>
    </tr>
  </thead>
));

const FileRow = memo(({ file, onSelect, onDelete, formatFileSize, formatDate, getFileTypeIcon }) => (
  <tr key={file.cid} className="hover:bg-gray-50">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <span className="text-lg mr-2">{getFileTypeIcon(file.name)}</span>
        <div>
          <div className="font-medium text-gray-900">{file.name}</div>
          <div className="text-xs text-gray-500 truncate w-48" title={file.cid}>
            CID: {file.cid?.substring(0, 16)}...
          </div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      {formatFileSize(file.size || 0)}
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      {formatDate(file.metadata?.uploadedAt)}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
      <div className="flex justify-end gap-2">
        <a 
          href={`https://ipfs.io/ipfs/${file.cid}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:text-blue-900"
        >
          View
        </a>
        <button
          onClick={() => onSelect(file)}
          className="text-indigo-600 hover:text-indigo-900"
        >
          Details
        </button>
        <button
          onClick={() => onDelete(file.cid)}
          className="text-red-600 hover:text-red-900"
        >
          Delete
        </button>
      </div>
    </td>
  </tr>
));

const ErrorNotification = memo(({ error, onDismiss }) => (
  <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 mb-4 mx-6">
    <p>{error}</p>
    <button onClick={onDismiss} className="text-sm underline mt-1">
      Dismiss
    </button>
  </div>
));

const VerificationResult = memo(({ result, onDismiss }) => (
  <div className={`p-4 ${result.success ? 'bg-green-100 border-green-500 text-green-700' : 'bg-red-100 border-red-500 text-red-700'} border-l-4 mb-4 mx-6`}>
    <p className="font-medium">{result.message}</p>
    {result.blockchainVerified && (
      <p className="text-sm mt-1">Blockchain Record: Block #{result.blockchainData.blockIndex}</p>
    )}
    <button onClick={onDismiss} className="text-sm underline mt-1">
      Dismiss
    </button>
  </div>
));

const FileDetailsModal = memo(({ file, fileToVerify, onClose, onFileSelect, onVerify, formatFileSize, formatDate }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
      <div className="border-b px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-medium">File Details</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
          ✕
        </button>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-500 mb-1">File Name</h4>
            <p>{file.name}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-500 mb-1">Size</h4>
            <p>{formatFileSize(file.size || 0)}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-500 mb-1">CID</h4>
            <p className="break-all">{file.cid}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-500 mb-1">Uploaded</h4>
            <p>{formatDate(file.metadata?.uploadedAt)}</p>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-medium text-gray-500 mb-1">IPFS URL</h4>
            <a 
              href={`https://ipfs.io/ipfs/${file.cid}`}
              target="_blank"
              rel="noopener noreferrer" 
              className="text-blue-600 hover:underline break-all"
            >
              https://ipfs.io/ipfs/{file.cid}
            </a>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-3">Verify File Integrity</h4>
          <p className="text-sm text-gray-600 mb-3">
            Upload the same file to verify if it matches the original on IPFS and blockchain
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="file" 
              onChange={onFileSelect}
              className="border rounded p-2"
            />
            <button
              onClick={() => onVerify(file.cid)}
              disabled={!fileToVerify}
              className={`px-4 py-2 rounded ${fileToVerify ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              Verify
            </button>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-6 py-4 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  </div>
));

// Main Dashboard Component
const Dashboard = () => {
  // Get state and actions from the store
  const { 
    files, loading, error, selectedFile, uploadProgress, fileToVerify, verificationResult,
    sortBy, sortOrder, initialize, fetchFiles, uploadFile, deleteFile, verifyFileIntegrity,
    setSelectedFile, clearSelectedFile, setFileToVerify, clearFileToVerify,
    clearError, clearVerificationResult, setSortBy,
    getSortedFiles, formatFileSize, formatDate, getFileTypeIcon
  } = useDashboardStore();

  // Initialize the store when component mounts
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Event handlers
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleFileVerifySelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileToVerify(file);
    }
  };

  const sortedFiles = getSortedFiles();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">IPFS File Dashboard</h1>
      
      {/* Upload Section */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Upload New File to IPFS</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <input 
            type="file" 
            onChange={handleFileUpload}
            className="border rounded p-2"
          />
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full mt-3">
              <div className="h-2 bg-gray-200 rounded">
                <div 
                  className="h-2 bg-blue-600 rounded" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">{uploadProgress}% uploaded</p>
            </div>
          )}
          {uploadProgress === 100 && (
            <div className="text-green-600 flex items-center">
              <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Upload Complete
            </div>
          )}
        </div>
      </div>
      
      {/* File List Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Your IPFS Files</h2>
          <p className="text-gray-600 mt-1">Files you've uploaded, secured by blockchain verification</p>
        </div>
        
        {error && <ErrorNotification error={error} onDismiss={clearError} />}
        
        {verificationResult && (
          <VerificationResult result={verificationResult} onDismiss={clearVerificationResult} />
        )}
        
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : sortedFiles.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-gray-500 text-lg">No files uploaded yet</p>
            <p className="text-gray-400 mt-2">Upload your first file to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <FileTableHeader 
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={setSortBy}
              />
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFiles.map((file) => (
                  <FileRow 
                    key={file.cid}
                    file={file}
                    onSelect={setSelectedFile}
                    onDelete={deleteFile}
                    formatFileSize={formatFileSize}
                    formatDate={formatDate}
                    getFileTypeIcon={getFileTypeIcon}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* File Details Modal */}
      {selectedFile && (
        <FileDetailsModal 
          file={selectedFile}
          fileToVerify={fileToVerify}
          onClose={clearSelectedFile}
          onFileSelect={handleFileVerifySelect}
          onVerify={verifyFileIntegrity}
          formatFileSize={formatFileSize}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

export default Dashboard;