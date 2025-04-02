# ai/src/storage/walrus_client.py
import os
import json
import requests
import base64
from typing import Dict, Any, Optional, Union, List

class WalrusStorageClient:
    """
    Client for interacting with Walrus storage system
    """
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def store(self, data: Any, options: Optional[Dict[str, Any]] = None) -> str:
        """
        Store data to Walrus storage
        
        Args:
            data: Data to store
            options: Storage options
            
        Returns:
            str: Reference ID for the stored data
        """
        payload = {
            "data": data
        }
        
        if options:
            payload["options"] = options
            
        response = requests.post(
            f"{self.api_url}/store",
            headers=self.headers,
            json=payload
        )
        
        response.raise_for_status()
        return response.json()["ref"]
    
    def retrieve(self, ref: str) -> Any:
        """
        Retrieve data from Walrus storage
        
        Args:
            ref: Reference ID for the data
            
        Returns:
            The retrieved data
        """
        response = requests.get(
            f"{self.api_url}/retrieve/{ref}",
            headers=self.headers
        )
        
        response.raise_for_status()
        return response.json()["data"]
    
    def delete(self, ref: str) -> bool:
        """
        Delete data from Walrus storage
        
        Args:
            ref: Reference ID for the data
            
        Returns:
            bool: True if successful
        """
        response = requests.delete(
            f"{self.api_url}/delete/{ref}",
            headers=self.headers
        )
        
        response.raise_for_status()
        return True
    
    def list_references(self, prefix: Optional[str] = None) -> List[str]:
        """
        List available references in storage
        
        Args:
            prefix: Optional prefix to filter references
            
        Returns:
            List of reference IDs
        """
        params = {}
        if prefix:
            params["prefix"] = prefix
            
        response = requests.get(
            f"{self.api_url}/list",
            headers=self.headers,
            params=params
        )
        
        response.raise_for_status()
        return response.json()["refs"]

# ai/src/storage/data_manager.py
import os
import json
import numpy as np
from typing import Dict, List, Any, Union, Optional, Tuple
from .walrus_client import WalrusStorageClient

class DataManager:
    """
    Manages data storage and retrieval for AI processing
    """
    def __init__(self, walrus_client: WalrusStorageClient):
        self.walrus = walrus_client
        self.cache = {}  # Simple memory cache
        
    def store_processed_data(
        self, 
        data: Union[np.ndarray, Dict[str, Any]], 
        user_address: str,
        metadata: Optional[Dict[str, Any]] = None,
        original_ref: Optional[str] = None
    ) -> str:
        """
        Store processed data with metadata
        
        Args:
            data: Processed data (numpy array or dictionary)
            user_address: User's wallet address
            metadata: Additional metadata
            original_ref: Reference to original data
            
        Returns:
            str: Reference ID for the stored data
        """
        # Convert numpy arrays to lists
        if isinstance(data, np.ndarray):
            data_serializable = data.tolist