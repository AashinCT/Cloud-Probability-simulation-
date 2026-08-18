# Visual Guide - Dashboard Tour

This guide shows what you'll see when you run the application.

## Dashboard Layout

```
╔════════════════════════════════════════════════════════════════════════╗
║ 📊 Server Response Time Analyzer                                       ║
║ Modeling and SLA Performance Analysis Using Exponential Distribution   ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  ┌────────────────────────┐  ┌──────────────────────────────────────┐║
║  │ SIDEBAR CONTROLS       │  │ MAIN CONTENT AREA                    ││
║  │ ⚙️ Configuration        │  │                                      ││
║  │                        │  │  [📈 Overview] [📊 Visualizations]  ││
║  │ 1️⃣ Data Generation     │  │  [🎯 Probability] [📋 SLA]  [ℹ️ About]││
║  │  ├─ Requests: 5000     │  │                                      ││
║  │  ├─ Lambda: 1.0 ▭▭▭▭▭ │  │  ┌─ OVERVIEW TAB ────────────────┐ ││
║  │  ├─ Use Seed [✓]       │  │  │                               │ ││
║  │  └─ [🔄 Generate Data]  │  │  │ Metrics:                    │ ││
║  │                        │  │  │ • Total Requests: 5,000     │ ││
║  │ 2️⃣ SLA Configuration   │  │  │ • Mean: 1.0234s             │ ││
║  │  ├─ SLA 1:             │  │  │ • Median: 0.7102s           │ ││
║  │  │  Threshold: 2.0s    │  │  │ • Std Dev: 1.2045s          │ ││
║  │  │  Required: 95%      │  │  │                               │ ││
║  │  └─ [+ Add SLA]        │  │  │ Statistics:                 │ ││
║  │                        │  │  │ ┌───────────────────────┐   │ ││
║  │ 3️⃣ Probability Calc   │  │  │ │ Metric    │ Value     │   │ ││
║  │  ├─ Threshold: 1.0s   │  │  │ │ Count     │ 5,000     │   │ ││
║  │  └─ [Calculate]       │  │  │ │ Mean      │ 1.0234s   │   │ ││
║  │                        │  │  │ │ Median    │ 0.7102s   │   │ ││
║  │                        │  │  │ │ Std Dev   │ 1.2045s   │   │ ││
║  │                        │  │  │ │ Min       │ 0.0012s   │   │ ││
║  │                        │  │  │ │ Max       │ 9.8765s   │   │ ││
║  │                        │  │  │ └───────────────────────┘   │ ││
║  │                        │  │  │                               │ ││
║  │                        │  │  │ Percentiles:                │ ││
║  │                        │  │  │ ┌───────┬──────────┐         │ ││
║  │                        │  │  │ │Percent│Response  │         │ ││
║  │                        │  │  │ │P50    │0.6931s  │         │ ││
║  │                        │  │  │ │P90    │2.3026s  │         │ ││
║  │                        │  │  │ │P95    │2.9957s  │         │ ││
║  │                        │  │  │ │P99    │4.6052s  │         │ ││
║  │                        │  │  │ └───────┴──────────┘         │ ││
║  │                        │  │  └─────────────────────────────┘ ││
║  │                        │  │                                  ││
║  └────────────────────────┘  └──────────────────────────────────┘║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

## Tab 1: Overview & Statistics

### KPI Cards (Top of Tab)

```
┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Total Requests       │ Mean Response Time   │ Median Response Time │ Std Deviation        │
│ 5,000                │ 1.0234s              │ 0.7102s              │ 1.2045s              │
│ helping understand   │ δ λ = 0.9771         │ 50th percentile      │ Variability measure  │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### Statistics Table

```
┌──────────────────────┬────────────────┐
│ Metric               │ Value          │
├──────────────────────┼────────────────┤
│ Count                │ 5,000          │
│ Mean                 │ 1.023400s      │
│ Median               │ 0.710200s      │
│ Std Dev              │ 1.204500s      │
│ Min                  │ 0.001200s      │
│ Max                  │ 9.876500s      │
│ Variance             │ 1.450800s²     │
└──────────────────────┴────────────────┘
```

### Percentiles Table

```
┌─────────────────┬──────────────────┐
│ Percentile      │ Response Time (s) │
├─────────────────┼──────────────────┤
│ P50             │ 0.693147         │
│ P90             │ 2.302585         │
│ P95             │ 2.995732         │
│ P99             │ 4.605170         │
└─────────────────┴──────────────────┘
```

## Tab 2: Visualizations

### Layout (6 Interactive Charts)

