"""
Statistical Analysis Module
Provides comprehensive statistical analysis of response times.
"""

import numpy as np
from typing import Dict, Any


def calculate_statistics(response_times: np.ndarray) -> Dict[str, Any]:
    """
    Calculate comprehensive statistical metrics from response times.
    
    Args:
        response_times (np.ndarray): Array of response times
        
    Returns:
        Dict[str, Any]: Dictionary containing statistical metrics
        
    Raises:
        ValueError: If response_times is empty
    """
    if len(response_times) == 0:
        raise ValueError("Response times array cannot be empty")
    
    stats = {
        "count": len(response_times),
        "mean": np.mean(response_times),
        "median": np.median(response_times),
        "std_dev": np.std(response_times, ddof=1),  # Sample standard deviation
        "min": np.min(response_times),
        "max": np.max(response_times),
        "variance": np.var(response_times, ddof=1),  # Sample variance
    }
    
    return stats


def calculate_percentiles(response_times: np.ndarray, percentiles: list = None) -> Dict[int, float]:
    """
    Calculate response time percentiles.
    
    Percentiles are useful for understanding the distribution of response times.
    For example, P95 tells us that 95% of requests complete within that time.
    
    Args:
        response_times (np.ndarray): Array of response times
        percentiles (list, optional): List of percentiles to calculate (0-100).
                                     Defaults to [50, 90, 95, 99]
        
    Returns:
        Dict[int, float]: Dictionary mapping percentile to response time
        
    Raises:
        ValueError: If response_times is empty
    """
    if len(response_times) == 0:
        raise ValueError("Response times array cannot be empty")
    
    if percentiles is None:
        percentiles = [50, 90, 95, 99]
    
    # Validate percentiles
    for p in percentiles:
        if not 0 <= p <= 100:
            raise ValueError(f"Percentile must be between 0 and 100, got {p}")
    
    percentile_dict = {}
    for p in percentiles:
        percentile_dict[p] = np.percentile(response_times, p)
    
    return percentile_dict


def get_statistics_summary(response_times: np.ndarray) -> Dict[str, Any]:
    """
    Get a comprehensive summary of statistics and percentiles.
    
    Args:
        response_times (np.ndarray): Array of response times
        
    Returns:
        Dict[str, Any]: Combined statistics and percentiles
    """
    stats = calculate_statistics(response_times)
    percentiles = calculate_percentiles(response_times)
    
    summary = {
        **stats,
        "percentiles": percentiles
    }
    
    return summary
