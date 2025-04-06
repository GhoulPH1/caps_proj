import { FleekSdk, PersonalAccessTokenService } from '@fleek-platform/sdk/node';
import multer from 'multer';
import { SynoChain } from '../blockchain.js';
import crypto from 'crypto-js';
import { ReadableStream } from 'stream/web';
import { createHash } from 'crypto';
import Redis from 'ioredis';

const { SHA256 } = crypto;

// Configure multer for in-memory file storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Redis client for caching
let redisClient;
const CACHE_TTL = 60 * 5; // 5 minutes
let CACHE_ENABLED = false;

try {
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);
    CACHE_ENABLED = true;
    console.log('Redis cache initialized');
  }
} catch (error) {
  console.warn('Redis cache not available:', error.message);
}

// Storage Service class using Singleton pattern
export class StorageService {
  static instance;
  
  constructor() {
    this.sdkInstance = null;
  }
  
  static getInstance() {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Get or initialize SDK
  getSdk() {
    if (!this.sdkInstance) {
      if (!process.env.FLEEK_PERSONAL_ACCESS_TOKEN || !process.env.FLEEK_PROJECT_ID) {
        throw new Error('Fleek credentials missing. Set FLEEK_PERSONAL_ACCESS_TOKEN and FLEEK_PROJECT_ID in .env');
      }
      
      const accessTokenService = new PersonalAccessTokenService({
        personalAccessToken: process.env.FLEEK_PERSONAL_ACCESS_TOKEN,
        projectId: process.env.FLEEK_PROJECT_ID,
      });
      
      this.sdkInstance = new FleekSdk({ accessTokenService });
    }
    
    return this.sdkInstance;
  }

  // Stream creation utility
  createReadableStream(buffer) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(Buffer.from(buffer));
        controller.close();
      }
    });
  }

  // File upload with progress tracking
  async uploadFile(fileBuffer, fileName, userId, userEmail, isTemporary = false) {
    const fleekSdk = this.getSdk();
    
    // Calculate hash for verification
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
    
    // Upload to IPFS with user metadata
    const result = await fleekSdk.storage().uploadFile({
      file: {
        name: fileName,
        stream: () => this.createReadableStream(fileBuffer)
      },
      metadata: {
        userId: userId.toString(),
        userEmail,
        uploadedAt: new Date().toISOString(),
        fileHash,
        temporary: isTemporary || false,
        verificationCheck: isTemporary || false
      },
      onUploadProgress: ({ loadedSize, totalSize }) => {
        console.log(`Upload progress: ${Math.round(loadedSize / totalSize * 100)}%`);
      }
    });

    return { result, fileHash };
  }
  
  // Get user files with caching
  async listFiles(userId) {
    const cacheKey = `files:${userId}`;
    
    // Try to get from cache first
    if (CACHE_ENABLED) {
      try {
        const cachedFiles = await redisClient.get(cacheKey);
        if (cachedFiles) {
          return JSON.parse(cachedFiles);
        }
      } catch (error) {
        console.warn('Cache retrieval error:', error.message);
      }
    }
    
    // Fetch from Fleek
    const fleekSdk = this.getSdk();
    const allFiles = await fleekSdk.storage().list();
    const userFiles = allFiles.filter(file => 
      file.metadata && file.metadata.userId === userId.toString()
    );
    
    // Store in cache for future requests
    if (CACHE_ENABLED) {
      try {
        await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(userFiles));
      } catch (error) {
        console.warn('Cache storage error:', error.message);
      }
    }
    
    return userFiles;
  }
  
  // Get file by CID
  async getFile(cid) {
    const fleekSdk = this.getSdk();
    return await fleekSdk.storage().get({ cid });
  }
  
  // Get files by filename
  async getFilesByFilename(filename, extension, userId) {
    const fleekSdk = this.getSdk();
    const result = await fleekSdk.storage().getByFilename({ filename, extension });
    
    return result.filter(file => 
      file.metadata && file.metadata.userId === userId.toString()
    );
  }
  
  // Delete file
  async deleteFile(cid) {
    const fleekSdk = this.getSdk();
    return await fleekSdk.storage().delete({ cid });
  }
}

// Helper functions
const requireAuth = (req) => {
  if (!req.user || !req.user._id) {
    throw { status: 401, message: 'Authentication required' };
  }
  return req.user;
};

const handleError = (res, error) => {
  console.error('Storage operation error:', error);
  const status = error.status || 500;
  const message = error.message || 'Internal server error';
  return res.status(status).json({ success: false, message });
};

