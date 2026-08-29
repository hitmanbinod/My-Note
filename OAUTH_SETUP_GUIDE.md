# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth for the My Notes application.

## Prerequisites

- A Google account (free Gmail account works)
- Access to Google Cloud Console (free, no credit card needed)
- Node.js 18+ installed
- The project running locally

## ⚠️ IMPORTANT: This is 100% FREE - No Credit Card Required!

**You DO NOT need:**
- ❌ Credit card or payment method
- ❌ Billing account
- ❌ Any paid Google Cloud services
- ❌ Money at all

**What we're using (all FREE):**
- ✅ OAuth 2.0 authentication
- ✅ Google Drive API (free tier: 10,000 requests/day)
- ✅ People API (for user info)

This guide only uses **FREE** features that don't require billing.

## Step 1: Create Google Cloud Project (5 minutes)

1. **Go to Google Cloud Console**
   - Open https://console.cloud.google.com
   - Sign in with your Google account

2. **Create New Project**
   - Click the project dropdown at the top
   - Click "New Project"
   - Enter project name: `My Notes App`
   - Click "Create"
   - Wait for the project to be created (takes ~30 seconds)

3. **Select Your Project**
   - Click the project dropdown again
   - Select "My Notes App"j

## Step 2: Enable Required APIs (3 minutes)

**Note:** These APIs are FREE and don't require billing to be enabled.

1. **Enable Google Drive API**
   - In the left sidebar, go to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click on "Google Drive API"
   - Click "Enable"
   - Wait for activation

2. **Enable Google People API** (for user info)
   - Go back to "Library"
   - Search for "Google People API"
   - Click on it
   - Click "Enable"

## Step 3: Configure OAuth Consent Screen (10 minutes)

### Option A: If you see "External" vs "Internal" choice

1. **Start Configuration**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Select **"External"** user type (allows any Google account)
   - Click "Create"

### Option B: If you DON'T see user type selection (newer accounts)

1. **Start Configuration**
   - Go to "APIs & Services" → "OAuth consent screen"
   - You may see the form directly (Google pre-selected External for you)
   - This is normal for personal Google accounts
   - Continue to step 2 below

2. **Fill App Information**
   ```
   App name: My Notes
   User support email: [your-email@gmail.com]
   App logo: [Optional - skip for now]
   Application home page: http://localhost:5173
   Application privacy policy: [Optional - skip for now]
   Application terms of service: [Optional - skip for now]
   Authorized domains: [Leave empty for localhost testing]
   Developer contact: [your-email@gmail.com]
   ```
   - Click "Save and Continue"

3. **Add Scopes**
   - Click "Add or Remove Scopes"
   - In the filter box, search for these scopes and select them:
     - ✅ `/auth/userinfo.email` - See your primary Google Account email address
     - ✅ `/auth/userinfo.profile` - See your personal info
     - ✅ `/auth/drive.file` - View and manage Google Drive files created by this app
   - Click "Update"
   - Click "Save and Continue"

