// frontend/src/services/api/identity.js
import axios from 'axios';
import { API_BASE_URL } from '../../config';

export const createIdentity = async (formData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/identity/create`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create identity');
  }
};

// frontend/src/services/api/data.js
import axios from 'axios';
import { API_BASE_URL } from '../../config';

export const uploadData = async (formData, onProgress) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/data/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: onProgress
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to upload data');
  }
};

// frontend/src/services/encryption/fileEncryption.js
import CryptoJS from 'crypto-js';

export const encryptFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const fileData = event.target.result;
        
        // Generate a random key for this specific file
        const encryptionKey = CryptoJS.lib.WordArray.random(16).toString();
        
        // Encrypt the file data
        const encryptedData = CryptoJS.AES.encrypt(fileData, encryptionKey).toString();
        
        // Create a JSON object with the encrypted data and the encryption key
        const encryptedPackage = {
          encryptedData: encryptedData,
          encryptionKey: encryptionKey,
          fileName: file.name,
          fileType: file.type,
          originalSize: file.size
        };
        
        // Convert to JSON string and then to Blob
        const packageString = JSON.stringify(encryptedPackage);
        const encryptedBlob = new Blob([packageString], { type: 'application/json' });
        
        // Create a File object
        const encryptedFile = new File([encryptedBlob], `${file.name}.encrypted`, {
          type: 'application/json',
          lastModified: new Date().getTime()
        });
        
        resolve(encryptedFile);
      } catch (error) {
        reject(new Error('File encryption failed'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    // Read the file as a data URL
    reader.readAsDataURL(file);
  });
};
