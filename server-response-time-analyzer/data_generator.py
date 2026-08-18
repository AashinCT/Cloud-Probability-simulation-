"""
Data Generator Module
Generates synthetic server response times using exponential distribution.
"""

import numpy as np
import pandas as pd
from typing import Tuple


def generate_response_times(num_requests: int, lambda_param: float, seed: int = None) -> np.ndarray:
    """
    Generate synthetic response times using exponential distribution.
    
    The exponential distribution is commonly used to model server response times,
    as it represents the probability of events occurring at a constant rate.
    
    Mathematical basis:
    - PDF: f(x) = λ * exp(-λx)
    - CDF: F(x) = 1 - exp(-λx)
    - Mean: E(X) = 1/λ
    - Variance: Var(X) = 1/λ²
    
    Args:
        num_requests (int): Number of response times to generate
        lambda_param (float): Rate parameter of exponential distribution (λ)
                            Higher λ means faster responses (shorter mean time)
        seed (int, optional): Random seed for reproducibility
        
    Returns:
        np.ndarray: Array of response times in seconds
        
    Raises:
        ValueError: If num_requests <= 0 or lambda_param <= 0
    """
    if num_requests <= 0:
        raise ValueError("Number of requests must be positive")
    if lambda_param <= 0:
        raise ValueError("Lambda parameter must be positive")
    
    # Set seed for reproducibility if provided
    if seed is not None:
        np.random.seed(seed)
    
    # Generate response times using exponential distribution
    # np.random.exponential expects scale = 1/λ
    scale = 1 / lambda_param
    response_times = np.random.exponential(scale=scale, size=num_requests)
    
    return response_times


def estimate_lambda(response_times: np.ndarray) -> float:
    """
    Estimate lambda parameter from observed response times.
    
    The maximum likelihood estimator for λ is:
    λ = 1 / mean(X)
    
    Args:
        response_times (np.ndarray): Array of observed response times
        
    Returns:
        float: Estimated lambda parameter
        
    Raises:
        ValueError: If response_times is empty
    """
    if len(response_times) == 0:
        raise ValueError("Response times array cannot be empty")
    
    mean_response_time = np.mean(response_times)
    if mean_response_time <= 0:
        raise ValueError("Mean response time must be positive")
    
    lambda_param = 1 / mean_response_time
    return lambda_param


def save_response_times(response_times: np.ndarray, filepath: str) -> None:
    """
    Save response times to CSV file.
    
    Args:
        response_times (np.ndarray): Array of response times
        filepath (str): Path to save CSV file
    """
    df = pd.DataFrame({"response_time_seconds": response_times})
    df.to_csv(filepath, index=False)


def load_response_times(filepath: str) -> np.ndarray:
    """
    Load response times from CSV file.
    
    Args:
        filepath (str): Path to CSV file
        
    Returns:
        np.ndarray: Array of response times
    """
    df = pd.read_csv(filepath)
    return df["response_time_seconds"].values
