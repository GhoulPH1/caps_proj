import fs from 'fs';
import path from 'path';
import { FleekSdk, PersonalAccessTokenService } from '@fleek-platform/sdk/node';
import multer from 'multer';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const unlinkAsync = promisify(fs.unlink);

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

export const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Limit to 10MB
});

// Initialize Fleek SDK
export const initFleekSdk = () => {
  try {
    // Check if environment variables are present
    if (!process.env.FLEEK_PERSONAL_ACCESS_TOKEN || !process.env.FLEEK_PROJECT_ID) {
      throw new Error('Fleek credentials missing. Please set FLEEK_PERSONAL_ACCESS_TOKEN and FLEEK_PROJECT_ID in your .env file');
    }
    
    const accessTokenService = new PersonalAccessTokenService({
      personalAccessToken: process.env.FLEEK_PERSONAL_ACCESS_TOKEN,
      projectId: process.env.FLEEK_PROJECT_ID,
    });
    
    return new FleekSdk({ accessTokenService });
  } catch (error) {
    console.error('Error initializing Fleek SDK:', error);
    throw new Error(`Failed to initialize Fleek SDK: ${error.message}`);
  }
};

// Controller for file upload
export const uploadFile = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const filePath = req.file.path;
    
    try {
      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at path: ${filePath}`);
      }
      
      // Read file as buffer
      const fileBuffer = fs.readFileSync(filePath);
      
      // Initialize Fleek SDK
      const fleekSdk = initFleekSdk();
      
      console.log(`Starting IPFS upload for file: ${req.file.originalname}`);
      
      // Use the ipfs().add method as shown in the example
      const result = await fleekSdk.ipfs().add({
        path: req.file.originalname,
        content: fileBuffer,
      });
      
      console.log(`Upload completed with CID: ${result.cid}`);

      // Clean up the temp file
      await unlinkAsync(filePath);

      return res.status(200).json({
        success: true,
        message: 'File uploaded to IPFS successfully',
        cid: result.cid,
        ipfsUrl: `https://ipfs.io/ipfs/${result.cid}`,
        fileName: req.file.originalname,
        fileSize: req.file.size
      });
    } catch (error) {
      console.error('IPFS upload error:', error);

      // Clean up the temp file on error
      if (req.file && req.file.path) {
        try {
          await unlinkAsync(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }

      return res.status(500).json({
        success: false,
        message: `IPFS upload failed: ${error.message}`
      });
    }
  } catch (error) {
    console.error('Controller error:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
};