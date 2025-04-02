# ai/src/models/ahin.py
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Dict, List, Tuple, Optional, Union

class ActiveHashedInteractionNetwork(nn.Module):
    """
    Active Hashed Interaction Networks (AHIN) for multi-modal data processing
    and identity consciousness extraction.
    """
    def __init__(
        self,
        input_dim: int = 512,
        hidden_dim: int = 256,
        output_dim: int = 128,
        hash_size: int = 1024,
        num_layers: int = 3,
        dropout: float = 0.1,
        activation: str = 'relu'
    ):
        super(ActiveHashedInteractionNetwork, self).__init__()
        
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        self.hash_size = hash_size
        self.num_layers = num_layers
        
        # Input projection
        self.input_projection = nn.Linear(input_dim, hidden_dim)
        
        # Hash embedding
        self.hash_embedding = nn.Embedding(hash_size, hidden_dim)
        
        # Define activation function
        if activation == 'relu':
            self.activation = nn.ReLU()
        elif activation == 'gelu':
            self.activation = nn.GELU()
        else:
            self.activation = nn.ReLU()
        
        # Transformer encoder layers for interaction modeling
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=8,
            dim_feedforward=hidden_dim * 4,
            dropout=dropout,
            activation=activation
        )
        self.transformer_encoder = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_layers
        )
        
        # Output projection
        self.output_projection = nn.Linear(hidden_dim, output_dim)
        
        # Memory module
        self.memory_key = nn.Parameter(torch.randn(64, hidden_dim))
        self.memory_value = nn.Parameter(torch.randn(64, hidden_dim))
        
        # Active query generation
        self.query_generator = nn.Linear(hidden_dim, hidden_dim)
        
        # Dropout
        self.dropout = nn.Dropout(dropout)
        
    def hash_function(self, x: torch.Tensor) -> torch.Tensor:
        """
        Apply a simple hash function to project input features into hash space
        """
        # Random projection followed by binarization
        projection = torch.matmul(x, torch.randn(x.size(-1), 32, device=x.device))
        binary = (projection > 0).float()
        
        # Convert binary values to indices in hash space
        # We use a simple folding technique to convert binary vectors to indices
        indices = []
        for i in range(0, 32, 8):
            # Convert 8 binary values to an integer (0-255)
            power = torch.tensor([1, 2, 4, 8, 16, 32, 64, 128], device=x.device)
            segment = binary[:, :, i:i+8] * power
            index = segment.sum(dim=-1).long()
            indices.append(index)
        
        # Combine indices with modulo hash_size
        combined = indices[0]
        for idx in indices[1:]:
            combined = (combined * 256 + idx) % self.hash_size
            
        return combined
    
    def memory_access(self, query: torch.Tensor) -> torch.Tensor:
        """
        Access memory using attention mechanism
        """
        # Compute attention weights
        attn_weights = torch.matmul(query, self.memory_key.transpose(0, 1))
        attn_weights = F.softmax(attn_weights / np.sqrt(self.hidden_dim), dim=-1)
        
        # Retrieve from memory
        memory_output = torch.matmul(attn_weights, self.memory_value)
        
        return memory_output
        
    def forward(
        self,
        features: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, Dict[str, torch.Tensor]]:
        """
        Forward pass through the AHIN model
        
        Args:
            features: Input features of shape (batch_size, seq_len, input_dim)
            attention_mask: Optional mask for padded sequences
            
        Returns:
            output: Output embeddings of shape (batch_size, output_dim)
            metadata: Dictionary containing additional information and activations
        """
        batch_size, seq_len, _ = features.shape
        
        # Project input features
        projected = self.input_projection(features)
        projected = self.dropout(self.activation(projected))
        
        # Compute hash indices
        hash_indices = self.hash_function(features)
        
        # Get hash embeddings
        hash_embed = self.hash_embedding(hash_indices)
        
        # Combine projected features with hash embeddings
        combined = projected + hash_embed
        
        # Active query generation
        query = self.query_generator(combined.mean(dim=1, keepdim=True))
        query = self.activation(query)
        
        # Memory access
        memory_output = self.memory_access(query)
        
        # Add memory output to sequence
        enhanced = torch.cat([memory_output, combined], dim=1)
        
        # Apply transformer encoder for interaction modeling
        # Transpose for transformer: (batch_size, seq_len, hidden) -> (seq_len+1, batch_size, hidden)
        transformer_input = enhanced.transpose(0, 1)
        
        # Create attention mask if needed
        if attention_mask is not None:
            # Add a position for the memory output
            memory_mask = torch.ones((batch_size, 1), device=attention_mask.device)
            extended_mask = torch.cat([memory_mask, attention_mask], dim=1)
            transformer_mask = extended_mask == 0
        else:
            transformer_mask = None
            
        # Apply transformer
        transformed = self.transformer_encoder(transformer_input, src_key_padding_mask=transformer_mask)
        
        # Back to (batch_size, seq_len+1, hidden)
        transformed = transformed.transpose(0, 1)
        
        # Use the first token (memory-enhanced) as the representation
        representation = transformed[:, 0]
        
        # Project to output dimension
        output = self.output_projection(representation)
        
        # Additional metadata for analysis
        metadata = {
            "hash_indices": hash_indices,
            "attention_weights": transformed.mean(dim=1),  # Mean attention across sequence
            "memory_query": query.squeeze(1)
        }
        
        return output, metadata
