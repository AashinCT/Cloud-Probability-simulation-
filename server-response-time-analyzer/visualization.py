"""
Visualization Module
Creates interactive Plotly charts for response time analysis.
"""

import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from typing import Dict, Any
from probability import theoretical_pdf, theoretical_cdf


def create_histogram_chart(response_times: np.ndarray, title: str = "Response Time Distribution") -> go.Figure:
    """
    Create interactive histogram of response times.
    
    Args:
        response_times (np.ndarray): Array of response times
        title (str): Chart title
        
    Returns:
        go.Figure: Plotly figure object
    """
    fig = go.Figure()
    
    fig.add_trace(go.Histogram(
        x=response_times,
        nbinsx=50,
        name="Frequency",
        marker_color="rgba(31, 119, 180, 0.7)",
        hovertemplate="<b>Response Time Range</b><br>%{x}<br><b>Count</b>: %{y}<extra></extra>"
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Response Time (seconds)",
        yaxis_title="Frequency",
        hovermode="x unified",
        template="plotly_white",
        showlegend=True,
        height=500,
    )
    
    return fig


def create_pdf_comparison_chart(
    response_times: np.ndarray,
    lambda_param: float,
    title: str = "Theoretical vs Observed Distribution"
) -> go.Figure:
    """
    Create comparison chart of theoretical PDF vs observed histogram.
    
    Args:
        response_times (np.ndarray): Array of observed response times
        lambda_param (float): Rate parameter (λ)
        title (str): Chart title
        
    Returns:
        go.Figure: Plotly figure object
    """
    fig = go.Figure()
    
    # Add histogram of observed data
    fig.add_trace(go.Histogram(
        x=response_times,
        nbinsx=50,
        name="Observed Data",
        marker_color="rgba(31, 119, 180, 0.6)",
        histnorm="probability density",
        hovertemplate="<b>Response Time</b><br>%{x}<br><b>Density</b>: %{y}<extra></extra>"
    ))
    
    # Generate theoretical PDF curve
    max_time = np.percentile(response_times, 99.5)
    x_values = np.linspace(0, max_time, 1000)
    pdf_values = theoretical_pdf(x_values, lambda_param)
    
    fig.add_trace(go.Scatter(
        x=x_values,
        y=pdf_values,
        name=f"Theoretical PDF (λ={lambda_param:.4f})",
        line=dict(color="red", width=3),
        hovertemplate="<b>Time</b>: %{x:.4f}s<br><b>PDF</b>: %{y:.6f}<extra></extra>"
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Response Time (seconds)",
        yaxis_title="Probability Density",
        hovermode="x unified",
        template="plotly_white",
        height=500,
    )
    
    return fig


def create_cdf_chart(
    response_times: np.ndarray,
    lambda_param: float,
    title: str = "Cumulative Distribution Function (CDF)"
) -> go.Figure:
    """
    Create CDF comparison chart.
    
    Args:
        response_times (np.ndarray): Array of observed response times
        lambda_param (float): Rate parameter (λ)
        title (str): Chart title
        
    Returns:
        go.Figure: Plotly figure object
    """
    fig = go.Figure()
    
    # Calculate empirical CDF
    sorted_times = np.sort(response_times)
    empirical_cdf_values = np.arange(1, len(sorted_times) + 1) / len(sorted_times)
    
    fig.add_trace(go.Scatter(
        x=sorted_times,
        y=empirical_cdf_values,
        name="Empirical CDF",
        mode="lines",
        line=dict(color="blue", width=2),
        hovertemplate="<b>Time</b>: %{x:.4f}s<br><b>CDF</b>: %{y:.4f}<extra></extra>"
    ))
    
    # Generate theoretical CDF curve
    max_time = np.percentile(response_times, 99.5)
    x_values = np.linspace(0, max_time, 1000)
    scale = 1 / lambda_param
    from scipy.stats import expon
    theoretical_cdf_values = expon.cdf(x_values, scale=scale)
    
    fig.add_trace(go.Scatter(
        x=x_values,
        y=theoretical_cdf_values,
        name=f"Theoretical CDF (λ={lambda_param:.4f})",
        line=dict(color="red", width=3, dash="dash"),
        hovertemplate="<b>Time</b>: %{x:.4f}s<br><b>CDF</b>: %{y:.4f}<extra></extra>"
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Response Time (seconds)",
        yaxis_title="Cumulative Probability",
        hovermode="x unified",
        template="plotly_white",
        height=500,
        yaxis=dict(range=[0, 1.05])
    )
    
    return fig


def create_percentile_chart(response_times: np.ndarray, title: str = "Response Time Percentiles") -> go.Figure:
    """
    Create percentile visualization chart.
    
    Args:
        response_times (np.ndarray): Array of response times
        title (str): Chart title
        
    Returns:
        go.Figure: Plotly figure object
    """
    percentiles = np.arange(0, 101, 5)
    percentile_values = np.percentile(response_times, percentiles)
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=percentiles,
        y=percentile_values,
        fill="tozeroy",
        name="Response Time",
        line=dict(color="green", width=3),
        fillcolor="rgba(0, 200, 100, 0.3)",
        hovertemplate="<b>Percentile</b>: P%{x}<br><b>Response Time</b>: %{y:.4f}s<extra></extra>"
    ))
    
    # Add key percentile points
    key_percentiles = [50, 90, 95, 99]
    key_values = np.percentile(response_times, key_percentiles)
    
    fig.add_trace(go.Scatter(
        x=key_percentiles,
        y=key_values,
        mode="markers+text",
        name="Key Percentiles",
        marker=dict(size=10, color="darkgreen"),
        text=[f"P{p}<br>{v:.4f}s" for p, v in zip(key_percentiles, key_values)],
        textposition="top center",
        hovertemplate="<b>Percentile</b>: P%{x}<br><b>Response Time</b>: %{y:.4f}s<extra></extra>"
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Percentile",
        yaxis_title="Response Time (seconds)",
        hovermode="x unified",
        template="plotly_white",
        height=500,
    )
    
    return fig


def create_sla_comparison_chart(sla_results: list, title: str = "SLA Compliance Status") -> go.Figure:
    """
    Create SLA compliance comparison chart.
    
    Args:
        sla_results (list): List of SLA result dictionaries
        title (str): Chart title
        
    Returns:
        go.Figure: Plotly figure object
    """
    sla_labels = [f"{r['sla_percentage_required']:.0f}% within {r['sla_threshold']:.2f}s" 
                  for r in sla_results]
    actual_percentages = [r['actual_percentage'] for r in sla_results]
    required_percentages = [r['sla_percentage_required'] for r in sla_results]
    colors = ["green" if r['is_compliant'] else "red" for r in sla_results]
    
    fig = go.Figure()
    
    # Actual compliance
    fig.add_trace(go.Bar(
        name="Actual",
        x=sla_labels,
        y=actual_percentages,
        marker_color=colors,
        hovertemplate="<b>%{x}</b><br><b>Actual Compliance</b>: %{y:.2f}%<extra></extra>"
    ))
    
    # Required compliance (reference line)
    fig.add_trace(go.Bar(
        name="Required",
        x=sla_labels,
        y=required_percentages,
        marker_color="rgba(150, 150, 150, 0.5)",
        hovertemplate="<b>%{x}</b><br><b>Required Compliance</b>: %{y:.2f}%<extra></extra>"
    ))
    
    fig.update_layout(
        title=title,
        yaxis_title="Percentage (%)",
        hovermode="x unified",
        template="plotly_white",
        height=500,
        barmode="group",
    )
    
    fig.add_hline(y=100, line_dash="dash", line_color="red", 
                  annotation_text="100% Compliance", annotation_position="right")
    
    return fig


def create_survival_curve(
    response_times: np.ndarray,
    lambda_param: float,
    title: str = "Survival Curve"
) -> go.Figure:
    """
    Create survival probability curve (P(X > t)).
    
    Args:
        response_times (np.ndarray): Array of response times
        lambda_param (float): Rate parameter (λ)
        title (str): Chart title
        
    Returns:
        go.Figure: Plotly figure object
    """
    fig = go.Figure()
    
    # Calculate empirical survival function
    sorted_times = np.sort(response_times)
    empirical_survival = 1 - np.arange(1, len(sorted_times) + 1) / len(sorted_times)
    
    fig.add_trace(go.Scatter(
        x=sorted_times,
        y=empirical_survival,
        name="Empirical Survival",
        mode="lines",
        line=dict(color="blue", width=2),
        hovertemplate="<b>Time</b>: %{x:.4f}s<br><b>P(X > t)</b>: %{y:.4f}<extra></extra>"
    ))
    
    # Generate theoretical survival curve
    max_time = np.percentile(response_times, 99.5)
    x_values = np.linspace(0, max_time, 1000)
    scale = 1 / lambda_param
    from scipy.stats import expon
    theoretical_survival_values = expon.sf(x_values, scale=scale)
    
    fig.add_trace(go.Scatter(
        x=x_values,
        y=theoretical_survival_values,
        name=f"Theoretical Survival (λ={lambda_param:.4f})",
        line=dict(color="red", width=3, dash="dash"),
        hovertemplate="<b>Time</b>: %{x:.4f}s<br><b>P(X > t)</b>: %{y:.4f}<extra></extra>"
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Response Time (seconds)",
        yaxis_title="Survival Probability P(X > t)",
        hovermode="x unified",
        template="plotly_white",
        height=500,
        yaxis=dict(range=[0, 1.05])
    )
    
    return fig
