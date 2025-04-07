import React from 'react';
import { Upload } from 'lucide-react';

const FileUploadForm = ({ onFileSelect, isLoading, onUploadClick, fileInputRef, isDragging, onDrop, onDragOver, onDragLeave }) => {
  return (
    <div 
      className={`bg-zinc-800 bg-opacity-45 backdrop-blur-md rounded-xl border ${isDragging ? 'border-white' : 'border-white border-opacity-10'} p-8 flex flex-col items-center justify-center mb-6 h-72 cursor-pointer transition-all duration-300 hover:bg-opacity-55`}
      onClick={() => fileInputRef.current.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={onFileSelect}
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
  );
};

export default FileUploadForm;