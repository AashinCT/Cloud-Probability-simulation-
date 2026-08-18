"""
Server Response Time Modeling and SLA Performance Analysis
Using Exponential Distribution
"""

import streamlit as st
import numpy as np
import pandas as pd
from data_generator import generate_response_times, estimate_lambda, save_response_times, load_response_times
from analysis import calculate_statistics, calculate_percentiles, get_statistics_summary
from probability import calculate_probability_comparison, theoretical_cdf, theoretical_survival
from sla import check_sla_compliance, get_sla_summary, estimate_required_threshold
from visualization import (
    create_histogram_chart,
    create_pdf_comparison_chart,
    create_cdf_chart,
    create_percentile_chart,
    create_sla_comparison_chart,
    create_survival_curve
)


# Page configuration
st.set_page_config(
    page_title="Server Response Time Analyzer",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom styling
st.markdown("""
    <style>
    .metric-card {
        background-color: #f0f2f6;
        padding: 20px;
        border-radius: 10px;
        margin: 10px 0;
    }
    .pass-status {
        color: green;
        font-weight: bold;
        font-size: 20px;
    }
    .fail-status {
        color: red;
        font-weight: bold;
        font-size: 20px;
    }
    </style>
""", unsafe_allow_html=True)


def initialize_session_state():
    """Initialize session state variables."""
    if 'response_times' not in st.session_state:
        st.session_state.response_times = None
    if 'lambda_param' not in st.session_state:
        st.session_state.lambda_param = 0.5
    if 'statistics' not in st.session_state:
        st.session_state.statistics = None


def main():
    # Initialize session state
    initialize_session_state()
    
    # Header
    st.title("📊 Server Response Time Analyzer")
    st.markdown("Modeling and SLA Performance Analysis Using Exponential Distribution")
    
    # Sidebar configuration
    with st.sidebar:
        st.header("⚙️ Configuration")
        
        # Section: Data Generation
        st.subheader("1️⃣ Data Generation")
        num_requests = st.number_input(
            "Number of Requests",
            min_value=10,
            max_value=100000,
            value=5000,
            step=100,
            help="Number of synthetic server response times to generate"
        )
        
        lambda_param = st.slider(
            "Lambda Parameter (λ)",
            min_value=0.1,
            max_value=5.0,
            value=1.0,
            step=0.1,
            help="Rate parameter of exponential distribution. Higher λ = faster responses (smaller mean)"
        )
        st.session_state.lambda_param = lambda_param
        
        use_seed = st.checkbox("Use fixed random seed (for reproducibility)", value=True)
        seed_value = 42 if use_seed else None
        
        if st.button("🔄 Generate New Data", key="generate_data"):
            st.session_state.response_times = generate_response_times(num_requests, lambda_param, seed=seed_value)
            st.session_state.statistics = get_statistics_summary(st.session_state.response_times)
            st.success("✅ Data generated successfully!")
        
        # Section: SLA Configuration
        st.subheader("2️⃣ SLA Configuration")
        
        num_slas = st.number_input(
            "Number of SLA Rules",
            min_value=1,
            max_value=5,
            value=1,
            step=1
        )
        
        sla_config = []
        for i in range(num_slas):
            col1, col2 = st.columns(2)
            with col1:
                threshold = st.number_input(
                    f"SLA {i+1} - Threshold (s)",
                    min_value=0.01,
                    max_value=10.0,
                    value=2.0 + i * 0.5,
                    step=0.1,
                    key=f"sla_threshold_{i}"
                )
            with col2:
                percentage = st.number_input(
                    f"SLA {i+1} - Required %",
                    min_value=50.0,
                    max_value=99.9,
                    value=95.0 - i * 5,
                    step=1.0,
                    key=f"sla_percentage_{i}"
                )
            sla_config.append({"threshold": threshold, "percentage": percentage})
        
        # Section: Probability Calculator
        st.subheader("3️⃣ Probability Calculator")
        prob_threshold = st.number_input(
            "Response Time Threshold (s)",
            min_value=0.01,
            max_value=10.0,
            value=1.0,
            step=0.1,
            help="Calculate probability of response within this threshold"
        )
    
    # Main content area
    if st.session_state.response_times is None:
        st.info("👈 Please configure parameters in the sidebar and click 'Generate New Data' to start.")
        return
    
    response_times = st.session_state.response_times
    statistics = st.session_state.statistics
    
    # Tab 1: Overview & Statistics
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📈 Overview",
        "📊 Visualizations",
        "🎯 Probability Analysis",
        "📋 SLA Monitoring",
        "ℹ️ About"
    ])
    
    # === TAB 1: OVERVIEW ===
    with tab1:
        st.header("Statistical Summary")
        
        # KPI Cards
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Total Requests",
                f"{statistics['count']:,}",
                help="Number of response times analyzed"
            )
        
        with col2:
            st.metric(
                "Mean Response Time",
                f"{statistics['mean']:.4f}s",
                delta=f"λ = {st.session_state.lambda_param:.4f}",
                help="Average response time (1/λ)"
            )
        
        with col3:
            st.metric(
                "Median Response Time",
                f"{statistics['median']:.4f}s",
                help="50th percentile"
            )
        
        with col4:
            st.metric(
                "Std Deviation",
                f"{statistics['std_dev']:.4f}s",
                help="Standard deviation of response times"
            )
        
        # Statistics table
        st.subheader("Detailed Statistics")
        stats_df = pd.DataFrame({
            "Metric": [
                "Count",
                "Mean",
                "Median",
                "Std Dev",
                "Min",
                "Max",
                "Variance"
            ],
            "Value": [
                f"{statistics['count']}",
                f"{statistics['mean']:.6f}s",
                f"{statistics['median']:.6f}s",
                f"{statistics['std_dev']:.6f}s",
                f"{statistics['min']:.6f}s",
                f"{statistics['max']:.6f}s",
                f"{statistics['variance']:.6f}s²"
            ]
        })
        st.dataframe(stats_df, use_container_width=True)
        
        # Percentiles
        st.subheader("Response Time Percentiles")
        percentiles_df = pd.DataFrame({
            "Percentile": [f"P{p}" for p in statistics['percentiles'].keys()],
            "Response Time (s)": [f"{v:.6f}" for v in statistics['percentiles'].values()]
        })
        st.dataframe(percentiles_df, use_container_width=True)
    
    # === TAB 2: VISUALIZATIONS ===
    with tab2:
        st.header("Interactive Visualizations")
        
        viz_col1, viz_col2 = st.columns(2)
        
        with viz_col1:
            st.subheader("Response Time Distribution")
            hist_chart = create_histogram_chart(response_times)
            st.plotly_chart(hist_chart, use_container_width=True)
        
        with viz_col2:
            st.subheader("Percentile Analysis")
            percentile_chart = create_percentile_chart(response_times)
            st.plotly_chart(percentile_chart, use_container_width=True)
        
        viz_col3, viz_col4 = st.columns(2)
        
        with viz_col3:
            st.subheader("PDF Comparison: Theoretical vs Observed")
            pdf_chart = create_pdf_comparison_chart(response_times, st.session_state.lambda_param)
            st.plotly_chart(pdf_chart, use_container_width=True)
        
        with viz_col4:
            st.subheader("Cumulative Distribution Function (CDF)")
            cdf_chart = create_cdf_chart(response_times, st.session_state.lambda_param)
            st.plotly_chart(cdf_chart, use_container_width=True)
        
        st.subheader("Survival Curve")
        survival_chart = create_survival_curve(response_times, st.session_state.lambda_param)
        st.plotly_chart(survival_chart, use_container_width=True)
    
    # === TAB 3: PROBABILITY ANALYSIS ===
    with tab3:
        st.header("Probability Analysis")
        
        # Display threshold value
        st.subheader(f"Analysis for Response Time Threshold: {prob_threshold:.4f}s")
        
        # Calculate probabilities
        prob_results = calculate_probability_comparison(response_times, st.session_state.lambda_param, prob_threshold)
        
        # Display probability metrics
        prob_col1, prob_col2 = st.columns(2)
        
        with prob_col1:
            st.subheader("Within Threshold")
            
            theoretical_within = prob_results['theoretical_within']
            empirical_within = prob_results['empirical_within']
            
            st.metric(
                "Theoretical Probability",
                f"{theoretical_within:.4%}",
                help=f"P(X ≤ {prob_threshold:.4f}) using exponential distribution"
            )
            
            st.metric(
                "Empirical Probability",
                f"{empirical_within:.4%}",
                help=f"Proportion of actual requests completing within {prob_threshold:.4f}s"
            )
            
            difference_within = empirical_within - theoretical_within
            st.metric(
                "Difference",
                f"{difference_within:+.4%}",
                help="Positive = empirical > theoretical"
            )
        
        with prob_col2:
            st.subheader("Exceeding Threshold")
            
            theoretical_exceeds = prob_results['theoretical_exceeds']
            empirical_exceeds = prob_results['empirical_exceeds']
            
            st.metric(
                "Theoretical Probability",
                f"{theoretical_exceeds:.4%}",
                help=f"P(X > {prob_threshold:.4f}) using exponential distribution"
            )
            
            st.metric(
                "Empirical Probability",
                f"{empirical_exceeds:.4%}",
                help=f"Proportion of actual requests exceeding {prob_threshold:.4f}s"
            )
            
            difference_exceeds = empirical_exceeds - theoretical_exceeds
            st.metric(
                "Difference",
                f"{difference_exceeds:+.4%}",
                help="Positive = empirical > theoretical"
            )
        
        # Probability explanation
        st.subheader("Mathematical Explanation")
        st.markdown(f"""
        **Exponential Distribution Formulas:**
        
        - **CDF (Probability within threshold):** P(X ≤ t) = 1 - e^(-λt)
          - P(X ≤ {prob_threshold:.4f}) = 1 - e^(-{st.session_state.lambda_param:.4f} × {prob_threshold:.4f}) = **{theoretical_within:.4%}**
        
        - **Survival Function (Probability exceeding threshold):** P(X > t) = e^(-λt)
          - P(X > {prob_threshold:.4f}) = e^(-{st.session_state.lambda_param:.4f} × {prob_threshold:.4f}) = **{theoretical_exceeds:.4%}**
        
        - **Lambda Estimation:** λ = 1 / mean(X) = 1 / {statistics['mean']:.4f} = **{st.session_state.lambda_param:.4f}**
        """)
    
    # === TAB 4: SLA MONITORING ===
    with tab4:
        st.header("SLA Monitoring & Compliance")
        
        # Check SLA compliance
        sla_thresholds = [sla['threshold'] for sla in sla_config]
        sla_percentages = [sla['percentage'] for sla in sla_config]
        
        sla_results = get_sla_summary(response_times, sla_thresholds, sla_percentages)
        
        # Display SLA compliance cards
        st.subheader("SLA Compliance Status")
        
        for i, result in enumerate(sla_results['sla_results']):
            col1, col2, col3 = st.columns([1, 2, 1])
            
            with col1:
                status_text = "✅ PASS" if result['is_compliant'] else "❌ FAIL"
                status_class = "pass-status" if result['is_compliant'] else "fail-status"
                st.markdown(f"<div class='{status_class}'>{status_text}</div>", unsafe_allow_html=True)
            
            with col2:
                st.markdown(f"""
                **SLA {i+1}:** {result['sla_percentage_required']:.0f}% within {result['sla_threshold']:.2f}s
                
                - Required: {result['sla_percentage_required']:.2f}%
                - Actual: {result['actual_percentage']:.2f}%
                - Compliant: {result['compliant_requests']:,} / {result['total_requests']:,}
                """)
            
            with col3:
                difference = result['difference']
                if difference >= 0:
                    st.metric("Difference", f"+{difference:.2f}%", "✅")
                else:
                    st.metric("Difference", f"{difference:.2f}%", "❌")
        
        # SLA Summary
        st.subheader("SLA Summary")
        summary_col1, summary_col2 = st.columns(2)
        
        with summary_col1:
            st.metric(
                "Total SLA Rules",
                sla_results['num_slas']
            )
        
        with summary_col2:
            st.metric(
                "Passed Rules",
                f"{sla_results['num_passed']}/{sla_results['num_slas']}"
            )
        
        # SLA Visualization
        st.subheader("SLA Comparison Chart")
        sla_chart = create_sla_comparison_chart(sla_results['sla_results'])
        st.plotly_chart(sla_chart, use_container_width=True)
        
        # Estimate required threshold
        st.subheader("Threshold Estimation")
        target_sla = st.slider(
            "Target SLA Percentage",
            min_value=50,
            max_value=100,
            value=95,
            step=1,
            help="Find the response time threshold needed to achieve this SLA percentage"
        )
        
        estimated_threshold = estimate_required_threshold(response_times, target_sla)
        st.metric(
            f"Required Response Time for {target_sla}% SLA",
            f"{estimated_threshold:.4f}s",
            help=f"Response time threshold at which {target_sla}% of requests complete"
        )
    
    # === TAB 5: ABOUT ===
    with tab5:
        st.header("About This Application")
        
        st.markdown("""
        ## Server Response Time Analyzer
        
        This application models server response times using the **exponential probability distribution** 
        and provides comprehensive statistical analysis, probability calculations, and SLA monitoring.
        
        ### Mathematical Model
        
        The exponential distribution is widely used to model the time between events (like server responses) 
        in systems with a constant event rate.
        
        **Key Formulas:**
        - **Probability Density Function (PDF):** f(x) = λ * e^(-λx)
        - **Cumulative Distribution Function (CDF):** F(x) = 1 - e^(-λx)
        - **Mean (Expected Value):** E(X) = 1/λ
        - **Variance:** Var(X) = 1/λ²
        - **Lambda Estimation:** λ = 1 / mean(response_time)
        
        ### Features
        
        1. **Synthetic Data Generation:** Generate response times with custom parameters
        2. **Statistical Analysis:** Calculate mean, median, percentiles, and variance
        3. **Probability Analysis:** Compare theoretical vs empirical probabilities
        4. **SLA Monitoring:** Track compliance with service level agreements
        5. **Interactive Visualizations:** View PDFs, CDFs, histograms, and more
        
        ### About the Exponential Distribution
        
        The exponential distribution models the time until an event occurs in a process with:
        - Constant event rate (memoryless property)
        - Events occurring independently
        - No events occurring simultaneously
        
        ### Limitations & Considerations
        
        ⚠️ **Important:** Real-world server response times may not perfectly follow an exponential distribution. 
        Response times can be affected by:
        
        - **Network Latency:** Variable network conditions
        - **CPU Load:** Server processing capacity
        - **Database Latency:** Query execution time
        - **Concurrency:** Multiple simultaneous requests
        - **Queueing:** Request waiting time
        - **Cache Behavior:** Whether responses are cached
        - **Request Complexity:** Varying request complexity
        - **Resource Contention:** Competition for system resources
        
        This model provides a simplified representation useful for:
        - Baseline performance modeling
        - SLA analysis and planning
        - System capacity planning
        - Identifying performance anomalies
        
        For production use, validate against actual server metrics and consider more complex models 
        (Gamma, Weibull, or mixture distributions) for better fit.
        
        ### Technical Stack
        
        - **Python:** Programming language
        - **Streamlit:** Interactive dashboard framework
        - **NumPy:** Numerical computations
        - **SciPy:** Statistical functions
        - **Pandas:** Data manipulation
        - **Plotly:** Interactive visualizations
        """)
        
        st.divider()
        
        st.markdown("""
        **Project Structure:**
        ```
        server-response-time-analyzer/
        ├── app.py                 # Main Streamlit application
        ├── data_generator.py      # Synthetic data generation
        ├── analysis.py            # Statistical analysis
        ├── probability.py         # Probability calculations
        ├── sla.py                # SLA monitoring
        ├── visualization.py       # Plotly charts
        ├── requirements.txt      # Python dependencies
        └── README.md             # Documentation
        ```
        """)


if __name__ == "__main__":
    main()
