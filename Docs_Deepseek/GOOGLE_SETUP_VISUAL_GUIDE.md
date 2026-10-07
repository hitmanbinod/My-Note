# Google OAuth Setup - Visual Step-by-Step Guide

## Current Issue: Can't Find "External" User Type Option

### What You're Seeing

**Scenario 1: You see this** ✅
```
┌─────────────────────────────────────┐
│  Select User Type                   │
├─────────────────────────────────────┤
│                                     │
│  ○ Internal                         │
│    Only for Google Workspace       │
│                                     │
│  ● External                         │
│    Available to any Google user    │
│                                     │
│  [Create]                           │
└─────────────────────────────────────┘
```
**Action:** Select "External" → Click "Create"

---

**Scenario 2: You see this** ✅ (This is also correct!)
```
┌─────────────────────────────────────┐
│  OAuth Consent Screen               │
├─────────────────────────────────────┤
│                                     │
│  App Information                    │
│  ────────────────                   │
│                                     │
│  App name: [              ]         │
│  User support email: [    ]        │
│  ...                                │
└─────────────────────────────────────┘
```
**Action:** Fill in the form directly (External is already selected)

---

### Why You Might Not See "External" Option

**Reason 1: Personal Google Account**
- Google automatically selects "External" for Gmail accounts
- You go straight to the configuration form
- This is NORMAL and CORRECT ✅

**Reason 2: Google Workspace Account**
- If you're using a company/school Google account
- You see "Internal" vs "External" choice
- Choose "External" to allow any Google user

**Reason 3: Already Configured**
- If you visited this page before
- The selection was already made
- You see the configuration form directly

---

## Complete Step-by-Step (Current 2024 Interface)

### Step 1: Navigate to OAuth Consent Screen

1. **Go to Google Cloud Console:** https://console.cloud.google.com
2. **Select your project** (the one you created)
3. **In left sidebar:** Click "APIs & Services"
4. **Click:** "OAuth consent screen"

### Step 2: What You'll See (3 Possibilities)

#### Possibility A: User Type Selection Screen
```
You see: "Select User Type" with radio buttons

What to do:
1. Select "External"
2. Click "Create"
3. Continue to Step 3
```

#### Possibility B: Configuration Form Directly
```
You see: "OAuth consent screen" with form fields

What to do:
1. This means External is already selected
2. Continue to Step 3 (fill the form)
```

#### Possibility C: Already Configured
```
You see: Your app details already filled in

What to do:
1. Click "Edit App" to modify
2. Or skip to creating credentials
```

### Step 3: Fill OAuth Consent Screen Form

**Page 1: App Information**

Fill in these fields:
```
App name: My Notes
User support email: [your-email@gmail.com] (dropdown)
App logo: [Skip - Leave empty]
Application home page: http://localhost:5173
Application privacy policy link: [Skip - Leave empty]
Application terms of service link: [Skip - Leave empty]
Authorized domains: [Skip - Leave empty for localhost]
Developer contact information: your-email@gmail.com
```

**Important fields (required):**
- ✅ App name
- ✅ User support email
- ✅ Developer contact email

**Optional fields (you can skip):**
- App logo
- Privacy policy
- Terms of service
- Authorized domains (only needed for production)

Click **"Save and Continue"**

---

**Page 2: Scopes**

1. Click **"Add or Remove Scopes"**
2. A popup appears with a list of scopes
3. In the filter box at top, search and select:
   ```
   ☑ .../auth/userinfo.email
   ☑ .../auth/userinfo.profile  
   ☑ .../auth/drive.file
   ```
4. Click **"Update"** (at bottom of popup)
5. Click **"Save and Continue"**

**What these scopes mean:**
- `userinfo.email` - Read user's email address
- `userinfo.profile` - Read user's name and photo
- `drive.file` - Access ONLY files created by your app (not all Drive files)

---

**Page 3: Test Users**

1. Click **"Add Users"**
2. Enter your email address: `your@gmail.com`
3. Click **"Add"**
4. Click **"Save and Continue"**

**Why add test users:**
- Your app is in "Testing" mode
- Only test users can sign in
- Prevents random people from using your app
- You can add more test users later

---

**Page 4: Summary**

1. Review the information
2. Click **"Back to Dashboard"**

---

### Step 4: Create OAuth Credentials

Now that OAuth consent is configured, create credentials:

1. **Go to:** "APIs & Services" → "Credentials"
2. **Click:** "Create Credentials" dropdown
3. **Select:** "OAuth client ID"

**You might see a warning:**
```
"To create an OAuth client ID, you must first configure 
your consent screen"
```
**If you see this:** You need to complete Step 3 above first.

**If no warning:** Continue below.

4. **Configure Application:**
   ```
   Application type: Web application
   Name: My Notes Web Client
   ```

5. **Authorized JavaScript origins:**
   - Click "Add URI"
   - Enter: `http://localhost:5173`
   - Press Enter

6. **Authorized redirect URIs:**
   - Click "Add URI"
   - Enter: `http://localhost:5173/auth/callback`
   - Press Enter
   - ⚠️ **Important:** No trailing slash!

