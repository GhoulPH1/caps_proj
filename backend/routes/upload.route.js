import express from 'express';
import { upload, uploadFile } from '../controllers/upload.controller.js';

const router = express.Router();

// Route for file upload to IPFS
// Apply multer middleware correctly
// Add this to your route file
router.post('/upload', (req, res, next) => {
    console.log('Upload route hit');
    try {
      upload.single('file')(req, res, function(err) {
        if (err) {
          console.error('Multer error:', err);
          return res.status(400).json({ error: err.message });
        }
        console.log('File uploaded to server, proceeding to controller');
        uploadFile(req, res);
      });
    } catch (error) {
      console.error('Unhandled route error:', error);
      res.status(500).json({ error: 'Server error in route' });
    }
  });

export default router;