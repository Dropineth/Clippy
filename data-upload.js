// frontend/src/components/DataUpload/DataUpload.jsx
import React, { useState, useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useDropzone } from 'react-dropzone';
import { uploadData } from '../../services/api/data';
import { encryptFile } from '../../services/encryption/fileEncryption';

const DataUpload = () => {
  const { account, connected, signMessage } = useWallet();
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [encrypting, setEncrypting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onDrop = useCallback(acceptedFiles => {
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': [],
      'application/pdf': [],
      'text/plain': [],
      'application/json': []
    }
  });

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!connected) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (files.length === 0) {
      setError('Please select files to upload');
      return;
    }
    
    setError('');
    setSuccess('');
    setEncrypting(true);
    
    try {
      // Sign a message to confirm upload authorization
      const message = `Uploading data from ${account.address}`;
      const signatureResponse = await signMessage({
        message,
        nonce: Date.now().toString(),
      });
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        // Encrypt the file
        const encryptedFile = await encryptFile(file);
        
        // Create form data
        const formData = new FormData();
        formData.append('file', encryptedFile);
        formData.append('fileName', file.name);
        formData.append('fileType', file.type);
        formData.append('address', account.address);
        formData.append('signature', signatureResponse.signature);
        
        // Upload with progress tracking
        await uploadData(formData, (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(prev => ({ ...prev, [file.name]: percentCompleted }));
        });
      }
      
      setSuccess('Files uploaded successfully!');
      setFiles([]);
      setUploadProgress({});
    } catch (err) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setEncrypting(false);
    }
  };

  return (
    <div className="data-upload-container">
      <h2>Upload Your Data</h2>
      
      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        <p>Drag & drop files here, or click to select files</p>
        <em>Supported formats: Images, PDF, TXT, JSON</em>
      </div>
      
      {files.length > 0 && (
        <div className="file-list">
          <h3>Selected Files</h3>
          <ul>
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                <span className="file-name">{file.name}</span>
                <span className="file-size">({(file.size / 1024).toFixed(2)} KB)</span>
                
                {uploadProgress[file.name] ? (
                  <div className="progress-bar">
                    <div 
                      className="progress" 
                      style={{ width: `${uploadProgress[file.name]}%` }}
                    />
                    <span>{uploadProgress[file.name]}%</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => removeFile(index)} 
                    className="remove-button"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <button 
        onClick={handleUpload} 
        disabled={!connected || files.length === 0 || encrypting} 
        className="upload-button"
      >
        {encrypting ? 'Processing...' : 'Upload Files'}
      </button>
    </div>
  );
};

export default DataUpload;
