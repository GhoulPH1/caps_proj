import { SynoChain } from '../blockchain.js';
import { StorageService } from './file.controller.js';
import crypto from 'crypto-js';
import { ReadableStream } from 'stream/web';

const { SHA256 } = crypto;

// Get singleton StorageService instance
const storageService = StorageService.getInstance();

export const verifyFileIntegrity = async (req, res) => {
  try {
    // Check authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided for integrity check' });
    }

    const { originalCid } = req.body;
    const fileBuffer = req.file.buffer;
    const userId = req.user._id.toString();
    const userEmail = req.user.email;

    // Verify ownership if originalCid is provided
    if (originalCid) {
      try {
        const originalFile = await storageService.getFile(originalCid);
        
        if (originalFile.metadata && originalFile.metadata.userId !== userId) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to verify this file'
          });
        }
      } catch (error) {
        console.log(`Note: Could not verify ownership of file with CID ${originalCid}: ${error.message}`);
      }
    }

    // Upload file temporarily to get its CID
    const result = await storageService.uploadFile(
      fileBuffer,
      req.file.originalname,
      userId,
      userEmail,
      true // temporary flag
    );

    const calculatedCid = result.result.pin.cid;
    const hashedCalculatedCid = SHA256(calculatedCid).toString();

    // Clean up temporary file (using Promise to avoid blocking)
    const cleanupPromise = storageService.deleteFile(calculatedCid)
      .then(() => console.log('Temporary verification file deleted'))
      .catch(error => console.error('Error cleaning up temporary file:', error));

    // If verifying against a specific CID
    if (originalCid) {
      const hashedOriginalCid = SHA256(originalCid).toString();
      const cidsMatch = calculatedCid === originalCid;
      
      // Search blockchain for the original CID hash
      const blockchainRecord = findInBlockchain(hashedOriginalCid, userId);
      
      // Wait for cleanup to finish
      await cleanupPromise;
      
      return res.status(200).json({
        success: cidsMatch,
        message: cidsMatch 
          ? 'File integrity verified! Content matches the original.' 
          : 'Integrity check failed. Content does not match the original.',
        originalCid,
        calculatedCid,
        blockchainVerified: !!blockchainRecord,
        blockchainData: blockchainRecord ? {
          blockHash: blockchainRecord.hash,
          blockIndex: blockchainRecord.index
        } : null
      });
    } else {
      // Search blockchain for this file's CID
      const blockchainRecord = findInBlockchain(hashedCalculatedCid, userId);
      
      // Wait for cleanup to finish
      await cleanupPromise;

      if (blockchainRecord) {
        return res.status(200).json({
          success: true,
          message: 'File integrity verified! CID exists in blockchain.',
          cid: calculatedCid,
          blockHash: blockchainRecord.hash,
          blockIndex: blockchainRecord.index
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Integrity check failed. No matching CID found in blockchain.',
          cid: calculatedCid
        });
      }
    }
  } catch (error) {
    console.error('Error during integrity check:', error);
    return res.status(500).json({
      success: false,
      message: `Integrity check failed: ${error.message}`
    });
  }
};

// Helper function to find transaction in blockchain
function findInBlockchain(cidHash, userId) {
  return SynoChain.chain.find((block) => 
    block.transactions.some(tx => {
      // Support both old and new transaction formats
      if (typeof tx === 'string') {
        return tx === cidHash;
      } else {
        return tx.cid === cidHash && tx.userId === userId;
      }
    })
  );
}