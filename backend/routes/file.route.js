import express from 'express';
import { upload, uploadFile, listFiles, getFileByCid, getFilesByFilename, deleteFile } from '../controllers/file.controller.js';
import { verifyFileIntegrity } from '../controllers/auditor.controller.js';
import { validateToken } from '../middleware/auth.middleware.js';

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

// NEW route for listing all files
router.get('/list', validateToken, (req, res) => {
    console.log('List files route hit');
    try {
      listFiles(req, res);
    } catch (error) {
      console.error('Unhandled list files error:', error);
      res.status(500).json({ error: 'Server error in list files route' });
    }
});

// NEW route for getting file by CID
router.get('/:cid', validateToken, (req, res) => {
    console.log(`Get file route hit for CID: ${req.params.cid}`);
    try {
      getFileByCid(req, res);
    } catch (error) {
      console.error('Unhandled get file error:', error);
      res.status(500).json({ error: 'Server error in get file route' });
    }
});

// NEW route for getting files by filename and extension
router.get('/name/:filename/ext/:extension', validateToken, (req, res) => {
    console.log(`Get files by filename route hit: ${req.params.filename}.${req.params.extension}`);
    try {
      getFilesByFilename(req, res);
    } catch (error) {
      console.error('Unhandled get files by filename error:', error);
      res.status(500).json({ error: 'Server error in get files by filename route' });
    }
});

// NEW route for deleting file by CID
router.delete('/:cid', validateToken, (req, res) => {
    console.log(`Delete file route hit for CID: ${req.params.cid}`);
    try {
      deleteFile(req, res);
    } catch (error) {
      console.error('Unhandled delete file error:', error);
      res.status(500).json({ error: 'Server error in delete file route' });
    }
});

export default router;