```
┌─────────────────────────────────────────────┬─────────────────────────────────────────────┐
│ Response Time Distribution (Histogram)      │ Response Time Percentiles                   │
│                                             │                                             │
│ Frequency                                   │ Response Time (s)                           │
│   │                        ╭╮              │    │                                        │
│   │ ╭╮                   ╭╯╰╮              │    │                          ╱╱            │
│   │ ││   ╭╮             ╱╰─╮              │    │                        ╱╱              │
│   │ ││ ╭╯╰╮ ╭╮       ╱╰───╮             │    │                     ╱╱                │
│   │ ╰╯ ││  ╯ ││   ╭╮╱╰─────╮            │    │                  ╱╱                  │
│   └─────────────────────────────────────┘    │               ╱╱                      │
│   0                    Response Time (s)      │            ╱╱                         │
│                                             │         ╱╱                            │
│                                             │      ╱╱                               │
│                                             └──────────────────────────────────────┘
│                                             └──────────────────────────────────────┘
│
├─────────────────────────────────────────────┬─────────────────────────────────────────────┤
│ Theoretical vs Observed PDF                 │ Cumulative Distribution Function (CDF)      │
│                                             │                                             │
│ Probability Density                         │ Cumulative Probability                      │
│   │                                         │   │                                ╭──────│
│   │ ╭╮                                      │   │                            ╭─╯      │
│   │ ││                                      │   │                       ╭──╯         │
│   │ ││    ━ Observed ━ Theoretical         │   │                  ╭──╯              │
│   │ ││                                      │   │             ╭╯                    │
│   └─────────────────────────────────────┘    │         ╭╯                        │
│   0                Response Time (s)         │     ╭╯                           │
│                                             │  ╭╯                              │
│                                             │ ╭                                │
│                                             └──────────────────────────────────┘
│
├─────────────────────────────────────────────┬─────────────────────────────────────────────┤
│ Survival Curve                              │                                             │
│                                             │                                             │
│ Survival Probability P(X > t)               │                                             │
│   │                                  ╭────  │                                             │
│   │                           ╭──────╯      │                                             │
│   │                    ╭──────╯              │                                             │
│   │             ╭──────╯                     │                                             │
│   │      ╭──────╯                            │                                             │
│   │ ╭────╯                                   │                                             │
│   └─────────────────────────────────────┘    │                                             │
│   0                Response Time (s)         │                                             │
│                                             │                                             │
└─────────────────────────────────────────────┴─────────────────────────────────────────────┘
```

All charts are **interactive:**
- Hover to see exact values
- Click legend to toggle series
- Zoom and pan with mouse
- Download as PNG

## Tab 3: Probability Analysis

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Analysis for Response Time Threshold: 1.0000s                   │
└──────────────────────────────────────────────────────────────────┘

┌─ Within Threshold (P(X ≤ 1.0))              ┬─ Exceeding Threshold (P(X > 1.0))          ┐
│                                              │                                            │
│ Theoretical Probability                      │ Theoretical Probability                    │
│ 63.21% ← Using formula: 1 - e^(-λt)         │ 36.79% ← Using formula: e^(-λt)           │
│                                              │                                            │
│ Empirical Probability                        │ Empirical Probability                      │
│ 62.34% ← Observed data                      │ 37.66% ← Observed data                    │
│                                              │                                            │
│ Difference                                   │ Difference                                 │
│ -0.87% ← Empirical < Theoretical            │ +0.87% ← Empirical > Theoretical          │
│                                              │                                            │
└──────────────────────────────────────────────┴────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Mathematical Explanation                                          │
│                                                                   │
│ Exponential Distribution Formulas:                               │
│                                                                   │
│ • CDF (Probability within threshold):  P(X ≤ t) = 1 - e^(-λt)   │
│   P(X ≤ 1.0000) = 1 - e^(-1.0000 × 1.0000) = 63.21%            │
│                                                                   │
│ • Survival Function (Probability exceeding threshold):            │
│   P(X > t) = e^(-λt)                                             │
│   P(X > 1.0000) = e^(-1.0000 × 1.0000) = 36.79%                │
│                                                                   │
│ • Lambda Estimation:  λ = 1 / mean(X) = 1 / 1.0234 = 0.9771    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Tab 4: SLA Monitoring

### SLA Compliance Cards

