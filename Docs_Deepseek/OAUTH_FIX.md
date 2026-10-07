# Fix OAuth "redirect_uri_mismatch" Error

## The Problem

You're seeing this error:
```
Access blocked: This app's request is invalid
Error 400: redirect_uri_mismatch
```

This happens because your Google OAuth configuration doesn't match the app's URL.

## Quick Solution: Use Offline Mode (EASIEST)

**Good news!** I've added a "Skip - Use Offline Only" button so you can use the app without Google OAuth.

### Steps:
1. Open http://localhost:5173 in your browser
2. Click "Get Started"
3. Click "**Skip - Use Offline Only**" (new button)
4. Start creating notes!

**Note:** In offline mode:
- ✅ All features work (create, edit, delete notes)
- ✅ Rich text editor fully functional
- ✅ Search works perfectly
- ✅ Dark mode, folders, tags all work
- ❌ No Google Drive sync (notes stay on your computer)
- ❌ No cross-device sync

You can connect Google Drive later from Settings!

---

## Full Solution: Fix OAuth Configuration

If you want Google Drive sync, follow these steps:

### Step 1: Go to Google Cloud Console

1. Open https://console.cloud.google.com
2. Select your project (probably "My Notes App")
3. Go to **"APIs & Services" → "Credentials"**

### Step 2: Edit Your OAuth Client

1. Find your OAuth 2.0 Client ID (probably named "My Notes Web Client")
2. Click the pencil/edit icon
3. Scroll to **"Authorized redirect URIs"**

### Step 3: Add/Update the Redirect URI

Make sure you have **EXACTLY** this URI (with no trailing slash):

```
http://localhost:5173/auth/callback
```

**Important:**
- Must be `http://` (not `https://`)
- Must be port `5173`
- Must have `/auth/callback`
- NO trailing slash

### Step 4: Save and Wait

1. Click "**Save**"
2. **Wait 5-10 minutes** for Google to update their servers
3. Clear your browser cache (Ctrl+Shift+Delete)
4. Try logging in again at http://localhost:5173

---

## Verify Your Configuration

Your `.env` file should look like this:

```env
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your-client-secret-here
```

Replace `your-client-id-here` and `your-client-secret-here` with your actual credentials from Google Cloud Console.

And in Google Cloud Console:

**Authorized JavaScript origins:**
```
http://localhost:5173
```

**Authorized redirect URIs:**
```
http://localhost:5173/auth/callback
```

---

## Still Having Issues?

### Clear Everything and Try Again

```powershell
# Stop the dev server (Ctrl+C if running)

# Clear browser data:
# 1. Press F12 to open DevTools
# 2. Right-click the refresh button
# 3. Click "Empty Cache and Hard Reload"

# Start fresh
npm run dev
```

Then visit http://localhost:5173

### Check the Diagnostic Page

Visit http://localhost:5173/diagnostics to see:
- Database status
- Environment variables
- Any configuration errors

---

## For Production Deployment

When you deploy to a real domain (e.g., mynotes.com):

1. Add to **Authorized JavaScript origins:**
   ```
   https://mynotes.com
   ```

2. Add to **Authorized redirect URIs:**
   ```
   https://mynotes.com/auth/callback
   ```

3. Update your production `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id
   ```

---

## Need More Help?

1. Check the browser console (F12) for detailed errors
2. Visit /diagnostics page for system status
3. Review OAUTH_SETUP_GUIDE.md for full setup instructions
4. Try in an incognito window to rule out browser cache issues

---

**Remember:** You can use the app in offline mode right now! Click "Skip - Use Offline Only" and start taking notes immediately.
