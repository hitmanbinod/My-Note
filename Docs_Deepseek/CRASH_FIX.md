# Site Crashing - Complete Fix Guide

## The Problem

The app loads the UI but crashes when refreshing or doesn't respond to clicks. This is likely due to:
1. Database initialization race condition
2. Corrupted IndexedDB data
3. Browser caching issues

## Complete Fix (Step-by-Step)

### Step 1: Clear Browser Data

**This is the most important step!**

1. Open http://localhost:5173 in your browser
2. Press **F12** to open Developer Tools
3. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
4. In the left sidebar, find **Storage**
5. Click **"Clear site data"** button
6. Check all boxes:
   - Cookies
   - Local storage
   - Session storage
   - IndexedDB
   - Cache storage
7. Click **"Clear site data"**
8. Close the browser tab

### Step 2: Hard Refresh

1. Open a NEW browser tab
2. Go to http://localhost:5173
3. Do a **hard refresh**:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

### Step 3: Test the App

1. You should see the onboarding page
2. Click **"Get Started"**
3. Click **"Skip - Use Offline Only"**
4. You should now see the notes page

### Step 4: Create a Test Note

1. Look for a **"+"** or **"New Note"** button
2. Click it
3. Type a title and some content
4. The note should auto-save

---

## Alternative: Use Incognito Mode

If clearing data doesn't work, try **Incognito/Private mode**:

1. Open a new incognito window:
   - Chrome: `Ctrl + Shift + N`
   - Firefox: `Ctrl + Shift + P`
   - Edge: `Ctrl + Shift + N`
2. Go to http://localhost:5173
3. Complete onboarding
4. Try creating a note

---

## Check for Errors

### Open Browser Console

1. Press **F12**
2. Click the **Console** tab
3. Look for red error messages
4. Take a screenshot or copy the errors

### Common Errors and Fixes

#### Error: "Database initialization failed"

**Fix:**
```
1. Clear IndexedDB (see Step 1 above)
2. Reload the page
```

#### Error: "Cannot read property of undefined"

**Fix:**
```
1. This is usually a React rendering error
2. Clear browser data
3. Hard refresh
```

#### Error: "QuotaExceededError"

**Fix:**
```
1. Your browser storage is full
2. Go to chrome://settings/content/all
3. Find localhost:5173
4. Click "Clear data"
```

---

## Still Not Working?

### Try Different Browser

1. If using Chrome, try Firefox
2. If using Firefox, try Chrome
3. If using Edge, try Chrome

### Check Dev Server

1. Make sure the terminal shows:
   ```
   VITE v5.4.21  ready in XXX ms
   ➜  Local:   http://localhost:5173/
   ```

2. If not running, restart it:
   ```powershell
   # Stop it (Ctrl+C)
   # Then restart:
   npm run dev
   ```

### View Diagnostic Page

1. Go to: http://localhost:5173/diagnostics
2. This page shows:
   - Database status
   - Environment variables
   - Configuration
3. Take a screenshot and share it

---

## Manual Database Reset (Nuclear Option)

If nothing else works:

### Windows (PowerShell):

```powershell
# Stop the dev server (Ctrl+C)

# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install

# Restart
npm run dev
```

### Then in Browser:

1. Go to **chrome://settings/siteData**
2. Search for "localhost"
3. Click the trash icon next to localhost:5173
4. Visit http://localhost:5173 again

---

## Expected Behavior

### After Onboarding:

✅ You should see:
- Header with logo and user menu
- Sidebar with folders
- Main area saying "No notes yet. Create your first note!"
- A button or link to create a new note

### Creating a Note:

✅ You should be able to:
- Click "New Note" or "+" button
- Type a title
- Type content in the rich text editor
- See formatting toolbar (bold, italic, etc.)
- Have note auto-save

### UI Should Be:

✅ Responsive - no frozen or non-clickable elements
✅ Fast - buttons respond immediately
✅ Stable - no crashes on refresh

---

## What I've Fixed

1. ✅ Added proper database initialization wait
2. ✅ Added error boundary to catch React crashes
3. ✅ Fixed offline mode authentication
4. ✅ Fixed header to handle missing user data
5. ✅ Added loading states for database
6. ✅ Better error messages

---

## Debug Checklist

Use this to troubleshoot:

- [ ] Dev server is running on port 5173
- [ ] Browser shows "Initializing database..." then loads
- [ ] No red errors in console
- [ ] IndexedDB "NotesDB" exists (check in Application tab)
- [ ] Can reach onboarding page
- [ ] Can click "Skip - Use Offline Only"
- [ ] Can see notes page (even if empty)
- [ ] Can interact with UI elements

---

## Get Help

If still broken, provide:

1. **Screenshot of browser console** (F12 → Console tab)
2. **Screenshot of Application tab** showing IndexedDB
3. **What happens when** you click "Skip - Use Offline Only"
4. **Browser and version** (e.g., Chrome 120)
5. **Operating System** (Windows, Mac, Linux)

---

## Quick Test Commands

### Test Database:

Open console (F12) and paste:

```javascript
// Test if IndexedDB is accessible
indexedDB.databases().then(dbs => {
  console.log('Databases:', dbs);
  const notesDb = dbs.find(db => db.name === 'NotesDB');
  console.log('NotesDB exists:', !!notesDb);
});
```

### Clear Database:

Open console and paste:

```javascript
// Delete NotesDB
indexedDB.deleteDatabase('NotesDB');
console.log('Database deleted. Reload the page.');
```

---

**Last Resort:** If absolutely nothing works, I can help you rebuild the database schema or deploy a fresh version.
