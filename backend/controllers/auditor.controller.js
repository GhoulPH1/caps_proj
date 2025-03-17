import { SynoChain } from '../blockchain.js';
import fs from 'fs';
import { promisify } from 'util';
import crypto from 'crypto-js';
const { SHA256 } = crypto;
import ipfsOnlyHash from 'ipfs-only-hash';


const unlinkAsync = promisify(fs.unlink);

export const verifyFileIntegrity = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided for integrity check' });
    }

    const filePath = req.file.path;

    try {
      const fileBuffer = fs.readFileSync(filePath);

      // Calculate IPFS CID locally without uploading
      const cid = await ipfsOnlyHash.of(fileBuffer, { cidVersion: 1, rawLeaves: true});

      const hashedCid = SHA256(cid).toString();

      console.log(`Locally generated CID: ${cid}`);
      console.log(`Hashed CID: ${hashedCid}`);

      // Search blockchain
      const block = SynoChain.chain.find((blk) => 
        blk.transactions.some(tx => tx === hashedCid)
      );


      const verifyCID = await ipfsOnlyHash.of(fileBuffer, { cidVersion: 1 });
      console.log('Verify-side CID:', verifyCID);


    
      await unlinkAsync(filePath);

      if (block) {
        return res.status(200).json({
          success: true,
          message: 'File integrity verified! CID exists in blockchain.',
          cid: cid,
          blockHash: block.hash,
          blockIndex: block.index
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Integrity check failed. No matching CID found in blockchain.',
          cid: cid
        });
      }
    } catch (error) {
      await unlinkAsync(filePath);
      console.error('Error during integrity check:', error);
      return res.status(500).json({
        success: false,
        message: `Integrity check failed: ${error.message}`
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
