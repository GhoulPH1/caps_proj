import React from 'react';

const FileUploadForm = ({ onFileSelect, isLoading, onUploadClick }) => (
  <>
    <input
      type="file"
      id="file-input"
      onChange={onFileSelect}
      disabled={isLoading}
      className="hidden"
    />
    <label htmlFor="file-input" className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded cursor-pointer">
      Select File
    </label>
    <button 
      onClick={onUploadClick} 
      disabled={isLoading}
      className="bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded disabled:opacity-50"
    >
      Upload to IPFS
    </button>
  </>
);

export default FileUploadForm;