```
┌─────────────────────────────────────────────────────────────────┐
│ SLA Compliance Status                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ ✅ PASS    SLA 1: 95% within 2.00s                       │   │
│ │            • Required: 95.00%                            │   │
│ │            • Actual: 97.32%                              │   │
│ │            • Compliant: 4,866 / 5,000                    │   │
│ │            • Difference: +2.32% ✅                       │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ ❌ FAIL    SLA 2: 99% within 3.00s                       │   │
│ │            • Required: 99.00%                            │   │
│ │            • Actual: 95.12%                              │   │
│ │            • Compliant: 4,756 / 5,000                    │   │
│ │            • Difference: -3.88% ❌                       │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─ SLA Summary ──────────────────────┬─ SLA Comparison Chart ─────┐
│                                    │                             │
│ Total SLA Rules: 2                 │ Percentage (%)   100%       │
│                                    │                    │        │
│ Passed Rules: 1/2                  │ Actual ▓▓▓ SLA ▒▒▒│        │
│                                    │                    │        │
└────────────────────────────────────┴────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Threshold Estimation                                             │
│                                                                  │
│ Target SLA Percentage: 99% ▭▭▭▭▭▭▭▭▭▭                         │
│                                                                  │
│ Required Response Time for 99% SLA:  4.6052s                    │
│ (Response time threshold at which 99% of requests complete)     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Tab 5: About & Documentation

```
┌──────────────────────────────────────────────────────────────────┐
│ About This Application                                            │
│                                                                   │
│ Server Response Time Analyzer                                    │
│                                                                   │
│ This application models server response times using the          │
│ exponential probability distribution and provides comprehensive  │
│ statistical analysis, probability calculations, and SLA          │
│ monitoring.                                                      │
│                                                                   │
│ ▼ Mathematical Model                                             │
│   • PDF: f(x) = λ * e^(-λx)                                     │
│   • CDF: F(x) = 1 - e^(-λx)                                     │
│   • Mean: E(X) = 1/λ                                            │
│   • Variance: Var(X) = 1/λ²                                     │
│   • Lambda Estimation: λ = 1 / mean(response_time)             │
│                                                                   │
│ ▼ Features                                                       │
│   1. Synthetic Data Generation                                   │
│   2. Statistical Analysis                                        │
│   3. Probability Analysis                                        │
│   4. SLA Monitoring                                              │
│   5. Interactive Visualizations                                  │
│                                                                   │
│ ▼ Limitations & Considerations                                   │
│   Real-world server response times may be affected by:           │
│   • Network Latency                                              │
│   • CPU Load                                                     │
│   • Database Latency                                             │
│   • Concurrency                                                  │
│   • Queueing                                                     │
│   • Cache Behavior                                               │
│   • Request Complexity                                           │
│   • Resource Contention                                          │
│                                                                   │
│ [Continue reading in About tab...]                              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## User Interaction Flow

### First Time User Flow

```
1. Open Application
   ↓
2. Configure Sidebar
   ├─ Set number of requests (default: 5000)
   ├─ Set lambda (default: 1.0)
   ├─ Optionally enable reproducible seed
   └─ Click "Generate New Data"
   ↓
3. View Tab 1 - Overview
   ├─ See KPI cards
   ├─ Review statistics table
   └─ Check percentiles table
   ↓
4. View Tab 2 - Visualizations
   ├─ Study histogram
   ├─ Compare PDF curves
   ├─ Analyze CDF
   └─ Review survival curve
   ↓
5. View Tab 3 - Probability Analysis
   ├─ Set threshold in sidebar
   ├─ See probability calculations
   └─ Review mathematical formulas
   ↓
6. View Tab 4 - SLA Monitoring
   ├─ Define SLA rules in sidebar
   ├─ Check compliance status
   └─ Estimate required thresholds
   ↓
7. View Tab 5 - About
   └─ Read documentation
```

## Example Output Scenarios

### Scenario 1: Fast Service (λ = 2.0)

```
Mean Response Time: 0.50s
P90: 1.15s
P95: 1.50s
P99: 2.30s

SLA 1: 95% within 1.0s  → Status: ✅ PASS (actual: 86.47%)
SLA 2: 99% within 2.0s  → Status: ✅ PASS (actual: 86.47%)
```

### Scenario 2: Normal Service (λ = 1.0)

```
Mean Response Time: 1.00s
P90: 2.30s
P95: 3.00s
P99: 4.61s

SLA 1: 95% within 2.0s  → Status: ✅ PASS (actual: 86.47%)
SLA 2: 99% within 5.0s  → Status: ✅ PASS (actual: 99.33%)
```

### Scenario 3: Slow Service (λ = 0.5)

```
Mean Response Time: 2.00s
P90: 4.61s
P95: 5.99s
P99: 9.21s

SLA 1: 95% within 5.0s  → Status: ✅ PASS (actual: 86.47%)
SLA 2: 99% within 10.0s → Status: ✅ PASS (actual: 99.33%)
```

## Hover Information Examples

### Histogram Hover

```
Response Time Range: 0.5 - 0.6s
Count: 487
```

### PDF Chart Hover

```
Time: 1.0234s
Density: 0.3589
```

### CDF Chart Hover

```
Time: 2.3026s
CDF: 0.9000
```

### Percentile Chart Hover

```
Percentile: P95
Response Time: 2.9957s
```

## Tips for Interpreting Charts

### Histogram
- **Right-skewed:** Typical for exponential (long tail)
- **Peak on left:** Most responses are fast
- **Long tail:** Some very slow responses

### PDF Comparison
- **Red curve:** Perfect theoretical model
- **Blue bars:** Actual observed data
- **Overlap:** How well data matches theory

### CDF Chart
- **Steep curve:** Fast growth to 1.0
- **Flat curve:** Slow asymptotic approach
- **S-shape:** Typical for well-fit data

### Percentile Curve
- **Linear growth:** Not exponential
- **Smooth curve:** Indicates good data
- **Key points marked:** P50, P90, P95, P99

### SLA Chart
- **Green bars:** Passing SLAs
- **Red bars:** Failing SLAs
- **Above line:** Good compliance

---

**This visual guide shows typical layouts and outputs. Actual appearance will vary based on your configuration and data.**

For interactive exploration, run the application:
```bash
streamlit run app.py
```
