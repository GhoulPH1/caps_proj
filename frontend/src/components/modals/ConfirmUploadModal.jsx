import React from 'react';
import { formatFileSize } from '../../utls/utils';

const ConfirmUploadModal = ({ selectedFile, onConfirmUpload, onCancelUpload }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold mb-2">Confirm Upload</h3>
      <p>Are you sure you want to upload this file to IPFS?</p>
      <p className="mt-2">File: <strong>{selectedFile.name}</strong></p>
      <p>Size: <strong>{formatFileSize(selectedFile.size)}</strong></p>
      <div className="mt-4 flex justify-end space-x-2">
        <button onClick={onCancelUpload} className="bg-red-600 hover:bg-red-500 text-white py-2 px-4 rounded">Cancel</button>
        <button onClick={onConfirmUpload} className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded">Upload</button>
      </div>
    </div>
  </div>
);

export default ConfirmUploadModal;