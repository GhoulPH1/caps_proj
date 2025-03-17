import React, { useState } from 'react';
import axios from 'axios';

const FileCheck = () => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleVerify = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/verify-cid', formData);
      setResult(res.data);
    } catch (error) {
      setResult({ error: error.response?.data?.message || 'Verification failed' });
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Verify File on Blockchain</h2>
      <input type="file" onChange={handleFileChange} />
      <button 
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded" 
        onClick={handleVerify}
      >
        Verify CID
      </button>

      {result && (
        <div className="mt-4">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default FileCheck;