# Storage base

"""
Abstract Storage Service Interface for Verba project.

This module defines the contract that all storage providers must implement,
ensuring consistent behavior across different storage backends (Local, S3, etc.).
"""

from abc import ABC, abstractmethod
from typing import BinaryIO

class StorageService(ABC):
    """
    Abstract base class for storage service implementations.
    
    This interface defines the contract that all storage providers must follow,
    enabling the application to work with different storage backends seamlessly.
    
    Storage Path Format (from API contract):
        - LOCAL: uploads/{user_id}/{meeting_id}/{original_filename}
        - S3: s3://bucket-name/{user_id}/{meeting_id}/{original_filename} (future)
    """

    @abstractmethod
    def upload(self, file: BinaryIO, user_id: str, meeting_id: str, filename: str) -> str:
        """
        Upload a file to the storage provider.
        
        Args:
            file: Binary file object to upload
            user_id: UUID of the user uploading the file
            meeting_id: UUID of the meeting
            filename: Original filename to store the file as
            
        Returns:
            str: Storage path where the file was stored
                 Format: uploads/{user_id}/{meeting_id}/{filename}
            
        Raises:
            StorageError: If upload fails due to storage issues
        """
        pass

    @abstractmethod
    def delete(self, storage_path: str) -> bool:
        """
        Delete a file from the storage provider.
        
        Args:
            storage_path: Full storage path of the file to delete
            
        Returns:
            bool: True if deletion was successful, False otherwise
            
        Raises:
            StorageError: If deletion fails due to storage issues
        """
        pass

    @abstractmethod
    def get_url(self, storage_path: str) -> str:
        """
        Get the accessible URL or path for a stored file.
        
        Args:
            storage_path: Storage path of the file
            
        Returns:
            str: Full URL or path to access the file
            
        Raises:
            StorageError: If file path cannot be determined
        """
        pass

    @abstractmethod
    def exists(self, storage_path: str) -> bool:
        """
        Check if a file exists in storage.
        
        Args:
            storage_path: Storage path to check
            
        Returns:
            bool: True if file exists, False otherwise
        """
        pass


class StorageError(Exception):
    """
    Custom exception for storage-related errors.
    
    This exception should be raised by storage implementations when
    operations fail due to storage-specific issues.
    """
    pass