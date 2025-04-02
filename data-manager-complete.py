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
        # Convert numpy arrays to lists for serialization
        if isinstance(data, np.ndarray):
            data_serializable = data.tolist()
        else:
            data_serializable = data
            
        # Prepare storage object
        storage_obj = {
            "data": data_serializable,
            "user_address": user_address,
            "timestamp": datetime.datetime.now().isoformat(),
            "metadata": metadata or {},
        }
        
        # Add reference to original data if provided
        if original_ref:
            storage_obj["original_ref"] = original_ref
            
        # Generate a unique reference ID
        ref_id = f"processed_{uuid.uuid4().hex}"
        
        # Store in Walrus
        self.walrus.store(ref_id, json.dumps(storage_obj))
        
        # Cache the reference for quick access
        self.cache[ref_id] = {
            "user_address": user_address,
            "timestamp": storage_obj["timestamp"]
        }
        
        return ref_id
        
    def retrieve_processed_data(self, ref_id: str, user_address: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve processed data by reference ID
        
        Args:
            ref_id: Reference ID for the data
            user_address: User's wallet address for verification
            
        Returns:
            Optional[Dict]: The data if found and authorized, None otherwise
        """
        # Check cache first
        if ref_id in self.cache and self.cache[ref_id]["user_address"] == user_address:
            # Get from Walrus
            data_str = self.walrus.retrieve(ref_id)
            if data_str:
                data_obj = json.loads(data_str)
                
                # Verify ownership
                if data_obj["user_address"] == user_address:
                    # Convert lists back to numpy arrays if needed
                    if isinstance(data_obj["data"], list) and metadata.get("format") == "numpy":
                        data_obj["data"] = np.array(data_obj["data"])
                    return data_obj
                    
        return None
        
    def list_user_data(self, user_address: str) -> List[Dict[str, Any]]:
        """
        List all data references for a specific user
        
        Args:
            user_address: User's wallet address
            
        Returns:
            List[Dict]: List of data references with basic metadata
        """
        # Filter cache by user address
        user_refs = [
            {
                "ref_id": ref_id,
                "timestamp": info["timestamp"]
            }
            for ref_id, info in self.cache.items()
            if info["user_address"] == user_address
        ]
        
        # Sort by timestamp (newest first)
        user_refs.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return user_refs
        
    def delete_data(self, ref_id: str, user_address: str) -> bool:
        """
        Delete data by reference ID (only if owned by the specified user)
        
        Args:
            ref_id: Reference ID for the data
            user_address: User's wallet address for verification
            
        Returns:
            bool: True if deletion was successful, False otherwise
        """
        # Verify ownership from cache
        if ref_id in self.cache and self.cache[ref_id]["user_address"] == user_address:
            # Delete from Walrus
            success = self.walrus.delete(ref_id)
            
            # If successful, remove from cache
            if success:
                del self.cache[ref_id]
                return True
                
        return False
