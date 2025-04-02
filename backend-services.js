// backend/src/services/encryption/encryption.js
const crypto = require('crypto');

// AES encryption
exports.encryptData = (data, key = null) => {
  // Generate a random encryption key if not provided
  const encryptionKey = key || crypto.randomBytes(32).toString('hex');
  
  // Convert data to string if it's an object
  const dataString = typeof data === 'object' ? JSON.stringify(data) : data.toString();
  
  // Generate a random IV
  const iv = crypto.randomBytes(16);
  
  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
  
  // Encrypt the data
  let encrypted = cipher.update(dataString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return the encrypted data with IV and key
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    key: encryptionKey
  };
};

exports.decryptData = (encryptedPackage) => {
  const { iv, encryptedData, key } = encryptedPackage;
  
  // Create decipher
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc', 
    Buffer.from(key, 'hex'), 
    Buffer.from(iv, 'hex')
  );
  
  // Decrypt the data
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  // Try to parse as JSON if possible
  try {
    return JSON.parse(decrypted);
  } catch (e) {
    // Return as string if not valid JSON
    return decrypted;
  }
};

// backend/src/services/storage/walrus.js
const axios = require('axios');
const config = require('../../config');

exports.storeToWalrus = async (data, options = {}) => {
  try {
    const walrusEndpoint = config.walrus.endpoint;
    const walrusApiKey = config.walrus.apiKey;
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${walrusApiKey}`
    };
    
    // Add enhanced security if requested
    const requestOptions = { ...options };
    
    // Make request to Walrus
    const response = await axios.post(
      `${walrusEndpoint}/store`, 
      { data, options: requestOptions },
      { headers }
    );
    
    // Return the reference ID
    return response.data.ref;
  } catch (error) {
    console.error('Walrus storage error:', error);
    throw new Error('Failed to store data to Walrus');
  }
};

exports.retrieveFromWalrus = async (ref) => {
  try {
    const walrusEndpoint = config.walrus.endpoint;
    const walrusApiKey = config.walrus.apiKey;
    
    // Prepare headers
    const headers = {
      'Authorization': `Bearer ${walrusApiKey}`
    };
    
    // Make request to Walrus
    const response = await axios.get(
      `${walrusEndpoint}/retrieve/${ref}`,
      { headers }
    );
    
    // Return the data
    return response.data.data;
  } catch (error) {
    console.error('Walrus retrieval error:', error);
    throw new Error('Failed to retrieve data from Walrus');
  }
};

// backend/src/services/storage/bpfs.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const config = require('../../config');

exports.storeFileToBPFS = async (filePath) => {
  try {
    const bpfsEndpoint = config.bpfs.endpoint;
    const bpfsApiKey = config.bpfs.apiKey;
    
    // Prepare form data
    const formData = new FormData();
    
    // Check if filePath is a path to a file or data
    if (fs.existsSync(filePath)) {
      // It's a file path
      formData.append('file', fs.createReadStream(filePath));
    } else {
      // It's data
      formData.append('file', Buffer.from(filePath), {
        filename: 'data.json',
        contentType: 'application/json',
      });
    }
    
    // Prepare headers
    const headers = {
      ...formData.getHeaders(),
      'Authorization': `Bearer ${bpfsApiKey}`
    };
    
    // Make request to BPFS
    const response = await axios.post(
      `${bpfsEndpoint}/upload`,
      formData,
      { headers }
    );
    
    // Return the file hash
    return response.data.hash;
  } catch (error) {
    console.error('BPFS storage error:', error);
    throw new Error('Failed to store file to BPFS');
  }
};

exports.retrieveFromBPFS = async (hash) => {
  try {
    const bpfsEndpoint = config.bpfs.endpoint;
    const bpfsApiKey = config.bpfs.apiKey;
    
    // Prepare headers
    const headers = {
      'Authorization': `Bearer ${bpfs