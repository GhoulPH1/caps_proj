import crypto from 'crypto-js';
const { SHA256 } = crypto;
import { MerkleTree } from "merkletreejs";
import fs from 'fs/promises';
import path from 'path';

const BLOCKCHAIN_FILE = path.join(process.cwd(), 'blockchain.json');
const DIFFICULTY = 2; // Moved to constant

class Block {
    constructor(index, timestamp, transactions, previousHash = '', hash = '', nonce = 0, merkleRoot = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.merkleRoot = merkleRoot || this.calculateMerkleRoot();
        this.hash = hash || this.calculateHash();
        this.nonce = nonce;
    }

    calculateHash() {
        // Concatenate with template literals for better performance
        return SHA256(
            `${this.index}${this.previousHash}${this.timestamp}${this.merkleRoot}${this.nonce}`
        ).toString();
    }

    calculateMerkleRoot() {
        if (!this.transactions.length) return '';
        const leaves = this.transactions.map(tx => SHA256(tx).toString());
        const tree = new MerkleTree(leaves, SHA256);
        return tree.getRoot().toString('hex');
    }

    mineBlock(difficulty) {
        const target = '0'.repeat(difficulty);
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`Block mined: ${this.hash}`);
    }

    // Static factory pattern for cleaner instantiation
    static fromData(data) {
        return new Block(
            data.index,
            data.timestamp,
            data.transactions,
            data.previousHash,
            data.hash,
            data.nonce,
            data.merkleRoot
        );
    }
}

class Blockchain {
    constructor() {
        this.chain = [];
        this.difficulty = DIFFICULTY;
        this.pendingTransactions = [];
        this.initialized = this.loadBlockchain();
    }

    createGenesisBlock() {
        return new Block(0, "01/01/2020", ["Genesis Block"], "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addTransaction(hashedCid) {
        this.pendingTransactions.push(hashedCid);
        return this; // Enable method chaining
    }

    async minePendingTransactions() {
        const block = new Block(
            this.chain.length,
            new Date().toISOString(),
            this.pendingTransactions,
            this.getLatestBlock().hash
        );

        block.mineBlock(this.difficulty);

        this.chain.push(block);
        this.pendingTransactions = [];

        await this.saveBlockchain();
        return block; // Return the mined block for potential usage
    }

    isChainValid() {
        return this.chain.slice(1).every((currentBlock, i) => {
            const previousBlock = this.chain[i];
            return (
                currentBlock.hash === currentBlock.calculateHash() &&
                currentBlock.previousHash === previousBlock.hash
            );
        });
    }

    getBlockContainingHash(hash) {
        return this.chain.find(block => block.transactions.includes(hash)) || null;
    }

    async saveBlockchain() {
        try {
            const data = JSON.stringify(this.chain, null, 2);
            await fs.writeFile(BLOCKCHAIN_FILE, data);
            console.log('[Blockchain] Blockchain saved successfully!');
        } catch (error) {
            console.error('[Blockchain] Failed to save blockchain:', error);
            throw error; // Propagate error for better error handling
        }
    }

    async loadBlockchain() {
        try {
            try {
                const rawData = await fs.readFile(BLOCKCHAIN_FILE);
                const chainData = JSON.parse(rawData);
                this.chain = chainData.map(blockData => Block.fromData(blockData));
                console.log('[Blockchain] Blockchain loaded from disk.');
            } catch (error) {
                if (error.code === 'ENOENT') {
                    this.chain = [this.createGenesisBlock()];
                    await this.saveBlockchain();
                    console.log('[Blockchain] Genesis block created.');
                } else {
                    throw error;
                }
            }
            return true;
        } catch (error) {
            console.error('[Blockchain] Failed to load blockchain:', error);
            this.chain = [this.createGenesisBlock()];
            return false;
        }
    }

    // New utility methods
    getChainLength() {
        return this.chain.length;
    }
    
    getPendingTransactionsCount() {
        return this.pendingTransactions.length;
    }
}

// Export as singleton
export const SynoChain = new Blockchain();