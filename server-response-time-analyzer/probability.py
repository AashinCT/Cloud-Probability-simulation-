"""
Probability Calculator Module
Calculates theoretical and empirical probabilities using exponential distribution.
"""

import numpy as np
from scipy import stats
from typing import Dict, Any, Tuple


def theoretical_cdf(t: float, lambda_param: float) -> float:
    """
    Calculate theoretical CDF at time t using exponential distribution.
    
    Mathematical formula:
    P(X <= t) = 1 - exp(-λt)
    
    This represents the probability that a response completes within time t.
    
    Args:
        t (float): Response time threshold (seconds)
        lambda_param (float): Rate parameter (λ)
        
    Returns:
        float: Probability between 0 and 1
        
    Raises:
        ValueError: If t < 0 or lambda_param <= 0
    """
    if t < 0:
        raise ValueError("Time threshold cannot be negative")
    if lambda_param <= 0:
        raise ValueError("Lambda parameter must be positive")
    
    # Using scipy's exponential distribution
    scale = 1 / lambda_param
    probability = stats.expon.cdf(t, scale=scale)
    
    return probability


def theoretical_survival(t: float, lambda_param: float) -> float:
    """
    Calculate theoretical survival probability at time t.
    
    Mathematical formula:
    P(X > t) = exp(-λt)
    
    This represents the probability that a response takes longer than time t.
    
    Args:
        t (float): Response time threshold (seconds)
        lambda_param (float): Rate parameter (λ)
        
    Returns:
        float: Survival probability between 0 and 1
        
    Raises:
        ValueError: If t < 0 or lambda_param <= 0
    """
    if t < 0:
        raise ValueError("Time threshold cannot be negative")
    if lambda_param <= 0:
        raise ValueError("Lambda parameter must be positive")
    
    # P(X > t) = 1 - P(X <= t)
    scale = 1 / lambda_param
    survival_prob = stats.expon.sf(t, scale=scale)
    
    return survival_prob


def empirical_cdf(response_times: np.ndarray, t: float) -> float:
    """
    Calculate empirical CDF at time t from observed data.
    
    This is the proportion of observed response times that are <= t.
    
    Args:
        response_times (np.ndarray): Array of observed response times
        t (float): Response time threshold (seconds)
        
    Returns:
        float: Empirical probability between 0 and 1
        
    Raises:
        ValueError: If response_times is empty or t < 0
    """
    if len(response_times) == 0:
        raise ValueError("Response times array cannot be empty")
    if t < 0:
        raise ValueError("Time threshold cannot be negative")
    
    proportion = np.sum(response_times <= t) / len(response_times)
    return proportion


def empirical_survival(response_times: np.ndarray, t: float) -> float:
    """
    Calculate empirical survival probability at time t from observed data.
    
    This is the proportion of observed response times that are > t.
    
    Args:
        response_times (np.ndarray): Array of observed response times
        t (float): Response time threshold (seconds)
        
    Returns:
        float: Empirical survival probability between 0 and 1
        
    Raises:
        ValueError: If response_times is empty or t < 0
    """
    if len(response_times) == 0:
        raise ValueError("Response times array cannot be empty")
    if t < 0:
        raise ValueError("Time threshold cannot be negative")
    
    proportion = np.sum(response_times > t) / len(response_times)
    return proportion


def calculate_probability_comparison(
    response_times: np.ndarray,
    lambda_param: float,
    threshold: float
) -> Dict[str, Any]:
    """
    Calculate and compare theoretical vs empirical probabilities.
    
    Args:
        response_times (np.ndarray): Array of observed response times
        lambda_param (float): Rate parameter (λ)
        threshold (float): Response time threshold (seconds)
        
    Returns:
        Dict[str, Any]: Contains theoretical and empirical probabilities
        
    Raises:
        ValueError: If inputs are invalid
    """
    if len(response_times) == 0:
        raise ValueError("Response times array cannot be empty")
    if threshold < 0:
        raise ValueError("Threshold cannot be negative")
    if lambda_param <= 0:
        raise ValueError("Lambda parameter must be positive")
    
    result = {
        "threshold": threshold,
        "theoretical_within": theoretical_cdf(threshold, lambda_param),
        "theoretical_exceeds": theoretical_survival(threshold, lambda_param),
        "empirical_within": empirical_cdf(response_times, threshold),
        "empirical_exceeds": empirical_survival(response_times, threshold),
    }
    
    return result


def theoretical_pdf(x_values: np.ndarray, lambda_param: float) -> np.ndarray:
    """
    Calculate theoretical PDF values for plotting.
    
    Mathematical formula:
    f(x) = λ * exp(-λx)
    
    Args:
        x_values (np.ndarray): Array of x values
        lambda_param (float): Rate parameter (λ)
        
    Returns:
        np.ndarray: Array of PDF values
        
    Raises:
        ValueError: If lambda_param <= 0
    """
    if lambda_param <= 0:
        raise ValueError("Lambda parameter must be positive")
    
    scale = 1 / lambda_param
    pdf_values = stats.expon.pdf(x_values, scale=scale)
    
    return pdf_values