7. Click **"Create"**

8. **Popup appears with credentials:**
   ```
   ┌──────────────────────────────────────┐
   │  OAuth client created                │
   ├──────────────────────────────────────┤
   │  Your Client ID:                     │
   │  123456789-abc.apps.googleusercontent.com │
   │                                      │
   │  Your Client Secret:                 │
   │  GOCSPX-xxxxxxxxxxxxx                │
   │                                      │
   │  [Download JSON]  [OK]               │
   └──────────────────────────────────────┘
   ```

9. **Copy the Client ID** (the long string ending in `.apps.googleusercontent.com`)
10. You DON'T need the Client Secret
11. Click **"OK"**

---

## Troubleshooting Common Issues

### Issue 1: "OAuth consent screen" menu item is missing

**Possible causes:**
- Wrong section of Google Cloud Console
- Project not selected

**Solution:**
1. Make sure you're in the correct project (check top nav bar)
2. Go to: **"APIs & Services"** (in left sidebar)
3. Look for **"OAuth consent screen"** submenu

---

### Issue 2: "You need a Google Workspace account to select Internal"

**What this means:**
- You're using a personal Gmail account
- "Internal" option is only for company Google Workspace accounts

**Solution:**
- This is fine! Use "External" (or it's already selected)
- External works for everyone
- Continue with the setup

---

### Issue 3: Can't find where to add scopes

**Solution:**
1. Make sure you're on the "Scopes" page (Step 2 of OAuth consent)
2. Look for button that says **"Add or Remove Scopes"**
3. If you don't see it, you might be on the wrong page
4. Go back to "OAuth consent screen" → Click "Edit App"

---

### Issue 4: Error when adding redirect URI

Common errors:

**"Invalid redirect URI"**
- Make sure it's exactly: `http://localhost:5173/auth/callback`
- Check for typos
- No trailing slash
- http not https for localhost

**"URI must use https"**
- Localhost is an exception - http is allowed
- Continue anyway

---

### Issue 5: "This app hasn't been verified"

**This is NORMAL for testing mode!**

**What it means:**
- Your app is in testing mode (not published)
- Google shows a warning to protect users
- It's safe because YOU made the app

**Solution:**
- Click "Advanced"
- Click "Go to My Notes (unsafe)"
- This only appears for test users
- Your app works fine

---

## Visual Checklist

After completing setup, verify:

### In Google Cloud Console:

**APIs & Services → Dashboard:**
```
Enabled APIs:
☑ Google Drive API
☑ Google People API
```

**APIs & Services → OAuth consent screen:**
```
Publishing status: Testing
User type: External
Test users: 1 (your email)
```

**APIs & Services → Credentials:**
```
OAuth 2.0 Client IDs:
☑ My Notes Web Client
   Type: Web application
   Authorized JavaScript origins: http://localhost:5173
   Authorized redirect URIs: http://localhost:5173/auth/callback
```

---

## What's Next?

After you have your Client ID:

1. **Copy the Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)

2. **In your project, create .env file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit .env and add your Client ID:**
   ```env
   VITE_GOOGLE_CLIENT_ID=paste-your-client-id-here.apps.googleusercontent.com
   ```

4. **Start the app:**
   ```bash
   npm run dev
   ```

5. **Test OAuth:**
   - Open: http://localhost:5173/auth-test
   - Click "Sign In with Google"
   - Should work!

---

## Quick Reference

### URLs You'll Need:
- **Google Cloud Console:** https://console.cloud.google.com
- **Your app (dev):** http://localhost:5173
- **Test page:** http://localhost:5173/auth-test
- **OAuth callback:** http://localhost:5173/auth/callback

### Settings to Copy-Paste:

**Authorized JavaScript Origins:**
```
http://localhost:5173
```

**Authorized Redirect URIs:**
```
http://localhost:5173/auth/callback
```

**Scopes (search for these in the scopes popup):**
```
userinfo.email
userinfo.profile
drive.file
```

---

## Still Stuck?

### Where are you stuck?

**At navigation:**
- Take a screenshot of what you see
- Check you selected the correct project (top bar)

**At user type selection:**
- If you don't see it, that's OK - it means External is already selected
- Continue to fill the form

**At scopes:**
- Click "Add or Remove Scopes" button
- Search for each scope by name
- Check the checkbox
- Click Update

**At credentials:**
- Make sure OAuth consent screen is completed first
- Then go to Credentials → Create Credentials → OAuth client ID

---

## Contact/Help

If you're stuck at a specific step:
1. Note which step number you're on
2. Note what you see on screen
3. Check if error message appears
4. Refer to troubleshooting section above

**Most common issue:** Being on the wrong page. Make sure you're in:
- APIs & Services section (left sidebar)
- Correct subsection (OAuth consent screen, Credentials, etc.)
- Correct project (check top bar)

---

## Summary

**The External/Internal selection:**
- ✅ If you see it: Choose "External"
- ✅ If you don't see it: External is already selected (continue)
- ✅ Both paths work fine

**Continue with the form and you'll be done in 20 minutes!**

Good luck! 🚀
