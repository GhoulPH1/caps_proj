import crypto from 'crypto-js';
const { SHA256 } = crypto;
import { MerkleTree } from "merkletreejs";
import fs from 'fs';
import path from 'path';

const BLOCKCHAIN_FILE = path.join(process.cwd(), 'blockchain.json');

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
        return SHA256(
            this.index +
            this.previousHash +
            this.timestamp +
            this.merkleRoot +
            this.nonce
        ).toString();
    }

    calculateMerkleRoot() {
        if (this.transactions.length === 0) return '';
        const leaves = this.transactions.map(tx => SHA256(tx).toString());
        const tree = new MerkleTree(leaves, SHA256);
        return tree.getRoot().toString('hex');
    }

    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`Block mined: ${this.hash}`);
    }

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
        this.difficulty = 2;
        this.pendingTransactions = [];
        this.loadBlockchain();
    }

    createGenesisBlock() {
        return new Block(0, "01/01/2020", ["Genesis Block"], "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addTransaction(hashedCid) {
        this.pendingTransactions.push(hashedCid);
    }

    minePendingTransactions() {
        const block = new Block(
            this.chain.length,
            new Date().toISOString(),
            this.pendingTransactions,
            this.getLatestBlock().hash
        );

        block.mineBlock(this.difficulty);

        this.chain.push(block);
        this.pendingTransactions = [];

        this.saveBlockchain();
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }

    getBlockContainingHash(hash) {
        for (const block of this.chain) {
            if (block.transactions.includes(hash)) {
                return block;
            }
        }
        return null;
    }

    saveBlockchain() {
        try {
            const data = JSON.stringify(this.chain, null, 2);
            fs.writeFileSync(BLOCKCHAIN_FILE, data);
            console.log('[Blockchain] Blockchain saved successfully!');
        } catch (error) {
            console.error('[Blockchain] Failed to save blockchain:', error);
        }
    }

    loadBlockchain() {
        try {
            if (fs.existsSync(BLOCKCHAIN_FILE)) {
                const rawData = fs.readFileSync(BLOCKCHAIN_FILE);
                const chainData = JSON.parse(rawData);
                this.chain = chainData.map(blockData => Block.fromData(blockData));
                console.log('[Blockchain] Blockchain loaded from disk.');
            } else {
                this.chain = [this.createGenesisBlock()];
                this.saveBlockchain();
                console.log('[Blockchain] Genesis block created.');
            }
        } catch (error) {
            console.error('[Blockchain] Failed to load blockchain:', error);
            this.chain = [this.createGenesisBlock()];
        }
    }
}

export const SynoChain = new Blockchain();
