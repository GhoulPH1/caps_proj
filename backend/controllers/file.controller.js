import fs from 'fs';
import path from 'path';
import { FleekSdk, PersonalAccessTokenService } from '@fleek-platform/sdk/node';
import multer from 'multer';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { SynoChain } from '../blockchain.js';
import crypto from 'crypto-js';
import { ReadableStream } from 'stream/web';

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
  limits: { fileSize: 100 * 1024 * 1024 }
});

export const initFleekSdk = () => {
  if (!process.env.FLEEK_PERSONAL_ACCESS_TOKEN || !process.env.FLEEK_PROJECT_ID) {
    throw new Error('Fleek credentials missing. Please set FLEEK_PERSONAL_ACCESS_TOKEN and FLEEK_PROJECT_ID in your .env file');
  }
  const accessTokenService = new PersonalAccessTokenService({
    personalAccessToken: process.env.FLEEK_PERSONAL_ACCESS_TOKEN,
    projectId: process.env.FLEEK_PROJECT_ID,
  });
  return new FleekSdk({ accessTokenService });
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

// Refactored Upload Function
export const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided' });
  }

  const filePath = req.file.path;
  try {
    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath);
    const fleekSdk = initFleekSdk();

    // Upload file to Fleek Storage (IPFS)
    const result = await fleekSdk.storage().uploadFile({
      file: {
        name: req.file.originalname,
        stream: () => {
          const readableStream = new ReadableStream({
            start(controller) {
              controller.enqueue(Buffer.from(fileBuffer));
              controller.close();
            }
          });
          return readableStream;
        }
      },
      onUploadProgress: ({ loadedSize, totalSize }) => {
        console.log(`Upload progress: ${loadedSize}/${totalSize} bytes (${Math.round(loadedSize / totalSize * 100)}%)`);
      }
    });

    const cid = result.pin.cid;
    const hashedCid = SHA256(cid).toString();

    // Add CID hash to blockchain and mine block
    SynoChain.addTransaction(hashedCid);
    SynoChain.minePendingTransactions();

    await unlinkAsync(filePath);

    return res.status(200).json({
      success: true,
      message: 'File uploaded to IPFS and Blockchain successfully',
      cid: cid,
      hashedCid,
      ipfsUrl: `https://ipfs.io/ipfs/${cid}`,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

  } catch (error) {
    console.error('IPFS upload error:', error);
    if (req.file && req.file.path) {
      await unlinkAsync(req.file.path).catch(cleanupError => console.error('Error cleaning up file:', cleanupError));
    }
    return res.status(500).json({ success: false, message: `IPFS upload failed: ${error.message}` });
  }
};
