# Quick Start Guide

## Get Started in 5 Minutes

### 1. Install Dependencies (1 minute)

```bash
# Navigate to project directory
cd server-response-time-analyzer

# Create virtual environment (recommended)
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate

# Install packages
pip install -r requirements.txt
```

### 2. Run Tests (30 seconds - optional)

```bash
python test_modules.py
```

Should see: `✅ All modules passed!`

### 3. Launch Dashboard (30 seconds)

```bash
streamlit run app.py
```

Opens at: `http://localhost:8501`

## First Run - What to Do

### Step 1: Configure Sidebar

1. **Data Generation:**
   - Keep "Number of Requests" = 5000
   - Lambda = 1.0 (average response time = 1 second)
   - Check "Use fixed random seed"
   - Click "Generate New Data" button

2. **SLA Configuration:**
   - SLA 1: Threshold = 2.0s, Required = 95%
   - (Optional) Add more SLA rules if desired

3. **Probability Calculator:**
   - Threshold = 1.0s

### Step 2: Explore Tabs

1. **Tab 1 - Overview:** See statistics summary
2. **Tab 2 - Visualizations:** View distribution charts
3. **Tab 3 - Probability:** Understand probabilities
4. **Tab 4 - SLA:** Check compliance status
5. **Tab 5 - About:** Read documentation

## Common Tasks

### Task: Model Faster Servers

```
Lambda = 2.0 (mean = 0.5 seconds)
SLA: 95% within 1.0 second
```

### Task: Model Slower Servers

```
Lambda = 0.5 (mean = 2.0 seconds)
SLA: 90% within 5.0 seconds
```

### Task: Analyze Compliance

1. Go to Tab 4 - SLA Monitoring
2. Define SLA rules in sidebar
3. Generate data
4. View compliance status (✅ PASS or ❌ FAIL)

### Task: Find Required Threshold

1. Go to Tab 4 - SLA Monitoring
2. Scroll to "Threshold Estimation"
3. Select target percentage (e.g., 99%)
4. See required response time

## Understanding the Math

### Lambda Parameter (λ)

- **λ = 1.0:** Average response time = 1 second
- **λ = 2.0:** Average response time = 0.5 seconds
- **λ = 0.5:** Average response time = 2 seconds

Formula: `λ = 1 / mean_response_time`

### Percentiles (P50, P90, P95, P99)

- **P50 (Median):** 50% of responses complete within this time
- **P95:** 95% of responses complete within this time
- **P99:** 99% of responses complete within this time

### SLA Example

"95% of requests must complete within 2 seconds"
- Threshold: 2.0 seconds
- Required: 95%
- Status: ✅ PASS if actual ≥ 95%, else ❌ FAIL

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+C` | Stop Streamlit server |
| `R` | Rerun app |
| `C` | Clear cache |
| `T` | Toggle theme |

## Tips & Tricks

### Tip 1: Reproducible Results
- Check "Use fixed random seed" for consistent data
- Same lambda → same distribution shape

### Tip 2: Compare Scenarios
- Change lambda in sidebar
- Click "Generate New Data"
- Observe how charts update

### Tip 3: SLA Planning
- Use "Threshold Estimation" to find required response times
- Plan infrastructure based on percentiles needed

### Tip 4: Debug Charts
- If charts don't display, try:
  - Refresh browser (F5)
  - Clear Streamlit cache: `streamlit cache clear`
  - Check browser console (F12)

## Troubleshooting

### "Python not found"
```bash
# Try python3 instead
python3 -m venv venv
```

### "ModuleNotFoundError: No module named 'streamlit'"
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### "Port 8501 already in use"
```bash
# Use different port
streamlit run app.py --server.port 8502
```

### "Dashboard looks broken"
```bash
# Clear cache and restart
streamlit cache clear
streamlit run app.py
```

## Next Steps

1. **Read Full Docs:** See `README.md` for comprehensive documentation
2. **Review Implementation:** See `IMPLEMENTATION_PLAN.md` for architecture
3. **Check Examples:** Look at different lambda values and SLA configurations
4. **Explore Charts:** Understand what each visualization shows
5. **Learn Math:** Review exponential distribution formulas in About tab

## File Structure

```
server-response-time-analyzer/
├── app.py                    # ⭐ Main app (run this!)
├── data_generator.py         # Generates synthetic data
├── analysis.py              # Statistical calculations
├── probability.py           # Probability functions
├── sla.py                   # SLA monitoring
├── visualization.py         # Chart creation
├── test_modules.py          # Run tests here
├── requirements.txt         # Install with pip
├── README.md               # Full documentation
├── QUICK_START.md          # This file
├── IMPLEMENTATION_PLAN.md  # Architecture details
└── data/
    └── response_times.csv  # (Optional) Data storage
```

## Example Workflows

### Workflow 1: Quick Analysis (2 minutes)

1. Set Lambda = 1.0, Requests = 5000
2. Click "Generate New Data"
3. View Tab 1 (Overview)
4. Check P95 percentile
5. Done! Know your 95th percentile response time

### Workflow 2: SLA Compliance Check (3 minutes)

1. Set Lambda = 0.5 (slower servers)
2. Add SLA: 2.5s, 90%
3. Generate Data
4. Go to Tab 4
5. Check: Are we 90% within 2.5s?
6. Adjust threshold based on actual compliance

### Workflow 3: Performance Analysis (5 minutes)

1. Generate data with Lambda = 1.0
2. Go to Tab 2 (Visualizations)
3. Study all 5 charts
4. Understand distribution shape
5. Note the exponential "long tail"

## Support & Resources

### In-App Help
- **About Tab (Tab 5):** Full documentation
- **Sidebar:** Hover tooltips on all controls
- **Charts:** Hover for exact values

### Files
- `README.md` - Comprehensive guide
- `IMPLEMENTATION_PLAN.md` - Technical details
- `QUICK_START.md` - This file

### Questions?
1. Check About tab (Tab 5)
2. Read README.md
3. Review mathematical formulas
4. Check for typos in inputs

---

**Ready?** Run this now:

```bash
cd server-response-time-analyzer
streamlit run app.py
```

Enjoy! 🚀
