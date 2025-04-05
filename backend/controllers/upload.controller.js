import fs from 'fs';
import path from 'path';
import { PinataSDK } from 'pinata-web3';
import multer from 'multer';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { SynoChain } from '../blockchain.js';
import crypto from 'crypto-js';

const { SHA256 } = crypto;
const unlinkAsync = promisify(fs.unlink);

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
} 

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Initialize Pinata SDK
export const initPinataSdk = () => {
  if (!process.env.PINATA_JWT) {
    throw new Error('Pinata JWT missing. Please set PINATA_JWT in your .env file');
  }
  
  return new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'
  });
};

export const verifyCid = async (req, res) => {
  const { cid } = req.body;
  if (!cid) {
    return res.status(400).json({ success: false, message: "CID required." });
  }
  
  const hashedCID = SHA256(cid).toString();
  const block = SynoChain.getBlockContainingHash(hashedCID);
  
  if (block) {
    return res.status(200).json({
      success: true,
      message: "CID hash found in blockchain.",
      block
    });
  } else {
    return res.status(404).json({
      success: false,
      message: "CID hash not found in blockchain."
    });
  }
};

export const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided' });
  }
  
  const filePath = req.file.path;
  try {
    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath);
    
    // Create File object for Pinata upload
    const file = new File([fileBuffer], req.file.originalname, {
      type: req.file.mimetype
    });
    
    // Initialize Pinata SDK
    const pinata = initPinataSdk();
    
    console.log(`Starting Pinata IPFS upload for file: ${req.file.originalname}`);
    
    // Upload file with metadata
    const uploadResult = await pinata.upload.public
      .file(file)
      .name(req.file.originalname)
      .keyvalues({
        originalName: req.file.originalname,
        uploadTimestamp: Date.now().toString(),
        fileSize: req.file.size.toString(),
        mimeType: req.file.mimetype
      });
    
    const cid = uploadResult.cid;
    const hashedCid = SHA256(cid).toString();
    
    // Add CID hash to blockchain and mine block
    SynoChain.addTransaction(hashedCid);
    SynoChain.minePendingTransactions();
    
    // Clean up temporary file
    await unlinkAsync(filePath);
    
    return res.status(200).json({
      success: true,
      message: 'File uploaded to IPFS and Blockchain successfully via Pinata',
      cid: cid,
      hashedCid,
      ipfsUrl: `https://ipfs.io/ipfs/${cid}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadMethod: 'Pinata'
    });
  } catch (error) {
    console.error('IPFS upload error:', error);
    
    if (req.file && req.file.path) {
      await unlinkAsync(req.file.path).catch(cleanupError => 
        console.error('Error cleaning up file:', cleanupError)
      );
    }
    
    return res.status(500).json({ 
      success: false, 
      message: `IPFS upload failed: ${error.message}` 
    });
  }
};

// Optional: Add support for larger files using resumable upload
export const uploadLargeFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided' });
  }
  
  try {
    const pinata = initPinataSdk();
    
    console.log(`Starting large file upload: ${req.file.originalname}`);
    
    // For files larger than 100MB, Pinata recommends using resumable uploads
    const uploadResult = await pinata.upload.public
      .file(req.file)
      .keyvalues({
        originalName: req.file.originalname,
        uploadTimestamp: Date.now().toString(),
        uploadType: 'resumable'
      });
    
    const cid = uploadResult.cid;
    const hashedCid = SHA256(cid).toString();
    
    // Add CID hash to blockchain and mine block
    SynoChain.addTransaction(hashedCid);
    SynoChain.minePendingTransactions();
    
    return res.status(200).json({
      success: true,
      message: 'Large file uploaded to IPFS and Blockchain successfully via Pinata',
      cid: cid,
      hashedCid,
      ipfsUrl: `https://ipfs.io/ipfs/${cid}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadMethod: 'Pinata Resumable'
    });
  } catch (error) {
    console.error('Large file upload error:', error);
    
    return res.status(500).json({ 
      success: false, 
      message: `Large file upload failed: ${error.message}` 
    });
  }
};