const recordToBlockchain = (data) => {
  try {
    SynoChain.addTransaction(data);
    SynoChain.minePendingTransactions();
    return true;
  } catch (error) {
    console.error('Blockchain recording error:', error);
    return false;
  }
};

// Cache invalidation helper
const invalidateUserCache = async (userId) => {
  if (CACHE_ENABLED) {
    try {
      await redisClient.del(`files:${userId}`);
    } catch (error) {
      console.warn('Cache invalidation error:', error.message);
    }
  }
};

// Get service instance
export const storageService = StorageService.getInstance();

// Controller functions
export const uploadFile = async (req, res) => {
  try {
    const user = requireAuth(req);
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    console.log(`Received file: ${req.file.originalname} from user: ${user._id}`);
    
    const fileBuffer = req.file.buffer;
    const { result, fileHash } = await storageService.uploadFile(
      fileBuffer, 
      req.file.originalname, 
      user._id, 
      user.email
    );

    const cid = result.pin.cid;
    const hashedCid = SHA256(cid).toString();
    
    // Record transaction in blockchain
    const blockchainRecorded = recordToBlockchain({
      cid: hashedCid,
      userId: user._id.toString(),
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileHash,
      operation: 'UPLOAD',
      timestamp: Date.now()
    });

    // Invalidate cache
    await invalidateUserCache(user._id);

    return res.status(200).json({
      success: true,
      message: 'File uploaded to IPFS and Blockchain successfully',
      cid,
      hashedCid,
      ipfsUrl: `https://ipfs.io/ipfs/${cid}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      blockchainRecorded
    });

  } catch (error) {
    return handleError(res, error);
  }
};

export const listFiles = async (req, res) => {
  try {
    const user = requireAuth(req);
    
    // Get files from service (will use cache if available)
    const userFiles = await storageService.listFiles(user._id);
    
    return res.status(200).json({
      success: true,
      message: 'Files retrieved successfully',
      files: userFiles
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getFileByCid = async (req, res) => {
  try {
    const user = requireAuth(req);
    const { cid } = req.params;
    
    if (!cid) {
      return res.status(400).json({ success: false, message: 'CID parameter is required' });
    }

    // Get file details
    const result = await storageService.getFile(cid);
    
    // Verify ownership
    if (result.metadata && result.metadata.userId !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this file'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'File retrieved successfully',
      file: result,
      ipfsUrl: `https://ipfs.io/ipfs/${cid}`
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getFilesByFilename = async (req, res) => {
  try {
    const user = requireAuth(req);
    const { filename, extension } = req.params;
    
    if (!filename || !extension) {
      return res.status(400).json({ 
        success: false, 
        message: 'Filename and extension parameters are required' 
      });
    }

    const userFiles = await storageService.getFilesByFilename(filename, extension, user._id);
    
    if (!userFiles.length) {
      return res.status(404).json({
        success: false,
        message: `No files found with filename ${filename} and extension ${extension}`
      });
    }
    
    const filesWithUrls = userFiles.map(file => ({
      ...file,
      ipfsUrl: file.cid ? `https://ipfs.io/ipfs/${file.cid}` : null
    }));
    
    return res.status(200).json({
      success: true,
      message: 'Files retrieved successfully',
      files: filesWithUrls,
      count: filesWithUrls.length
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteFile = async (req, res) => {
  try {
    const user = requireAuth(req);
    const { cid } = req.params;

    if (!cid) {
      return res.status(400).json({ success: false, message: 'CID parameter is required' });
    }

    // Verify ownership before deletion
    const file = await storageService.getFile(cid);
    if (!file.metadata || file.metadata.userId !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this file'
      });
    }

    // Proceed with deletion
    await storageService.deleteFile(cid);

    // Record deletion in blockchain
    const hashedCid = SHA256(cid).toString();
    const blockchainRecorded = recordToBlockchain({
      cid: hashedCid,
      userId: user._id.toString(),
      fileName: file.name || 'Unknown',
      fileSize: file.size || 0,
      fileHash: file.metadata?.fileHash || 'N/A',
      operation: 'DELETE',
      timestamp: Date.now()
    });

    // Invalidate cache
    await invalidateUserCache(user._id);

    return res.status(200).json({
      success: true,
      message: 'File deleted from IPFS and recorded on blockchain',
      cid,
      hashedCid,
      blockchainRecorded
    });

  } catch (error) {
    return handleError(res, error);
  }
};
