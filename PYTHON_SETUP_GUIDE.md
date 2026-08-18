# ⚠️ IMPORTANT: Python Not Found - Setup Guide

## 🔴 The Problem
Your system can't find Python. This means either:
1. Python is not installed
2. Python is installed but not in the system PATH

## ✅ Solution: Install Python Properly

### Step 1: Download Python
1. Go to: **https://www.python.org/downloads/**
2. Click **"Download Python 3.13"** (or latest version)
3. Wait for download to finish

### Step 2: Install Python
1. **Double-click** the downloaded file
2. **IMPORTANT:** Check this box ✓ **"Add Python to PATH"**
   - This is at the bottom of the first screen
   - Don't skip this!
3. Click **"Install Now"**
4. Wait for installation (2 minutes)
5. Click **"Close"** when done

### Step 3: Restart Your Computer
- **Very important!** 
- Windows needs to reload the PATH settings
- Restart your computer completely

### Step 4: Verify Python is Installed
1. Open **Command Prompt** (search for "cmd")
2. Type:
   ```
   python --version
   ```
3. Should show something like: `Python 3.13.0`
4. If it works, Python is ready! ✅

---

## 🚀 After Python is Installed

Once Python is working, you have **2 easy options:**

### Option A: Automatic Setup (Easiest)
1. Go to: `c:\Users\Aashin C\Cloud-Probability-simulation-\server-response-time-analyzer\`
2. Find file: `RUN.bat`
3. **Double-click it**
4. Wait 30 seconds
5. Browser opens with the app! ✅

### Option B: Manual Setup
1. Open **Command Prompt**
2. Copy and paste:
   ```
   cd /d "c:\Users\Aashin C\Cloud-Probability-simulation-\server-response-time-analyzer"
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   streamlit run app.py
   ```
3. Browser opens with the app! ✅

---

## 🎯 Quick Checklist

- [ ] Download Python from python.org
- [ ] Install Python with PATH checked ✓
- [ ] Restart computer
- [ ] Verify: Open cmd, type `python --version`
- [ ] Run `RUN.bat` OR follow manual setup
- [ ] Enjoy the app!

---

## 📞 Still Need Help?

### If Python shows as "not found"
1. Check that you restarted your computer
2. Try reinstalling Python
3. Make sure you checked ✓ "Add Python to PATH" during install

### If packages fail to install
1. Make sure Python is working first (step 4 above)
2. Try again with `RUN.bat`
3. If it fails, run this in Command Prompt:
   ```
   pip install --upgrade pip
   pip install streamlit numpy pandas scipy plotly
   ```

### If Streamlit still won't start
1. Make sure you're in the right folder
2. Make sure virtual environment is activated (see `(venv)` in command prompt)
3. Try: `streamlit run app.py --server.port 8502`

---

## 💡 Pro Tips

**To verify each step:**
- After installing Python: `python --version`
- After creating venv: Check if folder `venv` exists
- After activating venv: See `(venv)` in your command prompt
- After installing packages: `pip list` shows streamlit, numpy, etc.

---

## 🎓 Understanding the Installation

### What Each Step Does:

1. **Install Python** → Get the language
2. **Create venv** → Create isolated environment (like a sandbox)
3. **Activate venv** → Use that environment
4. **Install packages** → Add Streamlit, numpy, etc. to this environment
5. **Run app** → Start the dashboard

---

## ✨ Success Indicators

✅ You'll know it's working when:
- Command Prompt shows `(venv)` 
- No error messages appear
- Browser opens automatically
- Dashboard is visible at `http://localhost:8501`

---

**Once Python is installed, everything else is automatic!** 🚀

---

**Need to download Python?** → https://www.python.org/downloads/