4. **Add Test Users**
   - Click "Add Users"
   - Enter your email address (the one you'll use for testing)
   - Click "Add"
   - Click "Save and Continue"

5. **Review and Finish**
   - Review the summary
   - Click "Back to Dashboard"

## Step 4: Create OAuth Credentials (5 minutes)

1. **Create OAuth Client ID**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"

2. **Configure Application**
   ```
   Application type: Web application
   Name: My Notes Web Client
   ```

3. **Add Authorized JavaScript Origins**
   Click "Add URI" under "Authorized JavaScript origins" and add:
   ```
   http://localhost:5173
   ```

4. **Add Authorized Redirect URIs**
   Click "Add URI" under "Authorized redirect URIs" and add:
   ```
   http://localhost:5173/auth/callback
   ```

5. **Create Client**
   - Click "Create"
   - **IMPORTANT:** A dialog will appear with your credentials
   - Copy the **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
   - You don't need the Client Secret for this flow (PKCE)
   - Click "OK"

## Step 5: Configure Your Application (2 minutes)

1. **Create .env file**
   ```bash
   # In your project root directory
   cp .env.example .env
   ```

2. **Add Your Client ID**
   Open `.env` and replace the placeholder:
   ```env
   VITE_GOOGLE_CLIENT_ID=123456789-abcdefgh.apps.googleusercontent.com
   ```
   Paste your actual Client ID from Step 4

3. **Save the file**

## Step 6: Test the OAuth Flow (5 minutes)

1. **Start Development Server**
   ```bash
   npm install  # if you haven't already
   npm run dev
   ```

2. **Open the Application**
   - Open http://localhost:5173 in your browser
   - You should see the onboarding page

3. **Test Authentication**
   - Click "Get Started"
   - Click "Continue with Google"
   - You should be redirected to Google's login page
   - Sign in with your Google account (the one you added as a test user)
   - Grant the requested permissions
   - You should be redirected back to the app

4. **Verify Success**
   - Open browser DevTools (F12)
   - Go to Application → IndexedDB → NotesDB → settings
   - You should see:
     - `googleAccessToken`: [long string]
     - `googleRefreshToken`: [long string]
     - `userEmail`: your email
     - `userName`: your name
     - `userPhotoUrl`: your photo URL

5. **Test Sign Out**
   - Click your profile picture in the header
   - Click "Sign out"
   - You should be redirected to the onboarding page
   - Check IndexedDB again - tokens should be cleared

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause:** The redirect URI doesn't match what's configured in Google Cloud Console

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Click on your OAuth client ID
3. Under "Authorized redirect URIs", ensure you have exactly:
   ```
   http://localhost:5173/auth/callback
   ```
4. Note: No trailing slash, must be http (not https) for localhost
5. Click "Save"
6. Wait 5 minutes for changes to propagate
7. Try again

### Error: "Google Client ID not configured"

**Cause:** The .env file is missing or not loaded

**Solution:**
1. Ensure `.env` file exists in project root
2. Ensure it contains: `VITE_GOOGLE_CLIENT_ID=your-actual-client-id`
3. Restart the dev server (Ctrl+C, then `npm run dev`)
4. Try again

### Error: "access_denied"

**Cause:** User denied permissions or not added as test user

**Solution:**
1. Go to Google Cloud Console → OAuth consent screen → Test users
2. Add your email address
3. Try signing in again
4. Make sure to click "Allow" on the consent screen

### Error: "Failed to exchange code for tokens"

**Cause:** Network issue or invalid configuration

**Solution:**
1. Check browser console for detailed error message
2. Verify your internet connection
3. Ensure Client ID is correct (no extra spaces)
4. Try clearing browser cache and cookies
5. Try in an incognito/private window

### Tokens Not Storing

**Cause:** IndexedDB issue or quota exceeded

**Solution:**
1. Open DevTools → Application → Storage
2. Click "Clear site data"
3. Reload the page
4. Try authentication again

### "This app isn't verified" Warning

**Cause:** App is in testing mode (normal for development)

**Solution:**
1. This is expected for apps in development
2. Click "Advanced" → "Go to My Notes (unsafe)"
3. This is safe because you own the app
4. To remove warning, publish app (requires verification process)

## Adding Production Domain (For Deployment)

When you deploy to production (e.g., mynotes.app):

1. **Update OAuth Consent Screen**
   - Add your domain to "Authorized domains"
   - Example: `mynotes.app`

2. **Add Production URIs**
   - Go to Credentials → Edit OAuth client
   - Add to "Authorized JavaScript origins":
     ```
     https://mynotes.app
     ```
   - Add to "Authorized redirect URIs":
     ```
     https://mynotes.app/auth/callback
     ```
   - Click "Save"

3. **Update Environment Variables**
   - In your production environment, set:
     ```
     VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
     ```

## Security Notes

✅ **What's Secure:**
- Using PKCE flow (no client secret needed)
- Tokens stored in IndexedDB (more secure than localStorage)
- Minimal scopes requested (only `drive.file`)
- Tokens automatically refresh

⚠️ **Important:**
- Never commit your `.env` file to git (already in .gitignore)
- Never share your Client ID publicly (though it's not as sensitive as a secret)
- Keep test user list limited to people you trust
- For production, consider applying for OAuth verification

## Next Steps

Once OAuth is working:

1. ✅ Test creating a note
2. ✅ Implement Google Drive API integration (Phase 2)
3. ✅ Set up automatic sync (Phase 3)
4. ✅ Deploy to production

## Useful Links

- **Google Cloud Console:** https://console.cloud.google.com
- **OAuth 2.0 Playground:** https://developers.google.com/oauthplayground
- **Drive API Documentation:** https://developers.google.com/drive/api
- **OAuth 2.0 Guide:** https://developers.google.com/identity/protocols/oauth2

## Support

If you're still having issues:

1. Check the browser console for errors
2. Review the IndexedDB storage in DevTools
3. Verify all steps in this guide
4. Try in a different browser
5. Clear all browser data and start fresh

---

**Congratulations!** Once OAuth is working, you've completed the foundation for cloud sync. The app can now authenticate users and is ready for Google Drive integration.
