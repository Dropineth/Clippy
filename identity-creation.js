// frontend/src/pages/IdentityCreation.jsx
import React, { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { createIdentity } from '../services/api/identity';
import WalletConnect from '../components/WalletConnect/WalletConnect';

const IdentityCreation = () => {
  const { account, connected, signMessage } = useWallet();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profileImage: null,
    bio: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      profileImage: e.target.files[0]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!connected) {
      setError('Please connect your wallet first');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Sign a message to confirm ownership
      const message = `Creating identity for ${account.address} with name: ${formData.name}`;
      const signatureResponse = await signMessage({
        message,
        nonce: Date.now().toString(),
      });
      
      // Create form data for file upload
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('bio', formData.bio);
      data.append('address', account.address);
      data.append('signature', signatureResponse.signature);
      
      if (formData.profileImage) {
        data.append('profileImage', formData.profileImage);
      }
      
      // Submit to API
      const response = await createIdentity(data);
      setSuccess('Identity created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        profileImage: null,
        bio: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to create identity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="identity-creation-container">
      <h1>Create Your Digital Identity</h1>
      
      {!connected && <WalletConnect />}
      
      {connected && (
        <form onSubmit={handleSubmit} className="identity-form">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="profileImage">Profile Image</label>
            <input
              type="file"
              id="profileImage"
              name="profileImage"
              onChange={handleFileChange}
              accept="image/*"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows="4"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <button type="submit" disabled={isSubmitting} className="submit-button">
            {isSubmitting ? 'Creating...' : 'Create Identity'}
          </button>
        </form>
      )}
    </div>
  );
};

export default IdentityCreation;
