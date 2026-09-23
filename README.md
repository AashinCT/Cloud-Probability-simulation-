# Server Response Time Modeling Using Exponential Distribution

## Maths Micro Project
**Industry Focus:** Cloud Computing & Web Services  
**Integrated COs:** CO3–CO5

## Overview
This project models real server response times using an Exponential Distribution. Measurements are collected from an Ubuntu Server running in VirtualBox and analyzed statistically.

## Problem Statement
Cloud-based applications receive many requests, and response time affects user experience and SLA compliance. Monitoring only average response time does not provide enough information about the probability of slow requests.

## Proposed Solution
The system measures real HTTP response times, estimates the exponential rate parameter, calculates delay probabilities, compares theoretical and empirical behavior, and evaluates SLA compliance.

## Mathematical Model
For response time X following an Exponential Distribution with rate lambda:
- Probability Density Function: f(x) = lambda * exp(-lambda*x), x >= 0
- CDF: P(X <= t) = 1 - exp(-lambda*t)
- Delay Probability: P(X > t) = exp(-lambda*t)
- Mean: E(X) = 1/lambda
- Variance: Var(X) = 1/lambda^2
- Estimated Rate: lambda_hat = 1 / sample mean

## System Architecture
```text
Kali Linux
    |
    | HTTP Requests
    v
Ubuntu Server VM
    |
    v
FastAPI / Uvicorn
    |
    v
Response-Time Collector
    |
    +-------------------------+
    |                         |
    v                         v
Response-Time Data       Server Metrics
                         CPU / RAM / Request Rate
    |                    Concurrency / Status
    +-----------+-------------+
                |
                v
       Statistical Analysis
                |
                v
      Exponential Model
                |
                +----------------------+
                |                      |
                v                      v
       Delay Probability         SLA Analysis
       P50 / P95 / P99           Compliance / Risk
```

## Real-Server Experiment
The experiment uses Ubuntu Server 24.04 LTS, VirtualBox, Kali Linux, Python, FastAPI, Uvicorn, and HTTP/cURL clients.

The measured data comes from actual HTTP communication with the Ubuntu server rather than only from randomly generated synthetic data.

## Data Collected
- Request ID
- Timestamp
- Endpoint
- HTTP status code
- Client response time
- Server processing time
- CPU usage
- Memory usage
- Request rate
- Concurrency
- Success/failure status

## Statistical Analysis
The project analyzes mean response time, variance, standard deviation, exponential rate lambda, P50/P95/P99 latency, empirical CDF, theoretical exponential CDF, delay probabilities, SLA compliance, and slow-request percentage.

## SLA Analysis
For example, if an SLA requires 95% of requests to complete within 2 seconds:

```text
P(X <= 2) = 1 - exp(-2*lambda)
```

The system also calculates the actual percentage of measured requests completed within the SLA threshold. This allows the theoretical model to be compared with observed server behavior.

## Adaptive Monitoring
A sliding-window approach can estimate lambda continuously from recent requests.

```text
Request Window 1 -> lambda1
Request Window 2 -> lambda2
Request Window 3 -> lambda3
...
```

A decrease in lambda corresponds to an increase in the estimated mean response time. Tracking this change can help identify performance degradation and possible SLA risk.

## Important Limitation
The Exponential Distribution is a modeling assumption and does not imply that every real server follows an exponential response-time distribution.

Real latency can be affected by CPU utilization, memory pressure, database operations, network conditions, queuing, caching, concurrency, and external services.

Therefore, the project compares the exponential model with observed response-time data instead of claiming that all real server latency is exponential.

## Technology Stack
| Technology | Purpose |
|---|---|
| Ubuntu Server 24.04 LTS | Real server environment |
| VirtualBox | Server virtualization |
| Kali Linux | Client/testing environment |
| Python | Data collection and analysis |
| FastAPI | HTTP server/API |
| Uvicorn | ASGI server |
| NumPy / SciPy | Statistical computation |
| CSV / SQLite | Historical data storage |
| Git / GitHub | Version control |

## Project Workflow
1. Start the Ubuntu Server VM.
2. Run the FastAPI/Uvicorn web service.
3. Send HTTP requests from Kali Linux.
4. Measure each request's response time.
5. Store the collected measurements.
6. Estimate the exponential rate parameter lambda.
7. Calculate theoretical delay probabilities.
8. Compare theoretical and empirical results.
9. Calculate latency percentiles.
10. Evaluate SLA compliance.
11. Track performance changes using a sliding window.

## Future Extensions
- Dynamic SLA monitoring
- Automated performance alerts
- Server-state-aware statistical modeling
- Controlled load testing
- Historical response-time analysis
- Cloud deployment
- Adaptive monitoring
- Performance-control feedback loop

## Academic Outcomes
This project applies probability distributions, statistical estimation, data analysis, exponential distribution, web-service monitoring, server performance analysis, cloud computing concepts, and SLA evaluation.

It demonstrates how mathematical probability models can be connected to a practical server-monitoring problem.

## Repository Structure
The repository contains project documentation, setup instructions, configuration guides, and the main server-response-time analyzer project.

## Author
**AashinCT**  
Karunya Institute of Technology and Sciences