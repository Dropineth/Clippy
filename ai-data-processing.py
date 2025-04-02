# ai/src/data_processing/data_processor.py
import os
import json
import numpy as np
import torch
from PIL import Image
from io import BytesIO
import base64
from typing import Dict, List, Union, Any, Tuple

class MultiModalDataProcessor:
    """
    Processes multiple types of data (text, images, structured data)
    for use with the AHIN model.
    """
    def __init__(
        self,
        image_size: Tuple[int, int] = (224, 224),
        max_text_length: int = 512,
        use_cuda: bool = True
    ):
        self.image_size = image_size
        self.max_text_length = max_text_length
        self.device = torch.device("cuda" if torch.cuda.is_available() and use_cuda else "cpu")
        
        # Load tokenizer and models (placeholders - would use actual models in production)
        self.text_encoder = self._load_text_encoder()
        self.image_encoder = self._load_image_encoder()
        self.feature_dim = 512  # Output dimension of encoders
    
    def _load_text_encoder(self):
        """Load text encoder model (placeholder)"""
        # In production, would load an actual model like BERT or similar
        print("Loading text encoder...")
        return None
    
    def _load_image_encoder(self):
        """Load image encoder model (placeholder)"""
        # In production, would load an actual model like ResNet or similar
        print("Loading image encoder...")
        return None
    
    def process_image(self, image_data: Union[str, bytes]) -> np.ndarray:
        """
        Process image data (either base64 string or raw bytes)
        """
        # Convert from base64 if needed
        if isinstance(image_data, str) and image_data.startswith('data:image'):
            # Extract the base64 part
            image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
        elif isinstance(image_data, str):
            # Assume already base64 encoded without prefix
            image_bytes = base64.b64decode(image_data)
        else:
            # Assume raw bytes
            image_bytes = image_data
            
        # Open image
        img = Image.open(BytesIO(image_bytes))
        
        # Resize and convert to RGB
        img = img.convert('RGB')
        img = img.resize(self.image_size)
        
        # Convert to numpy array
        img_array = np.array(img)
        
        # Normalize
        img_array = img_array / 255.0
        
        # Transpose for pytorch (H, W, C) -> (C, H, W)
        img_array = np.transpose(img_array, (2, 0, 1))
        
        return img_array
    
    def process_text(self, text: str) -> np.ndarray:
        """
        Process text data into embeddings
        """
        # Truncate if needed
        if len(text) > self.max_text_length:
            text = text[:self.max_text_length]
            
        # For now, we'll use a simple placeholder vectorization
        # In production, would use the actual text encoder
        
        # Simple character-level encoding as placeholder
        char_indices = [ord(c) % 256 for c in text]
        
        # Pad to max length
        if len(char_indices) < self.max_text_length:
            char_indices += [0] * (self.max_text_length - len(char_indices))
            
        # Convert to numpy array
        return np.array(char_indices, dtype=np.float32) / 256.0
    
    def process_json(self, json_data: Union[str, Dict]) -> np.ndarray:
        """
        Process JSON/structured data
        """
        # Parse JSON if string
        if isinstance(json_data, str):
            data = json.loads(json_data)
        else:
            data = json_data
            
        # Flatten JSON to key-value pairs
        flattened = self._flatten_json(data)
        
        # Convert to feature vector
        features = self._json_to_features(flattened)
        
        return features
    
    def _flatten_json(self, data: Any, prefix: str = '') -> Dict[str, Any]:
        """
        Flatten nested JSON structure
        """
        flattened = {}
        
        if isinstance(data, dict):
            for key, value in data.items():
                new_key = f"{prefix}.{key}" if prefix else key
                if isinstance(value, (dict, list)):
                    flattened.update(self._flatten_json(value, new_key))
                else:
                    flattened[new_key] = value
        elif isinstance(data, list):
            for i, item in enumerate(data):
                new_key = f"{prefix}[{i}]"
                if isinstance(item, (dict, list)):
                    flattened.update(self._flatten_json(item, new_key))
                else:
                    flattened[new_key] = item
        else:
            flattened[prefix] = data
            
        return flattened
    
    def _json_to_features(self, flattened: Dict[str, Any]) -> np.ndarray:
        """
        Convert flattened JSON to feature vector
        """
        # Simple hashing trick for feature vector
        features = np.zeros(self.feature_dim, dtype=np.float32)
        
        for key, value in flattened.items():
            # Hash the key to an index
            key_hash = hash(key) % self.feature_dim
            
            # Add value based on type
            if isinstance(value, (int, float)):
                # Numerical value
                features[key_hash] += float(value)
            elif isinstance(value, bool):
                # Boolean value
                features[key_hash] += 1.0 if value else -1.0
            elif isinstance(value, str):
                # String value - use length and simple hash
                features[key_hash] += len(value) * 0.01
                features[(key_hash + 1) % self.feature_dim] += sum(ord(c) for c in value[:10]) * 0.001
            
        # Normalize
        norm = np.linalg.norm(features)
        if norm > 0:
            features /= norm
            
        return features
    
    def process_file(self, file_data: bytes, file_type: str) -> np.ndarray:
        """
        Process file based on type
        """
        if 'image' in file_type:
            return self.process_image(file_data)
        elif 'json' in file_type:
            text_data = file_data.decode('utf-8')
            return self.process_json(text_data)
        elif 'text' in file_type:
            text_data = file_data.decode('utf-8')
            return self.process_text(text_data)
        else:
            # Default binary processing
            # Simple histogram of byte values
            byte_array = np.frombuffer(file_data, dtype=np.uint8)
            hist, _ = np.histogram(byte_array, bins=256, range=(0, 256))
            hist = hist.astype(np.float32)
            hist /= max(1, len(byte_array))
            
            # Pad to feature dimension
            if len(hist) < self.feature_dim:
                hist = np.pad(hist, (0, self.feature_dim - len(hist)))
            else:
                hist = hist[:self.feature_dim]
                
            return hist
    
    def combine_features(self, features_list: List[np.ndarray]) -> torch.Tensor:
        """
        Combine multiple feature arrays into a single tensor
        """
        # Convert to torch tensors
        tensor_list = [torch.from_numpy(f).float() for f in features_list]
        
        # Ensure all tensors have same dimensions by padding if needed
        padded_tensors = []
        for tensor in tensor_list:
            if len(tensor.shape) == 1:
                # Add sequence dimension for 1D tensors
                tensor = tensor.unsqueeze(0)
            padded_tensors.append(tensor)
            
        # Stack along sequence dimension
        combined = torch.cat(padded_tensors, dim=0)
        
        # Add batch dimension
        combined = combined.unsqueeze(0)
        
        # Move to device
        combined = combined.to(self.device)
        
        return combined
