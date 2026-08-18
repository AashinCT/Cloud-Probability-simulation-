from setuptools import setup, find_packages

setup(
    name="server-response-time-analyzer",
    version="1.0.0",
    description="Server Response Time Modeling and SLA Performance Analysis Using Exponential Distribution",
    author="Development Team",
    python_requires=">=3.8",
    install_requires=[
        "streamlit==1.28.1",
        "numpy==1.24.3",
        "pandas==2.0.3",
        "scipy==1.11.2",
        "plotly==5.17.0",
    ],
)
