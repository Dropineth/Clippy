// backend/src/controllers/identityController.js
const fs = require('fs');
const path = require('path');
const { saveIdentityOnChain } = require('../services/blockchain/identity');
const { encryptData } = require('../services/encryption/encryption');
const { storeToWalrus } = require('../services/storage/walrus');
const { storeFileToBPFS } = require('../services/storage/bpfs');
const Identity = require('../models/identity');

exports.createIdentity = async (req, res) => {
  try {
    const { name, email, bio, address } = req.body;
    const profileImage = req.file;
    
    // Validate required fields
    if (!name || !address) {
      return res.status(400).json({ message: 'Name and wallet address are required' });
    }
    
    // Check if identity already exists
    const existingIdentity = await Identity.findOne({ address });
    if (existingIdentity) {
      return res.status(400).json({ message: 'Identity already exists for this address' });
    }
    
    // Process profile image if provided
    let imageHash = null;
    if (profileImage) {
      // Store image to BPFS
      imageHash = await storeFileToBPFS(profileImage.path);
      
      // Clean up the uploaded file
      fs.unlinkSync(profileImage.path);
    }
    
    // Encrypt sensitive data
    const encryptedData = encryptData({
      email,
      bio,
      createdAt: new Date().toISOString()
    });
    
    // Store encrypted data to Walrus
    const walrusRef = await storeToWalrus(encryptedData);
    
    // Create identity record
    const identity = new Identity({
      name,
      address,
      profileImageHash: imageHash,
      walrusRef,
      createdAt: new Date()
    });
    
    await identity.save();
    
    // Store identity on blockchain
    const txHash = await saveIdentityOnChain(address, name, walrusRef);
    
    // Update identity with transaction hash
    identity.transactionHash = txHash;
    await identity.save();
    
    res.status(201).json({
      message: 'Identity created successfully',
      identity: {
        name,
        address,
        profileImageHash: imageHash,
        transactionHash: txHash
      }
    });
  } catch (error) {
    console.error('Identity creation error:', error);
    res.status(500).json({ message: 'Failed to create identity' });
  }
};

exports.getIdentity = async (req, res) => {
  try {
    const { address } = req.params;
    
    const identity = await Identity.findOne({ address });
    if (!identity) {
      return res.status(404).json({ message: 'Identity not found' });
    }
    
    res.status(200).json({ identity });
  } catch (error) {
    console.error('Get identity error:', error);
    res.status(500).json({ message: 'Failed to retrieve identity' });
  }
};

// backend/src/controllers/dataController.js
const fs = require('fs');
const { storeFileToBPFS } = require('../services/storage/bpfs');
const { storeToWalrus } = require('../services/storage/walrus');
const { prepareDataForAI } = require('../services/ai/dataPreprocessing');
const Data = require('../models/data');

exports.uploadData = async (req, res) => {
  try {
    const { address, fileName, fileType } = req.body;
    const file = req.file;
    
    if (!file || !address) {
      return res.status(400).json({ message: 'File and wallet address are required' });
    }
    
    // Read the encrypted file (which is in JSON format)
    const fileData = fs.readFileSync(file.path, 'utf8');
    let encryptedPackage;
    
    try {
      encryptedPackage = JSON.parse(fileData);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid encrypted file format' });
    }
    
    // Store the encrypted data to Walrus
    const walrusRef = await storeToWalrus({
      encryptedData: encryptedPackage.encryptedData,
      fileType: encryptedPackage.fileType || fileType,
      fileName: encryptedPackage.fileName || fileName,
      originalSize: encryptedPackage.originalSize
    });
    
    // Store encryption key separately with additional security
    const secureKeyRef = await storeToWalrus({
      key: encryptedPackage.encryptionKey,
      address,
      fileRef: walrusRef
    }, { enhanced: true });
    
    // Store file metadata to BPFS for efficient retrieval
    const metadataHash = await storeFileToBPFS(JSON.stringify({
      fileName: encryptedPackage.fileName || fileName,
      fileType: encryptedPackage.fileType || fileType,
      walrusRef,
      timestamp: new Date().toISOString()
    }));
    
    // Clean up the uploaded file
    fs.unlinkSync(file.path);
    
    // Prepare data for AI processing (async)
    prepareDataForAI(walrusRef, secureKeyRef).catch(console.error);
    
    // Save data reference
    const dataRecord = new Data({
      address,
      fileName: encryptedPackage.fileName || fileName,
      fileType: encryptedPackage.fileType || fileType,
      walrusRef,
      keyRef: secureKeyRef,
      metadataHash,
      createdAt: new Date()
    });
    
    await dataRecord.save();
    
    res.status(201).json({
      message: 'Data uploaded successfully',
      dataRef: walrusRef,
      metadataHash
    });
  } catch (error) {
    console.error('Data upload error:', error);
    res.status(500).json({ message: 'Failed to upload data' });
  }
};

exports.getUserData = async (req, res) => {
  try {
    const { address } = req.params;
    
    const data = await Data.find({ address }).sort({ createdAt: -1 });
    
    res.status(200).json({ data });
  } catch (error) {
    console.error('Get user data error:', error);
    res.status(500).json({ message: 'Failed to retrieve user data' });
  }
};
