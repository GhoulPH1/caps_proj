import express from 'express';
import { upload, uploadFile } from '../controllers/file.controller.js';
import { verifyFileIntegrity } from '../controllers/auditor.controller.js';
import { validateToken } from '../middleware/auth.middleware.js'; // Import validateToken

const router = express.Router();

// Route for file upload to IPFS
router.post('/upload', validateToken, (req, res) => {
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

// NEW route for verifying CID
router.post('/verify-cid', validateToken, (req, res) => {
    console.log('Verify CID route hit');
    try {
      upload.single('file')(req, res, function(err) {
        if (err) {
          console.error('Multer error:', err);
          return res.status(400).json({ error: err.message });
        }
        console.log('File uploaded locally for integrity check');
        verifyFileIntegrity(req, res);
      });
    } catch (error) {
      console.error('Unhandled verify-cid error:', error);
      res.status(500).json({ error: 'Server error in verify-cid route' });
    }
});

export default router;
