// dashboard.js - Store for Dashboard state management
import { create } from 'zustand';
import axios from 'axios';

// Configure axios defaults
const configureAxios = () => {
  // Get token from localStorage
  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  
  // Add response interceptor for handling auth errors
  axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};

// Helper functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleString();
};

const getFileTypeIcon = (filename) => {
  if (!filename) return '📄';
  const extension = filename.split('.').pop().toLowerCase();
  
  const iconMap = {
    pdf: '📕', doc: '📘', docx: '📘',
    xls: '📗', xlsx: '📗', ppt: '📙',
    pptx: '📙', jpg: '🖼️', jpeg: '🖼️',
    png: '🖼️', gif: '🖼️', mp3: '🎵',
    mp4: '🎬', mov: '🎬', zip: '🗜️',
    rar: '🗜️', txt: '📝'
  };
  
  return iconMap[extension] || '📄';
};

// Create the store
const useDashboardStore = create((set, get) => ({
  // State
  files: [],
  loading: false,
  error: null,
  selectedFile: null,
  uploadProgress: 0,
  fileToVerify: null,
  verificationResult: null,
  sortBy: 'uploadedAt',
  sortOrder: 'desc',
  
  // Initialize the store
  initialize: () => {
    configureAxios();
    get().fetchFiles();
  },
  
  // Actions
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  
  setSelectedFile: (file) => set({ selectedFile: file }),
  clearSelectedFile: () => set({ selectedFile: null }),
  
  setFileToVerify: (file) => set({ fileToVerify: file }),
  clearFileToVerify: () => set({ fileToVerify: null }),
  
  setVerificationResult: (result) => set({ verificationResult: result }),
  clearVerificationResult: () => set({ verificationResult: null }),
  
  // Sorting functionality
  setSortBy: (field) => {
    const { sortBy, sortOrder } = get();
    if (sortBy === field) {
      set({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      set({ sortBy: field, sortOrder: 'asc' });
    }
  },
  
  // File operations
  fetchFiles: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/list');
      if (response.data.success) {
        set({ files: response.data.files });
      } else {
        set({ error: response.data.message || 'Failed to fetch files' });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error connecting to server' });
      console.error('Error fetching files:', err);
    } finally {
      set({ loading: false });
    }
  },
  
  uploadFile: async (file) => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    set({ uploadProgress: 0 });
    
    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          set({ uploadProgress: percentCompleted });
        }
      });
      
      if (response.data.success) {
        // Update files list
        get().fetchFiles();
        return response.data;
      } else {
        set({ error: response.data.message || 'Upload failed' });
        return null;
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error uploading file' });
      console.error('Error uploading file:', err);
      return null;
    }
  },
  
  deleteFile: async (cid) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return false;
    
    try {
      const response = await axios.delete(`/api/${cid}`);
      
      if (response.data.success) {
        // Update state to remove the file
        const files = get().files.filter(file => file.cid !== cid);
        set({ files });
        return true;
      } else {
        set({ error: response.data.message || 'Delete failed' });
        return false;
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error deleting file' });
      console.error('Error deleting file:', err);
      return false;
    }
  },
  
  verifyFileIntegrity: async (cid) => {
    const { fileToVerify } = get();
    if (!fileToVerify) {
      set({ error: 'Please select a file to verify' });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', fileToVerify);
    formData.append('originalCid', cid);
    
    try {
      const response = await axios.post('/api/verify-cid', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      set({ verificationResult: response.data, fileToVerify: null });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Error verifying file' });
      console.error('Error verifying file:', err);
    }
  },
  
  // Helper methods
  getSortedFiles: () => {
    const { files, sortBy, sortOrder } = get();
    if (!files || !Array.isArray(files)) return [];
    
    return [...files].sort((a, b) => {
      let aValue = sortBy === 'fileSize' ? Number(a[sortBy]) : a[sortBy];
      let bValue = sortBy === 'fileSize' ? Number(b[sortBy]) : b[sortBy];
      
      // Handle metadata properties
      if (sortBy === 'uploadedAt' && a.metadata && a.metadata.uploadedAt) {
        aValue = a.metadata.uploadedAt;
        bValue = b.metadata.uploadedAt;
      }
      
      if (sortBy === 'name') {
        aValue = a.name || '';
        bValue = b.name || '';
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  },
  
  // Utility functions available to components
  formatFileSize,
  formatDate,
  getFileTypeIcon
}));

export default useDashboardStore;