"""
SLA Monitoring Module
Monitors SLA compliance based on response time thresholds.
"""

import numpy as np
from typing import Dict, Any


def check_sla_compliance(
    response_times: np.ndarray,
    sla_threshold: float,
    sla_percentage: float
) -> Dict[str, Any]:
    """
    Check if observed response times meet SLA requirements.
    
    SLA (Service Level Agreement) specifies that a certain percentage of requests
    must complete within a specified time threshold.
    
    Example: 95% of requests must complete within 2 seconds.
    
    Args:
        response_times (np.ndarray): Array of observed response times
        sla_threshold (float): Maximum acceptable response time (seconds)
        sla_percentage (float): Required percentage of requests to meet threshold (0-100)
        
    Returns:
        Dict[str, Any]: SLA compliance status and details
        
    Raises:
        ValueError: If inputs are invalid
    """
    if len(response_times) == 0:
        raise ValueError("Response times array cannot be empty")
    if sla_threshold < 0:
        raise ValueError("SLA threshold cannot be negative")
    if not 0 <= sla_percentage <= 100:
        raise ValueError("SLA percentage must be between 0 and 100")
    
    # Calculate actual compliance percentage
    compliant_requests = np.sum(response_times <= sla_threshold)
    actual_percentage = (compliant_requests / len(response_times)) * 100
    
    # Determine if SLA is met
    is_compliant = actual_percentage >= sla_percentage
    
    result = {
        "sla_threshold": sla_threshold,
        "sla_percentage_required": sla_percentage,
        "actual_percentage": actual_percentage,
        "compliant_requests": int(compliant_requests),
        "total_requests": len(response_times),
        "non_compliant_requests": len(response_times) - compliant_requests,
        "is_compliant": is_compliant,
        "status": "PASS" if is_compliant else "FAIL",
        "difference": actual_percentage - sla_percentage,  # Positive = better, negative = worse
    }
    
    return result


def get_sla_summary(
    response_times: np.ndarray,
    sla_thresholds: list,
    sla_percentages: list
) -> Dict[str, Any]:
    """
    Get SLA compliance summary for multiple SLA requirements.
    
    Args:
        response_times (np.ndarray): Array of observed response times
        sla_thresholds (list): List of SLA thresholds (seconds)
        sla_percentages (list): List of required percentages (0-100)
        
    Returns:
        Dict[str, Any]: SLA summary for all requirements
        
    Raises:
        ValueError: If lists have different lengths or inputs are invalid
    """
    if len(sla_thresholds) != len(sla_percentages):
        raise ValueError("SLA thresholds and percentages lists must have same length")
    
    sla_results = []
    for threshold, percentage in zip(sla_thresholds, sla_percentages):
        result = check_sla_compliance(response_times, threshold, percentage)
        sla_results.append(result)
    
    # Calculate overall compliance
    all_compliant = all(result["is_compliant"] for result in sla_results)
    
    summary = {
        "sla_results": sla_results,
        "overall_compliant": all_compliant,
        "num_slas": len(sla_results),
        "num_passed": sum(1 for r in sla_results if r["is_compliant"]),
    }
    
    return summary


def estimate_required_threshold(response_times: np.ndarray, target_percentage: float) -> float:
    """
    Estimate the response time threshold needed to meet a target percentage SLA.
    
    Given a target percentage (e.g., 95%), find the response time threshold
    that would achieve that SLA compliance level.
    
    Args:
        response_times (np.ndarray): Array of observed response times
        target_percentage (float): Target SLA percentage (0-100)
        
    Returns:
        float: Estimated response time threshold
        
    Raises:
        ValueError: If inputs are invalid
    """
    if len(response_times) == 0:
        raise ValueError("Response times array cannot be empty")
    if not 0 <= target_percentage <= 100:
        raise ValueError("Target percentage must be between 0 and 100")
    
    # Use percentile to estimate threshold
    threshold = np.percentile(response_times, target_percentage)
    
    return threshold
