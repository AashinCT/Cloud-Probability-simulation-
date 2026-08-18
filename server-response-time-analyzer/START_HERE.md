# 🚀 START HERE - Run the Application

## ⚡ EASIEST WAY - Just Click & Run!

### Option 1: Using Batch File (Easiest)

1. **Find the file:** `RUN.bat` in this folder
2. **Double-click it**
3. **Wait 30 seconds** for setup
4. **Browser opens automatically** ✅

---

### Option 2: Using PowerShell Script

1. **Right-click** in the folder (on empty space)
2. Select **"Open PowerShell window here"**
3. **Copy and paste this:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
   .\RUN.ps1
   ```
4. Press **Enter**
5. **Browser opens automatically** ✅

---

## 🔧 Manual Way (If scripts don't work)

### Step 1: Open Command Prompt or PowerShell
- Click Windows Start button
- Search for **"Command Prompt"** or **"PowerShell"**
- Open it

### Step 2: Copy & Paste This
```
cd /d "c:\Users\Aashin C\Cloud-Probability-simulation-\server-response-time-analyzer"
```

### Step 3: Create Virtual Environment
```
python -m venv venv
```
Wait 30 seconds...

### Step 4: Activate It
```
venv\Scripts\activate
```

### Step 5: Install Packages
```
pip install -r requirements.txt
```
Wait 1-2 minutes...

### Step 6: Run the App
```
streamlit run app.py
```

**Browser opens!** 🎉

---

## ❓ Common Problems & Fixes

### ❌ "Python not found"
**Fix:** Python is not installed. Download from [python.org](https://www.python.org)
- Download Python 3.8 or newer
- During installation: **CHECK** ✓ "Add Python to PATH"
- Restart your computer
- Try again

### ❌ "path with spaces" error
**Fix:** Use the `RUN.bat` file instead - it handles spaces automatically

### ❌ "No such file or directory"
**Fix:** Make sure you're in the right folder. Type:
```
cd /d "c:\Users\Aashin C\Cloud-Probability-simulation-\server-response-time-analyzer"
```

### ❌ "streamlit not found"
**Fix:** Make sure you ran these:
```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### ❌ Port already in use
**Fix:** Use a different port:
```
streamlit run app.py --server.port 8502
```

---

## ✅ What Should Happen

1. ✅ Terminal shows messages about setup
2. ✅ Packages get installed
3. ✅ Browser opens automatically
4. ✅ Dashboard appears at `http://localhost:8501`
5. ✅ You see the blue Streamlit interface

---

## 🎮 First Time Using the App

1. Look at the **left sidebar**
2. Keep **Lambda = 1.0** (default is fine)
3. Keep **Requests = 5000** (default is fine)
4. Click the blue **"🔄 Generate New Data"** button
5. Wait 2 seconds
6. Click the **other tabs** at the top to explore!

---

## 📖 Next Steps

Once it's running, explore:

- **Tab 1 (📈):** View statistics and numbers
- **Tab 2 (📊):** See all the charts
- **Tab 3 (🎯):** Learn about probabilities
- **Tab 4 (📋):** Check SLA compliance
- **Tab 5 (ℹ️):** Read about how it works

---

## 🆘 Still Stuck?

1. **Read:** `QUICK_START.md` in this folder
2. **Read:** `README.md` in this folder
3. **Look at:** `VISUAL_GUIDE.md` to see what to expect

---

## 🎯 The Simplest Way

**Just run this file:** `RUN.bat`

That's it! Everything else happens automatically. 🚀

---

**Version:** 1.0.0  
**Status:** ✅ Ready to Run
