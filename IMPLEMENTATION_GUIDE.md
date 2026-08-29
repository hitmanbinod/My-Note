# Step-by-Step Implementation Guide

## Remaining Work: Tasks 13, 15-21, 24 (9 tasks)

This guide provides detailed, step-by-step instructions for completing the remaining features. Follow these in order for the best results.

---

## 🎯 Phase 1: Google OAuth Authentication (Task #15)

**Estimated Time:** 4-6 hours  
**Difficulty:** Medium  
**Prerequisites:** Google Cloud account

### Step 1.1: Set Up Google Cloud Project (30 minutes)

1. **Create Project**
   ```
   1. Go to https://console.cloud.google.com
   2. Click "Select Project" → "New Project"
   3. Enter name: "My Notes App"
   4. Click "Create"
   5. Wait for project creation
   ```

2. **Enable APIs**
   ```
   1. In Google Cloud Console, go to "APIs & Services" → "Library"
   2. Search for "Google Drive API"
   3. Click on it and click "Enable"
   4. Go back and search for "Google People API"
   5. Click on it and click "Enable"
   ```

3. **Configure OAuth Consent Screen**
   ```
   1. Go to "APIs & Services" → "OAuth consent screen"
   2. Select "External" user type → Click "Create"
   3. Fill in:
      - App name: My Notes
      - User support email: your-email@gmail.com
      - Developer contact: your-email@gmail.com
   4. Click "Save and Continue"
   
   5. On "Scopes" page, click "Add or Remove Scopes"
   6. Filter and select these scopes:
      - /auth/drive.file
      - /auth/userinfo.email
      - /auth/userinfo.profile
   7. Click "Update" → "Save and Continue"
   
   8. On "Test users" page, click "Add Users"
   9. Add your email address (for testing)
   10. Click "Save and Continue"
   
   11. Review and click "Back to Dashboard"
   ```

4. **Create OAuth Credentials**
   ```
   1. Go to "APIs & Services" → "Credentials"
   2. Click "Create Credentials" → "OAuth client ID"
   3. Application type: "Web application"
   4. Name: "My Notes Web Client"
   
   5. Under "Authorized JavaScript origins":
      - Add: http://localhost:5173
      - Add: http://localhost:5173/
   
   6. Under "Authorized redirect URIs":
      - Add: http://localhost:5173/auth/callback
   
   7. Click "Create"
   8. **IMPORTANT**: Copy the Client ID (looks like: xxxxx.apps.googleusercontent.com)
   9. Click "OK"
   ```

5. **Configure Environment**
   ```bash
   # Create .env file in project root
   echo "VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com" > .env
   
   # Replace "your-client-id-here" with the actual Client ID from step 4.8
   ```

### Step 1.2: Implement OAuth Service (2 hours)

Create `src/lib/auth/google-auth.ts`:

```typescript
import { db } from '@/lib/db/database';
import { arrayBufferToBase64 } from '@/lib/utils/crypto';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}/auth/callback`;
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

/**
 * Generate PKCE code verifier and challenge
 */
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  // Generate random verifier
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = arrayBufferToBase64(array)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Create challenge from verifier
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const challenge = arrayBufferToBase64(hash)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { verifier, challenge };
}

/**
 * Initiate OAuth flow
 */
export async function initiateGoogleAuth(): Promise<void> {
  const { verifier, challenge } = await generatePKCE();

  // Store verifier in sessionStorage for later
  sessionStorage.setItem('pkce_verifier', verifier);

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent'
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  window.location.href = authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<void> {
  const verifier = sessionStorage.getItem('pkce_verifier');
  if (!verifier) {
    throw new Error('PKCE verifier not found');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    code: code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    code_verifier: verifier
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  const tokens = await response.json();

  // Store tokens in IndexedDB
  await db.settings.update('singleton', {
    googleAccessToken: tokens.access_token,
    googleRefreshToken: tokens.refresh_token,
    googleTokenExpiry: Date.now() + tokens.expires_in * 1000
  });

  // Fetch user info
  await fetchUserInfo(tokens.access_token);

  // Clear verifier
  sessionStorage.removeItem('pkce_verifier');
}

/**
 * Fetch user profile information
 */
async function fetchUserInfo(accessToken: string): Promise<void> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  const userInfo = await response.json();

  await db.settings.update('singleton', {
    userEmail: userInfo.email,
    userName: userInfo.name,
    userPhotoUrl: userInfo.picture
  });
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(): Promise<string> {
  const settings = await db.settings.get('singleton');
  if (!settings?.googleRefreshToken) {
    throw new Error('No refresh token available');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    refresh_token: settings.googleRefreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokens = await response.json();

  await db.settings.update('singleton', {
    googleAccessToken: tokens.access_token,
    googleTokenExpiry: Date.now() + tokens.expires_in * 1000
  });

  return tokens.access_token;
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken(): Promise<string> {
  const settings = await db.settings.get('singleton');
  
  if (!settings?.googleAccessToken) {
    throw new Error('Not authenticated');
  }

  // Check if token expires in next 5 minutes
  if (settings.googleTokenExpiry && Date.now() > settings.googleTokenExpiry - 5 * 60 * 1000) {
    return await refreshAccessToken();
  }

  return settings.googleAccessToken;
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await db.settings.update('singleton', {
    googleAccessToken: null,
    googleRefreshToken: null,
    googleTokenExpiry: null,
    userEmail: null,
    userName: null,
    userPhotoUrl: null
  });
}
```

### Step 1.3: Update Auth Pages (1 hour)

Update `src/pages/AuthPage.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeCodeForTokens } from '@/lib/auth/google-auth';
import Spinner from '@/components/ui/Spinner';

function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Authentication failed. Please try again.');
      setTimeout(() => navigate('/onboarding'), 3000);
      return;
    }

    if (code) {
      exchangeCodeForTokens(code)
        .then(() => {
          navigate('/notes', { replace: true });
        })
        .catch((err) => {
          console.error('Token exchange failed:', err);
          setError('Failed to complete authentication. Please try again.');
          setTimeout(() => navigate('/onboarding'), 3000);
        });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Authenticating...</p>
      </div>
    </div>
  );
}

export default AuthPage;
```

Update `src/pages/OnboardingPage.tsx` (replace handleConnect function):

```typescript
import { initiateGoogleAuth } from '@/lib/auth/google-auth';

// In the component, replace the handleConnect function:
const handleConnect = () => {
  initiateGoogleAuth().catch(error => {
    console.error('Auth initiation failed:', error);
    alert('Failed to start authentication. Please try again.');
  });
};
```

### Step 1.4: Update Header Component (30 minutes)

Update `src/components/layout/Header.tsx` (add sign out functionality):

```typescript
import { signOut } from '@/lib/auth/google-auth';
import { useNavigate } from 'react-router-dom';

// Inside the Header component:
const navigate = useNavigate();

const handleSignOut = async () => {
  if (confirm('Sign out of your Google account?')) {
    await signOut();
    navigate('/onboarding');
  }
};

// Update the sign out button onClick:
<button
  className="flex items-center gap-3 w-full px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
  onClick={handleSignOut}
>
  <LogoutIcon />
  Sign out
</button>
```

### Step 1.5: Test OAuth Flow (30 minutes)

```bash
# 1. Start dev server
npm run dev

# 2. Open http://localhost:5173

# 3. Test flow:
#    - Should redirect to /onboarding (not authenticated)
#    - Click "Continue with Google"
#    - Grant permissions
#    - Should redirect back and show /notes
#    - Check browser DevTools → Application → IndexedDB → NotesDB → settings
#    - Verify tokens are stored

# 4. Test refresh:
#    - Reload page
#    - Should stay authenticated
#    - Check Network tab for token refresh (if token expires)

# 5. Test sign out:
#    - Click user menu → Sign out
#    - Should clear tokens and redirect to onboarding
```

---

## 🎯 Phase 2: Google Drive API Adapter (Task #16)

**Estimated Time:** 6-8 hours  
**Difficulty:** High  
**Prerequisites:** Phase 1 complete

### Step 2.1: Create Drive API Service (3 hours)

Create `src/lib/drive/drive-api.ts`:

```typescript
import { getValidAccessToken } from '@/lib/auth/google-auth';
import { db } from '@/lib/db/database';

const API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * Initialize app folder structure in Google Drive
 */
export async function initializeDriveFolders(): Promise<void> {
  const settings = await db.settings.get('singleton');
  
  if (settings?.appFolderDriveId) {
    return; // Already initialized
  }

  const token = await getValidAccessToken();

  // Create main app folder
  const appFolder = await createFolder('My Notes', null, token);
  
  // Create subfolders
  const notesFolder = await createFolder('notes', appFolder.id, token);
  const attachmentsFolder = await createFolder('attachments', appFolder.id, token);
  const foldersFolder = await createFolder('folders', appFolder.id, token);
  const trashFolder = await createFolder('trash', appFolder.id, token);

  // Store folder IDs
  await db.settings.update('singleton', {
    appFolderDriveId: appFolder.id,
    notesFolderDriveId: notesFolder.id,
    attachmentsFolderDriveId: attachmentsFolder.id,
    foldersFolderDriveId: foldersFolder.id,
    trashFolderDriveId: trashFolder.id
  });
}

/**
 * Create folder in Drive
 */
async function createFolder(
  name: string,
  parentId: string | null,
  token: string
): Promise<{ id: string; name: string }> {
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId && { parents: [parentId] })
  };

  const response = await fetch(`${API_BASE}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!response.ok) {
    throw new Error(`Failed to create folder: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Upload note to Drive
 */
export async function uploadNoteToDrive(noteId: string): Promise<string> {
  const note = await db.notes.get(noteId);
  if (!note) throw new Error('Note not found');

  const settings = await db.settings.get('singleton');
  if (!settings?.notesFolderDriveId) {
    await initializeDriveFolders();
  }

  const token = await getValidAccessToken();
  const noteData = JSON.stringify(note, null, 2);

  // Multipart upload
  const boundary = '-------boundary' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--`;

  const metadata = {
    name: `${note.id}.json`,
    parents: [settings!.notesFolderDriveId!],
    mimeType: 'application/json'
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    noteData +
    close_delim;

  const response = await fetch(`${UPLOAD_BASE}/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!response.ok) {
    throw new Error(`Failed to upload note: ${response.statusText}`);
  }

  const result = await response.json();
  
  // Update local note with Drive ID
  await db.notes.update(noteId, {
    driveFileId: result.id,
    driveModifiedTime: result.modifiedTime,
    lastSyncedVersion: note.localVersion,
    syncStatus: 'synced'
  });

  return result.id;
}

/**
 * Update note in Drive
 */
export async function updateNoteInDrive(noteId: string): Promise<void> {
  const note = await db.notes.get(noteId);
  if (!note) throw new Error('Note not found');
  if (!note.driveFileId) {
    await uploadNoteToDrive(noteId);
    return;
  }

  const token = await getValidAccessToken();
  const noteData = JSON.stringify(note, null, 2);

  const boundary = '-------boundary' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    noteData +
    close_delim;

  const response = await fetch(
    `${UPLOAD_BASE}/files/${note.driveFileId}?uploadType=multipart`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update note: ${response.statusText}`);
  }

  const result = await response.json();
  
  await db.notes.update(noteId, {
    driveModifiedTime: result.modifiedTime,
    lastSyncedVersion: note.localVersion,
    syncStatus: 'synced'
  });
}

/**
 * Download note from Drive
 */
export async function downloadNoteFromDrive(driveFileId: string): Promise<any> {
  const token = await getValidAccessToken();

  const response = await fetch(
    `${API_BASE}/files/${driveFileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to download note: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * List files in folder
 */
export async function listFilesInFolder(folderId: string): Promise<any[]> {
  const token = await getValidAccessToken();
  const allFiles: any[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name, modifiedTime, md5Checksum, size)',
      pageSize: '1000',
      ...(pageToken && { pageToken })
    });

    const response = await fetch(`${API_BASE}/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }

    const data = await response.json();
    allFiles.push(...(data.files || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allFiles;
}

/**
 * Delete file from Drive
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const token = await getValidAccessToken();

  const response = await fetch(`${API_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete file: ${response.statusText}`);
  }
}

/**
 * Move file to trash
 */
export async function moveToTrashInDrive(fileId: string): Promise<void> {
  const token = await getValidAccessToken();

  const response = await fetch(`${API_BASE}/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ trashed: true })
  });

  if (!response.ok) {
    throw new Error(`Failed to trash file: ${response.statusText}`);
  }
}
```

### Step 2.2: Test Drive API (1 hour)

Create `src/lib/drive/drive-test.ts`:

```typescript
import { initializeDriveFolders, uploadNoteToDrive, listFilesInFolder } from './drive-api';
import { db } from '@/lib/db/database';

/**
 * Test Drive API integration
 */
export async function testDriveAPI(): Promise<void> {
  console.log('🧪 Testing Drive API...');

  try {
    // 1. Initialize folders
    console.log('1. Initializing Drive folders...');
    await initializeDriveFolders();
    console.log('✅ Folders initialized');

    // 2. Create test note
    console.log('2. Creating test note...');
    const testNote = await db.notes.add({
      id: crypto.randomUUID(),
      title: 'Test Note from My Notes App',
      content: { type: 'doc', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'This is a test note!' }] }
      ]},
      plainTextContent: 'This is a test note!',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      accessedAt: Date.now(),
      folderId: null,
      tags: ['test'],
      color: null,
      isPinned: false,
      isStarred: false,
      isArchived: false,
      isDeleted: false,
      deletedAt: null,
      attachments: [],
      syncStatus: 'pending',
      driveFileId: null,
      driveModifiedTime: null,
      localVersion: 1,
      lastSyncedVersion: 0,
      isEncrypted: false,
      encryptionVersion: 0,
      conflictCopyOf: null
    });
    console.log('✅ Test note created:', testNote);

    // 3. Upload to Drive
    console.log('3. Uploading note to Drive...');
    const driveFileId = await uploadNoteToDrive(testNote);
    console.log('✅ Note uploaded. Drive ID:', driveFileId);

    // 4. List notes in Drive
    console.log('4. Listing notes in Drive...');
    const settings = await db.settings.get('singleton');
    const files = await listFilesInFolder(settings!.notesFolderDriveId!);
    console.log('✅ Files in Drive:', files);

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}
```

Add test button to Settings page temporarily:

```typescript
// In src/pages/SettingsPage.tsx, add in AccountSection:
import { testDriveAPI } from '@/lib/drive/drive-test';

<Button onClick={() => testDriveAPI()}>
  Test Drive API
</Button>
```

---

## 🎯 Phase 3: Sync Queue Manager (Task #17)

**Estimated Time:** 4-5 hours  
**Difficulty:** Medium  
**Prerequisites:** Phase 2 complete

### Step 3.1: Create Sync Manager (3 hours)

Create `src/services/SyncManager.ts`:

```typescript
import { db } from '@/lib/db/database';
import { uploadNoteToDrive, updateNoteInDrive, deleteFileFromDrive } from '@/lib/drive/drive-api';

export class SyncManager {
  private isProcessing = false;
  private retryDelays = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m

  /**
   * Process all pending sync operations
   */
  async processSyncQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('Offline - skipping sync');
      return;
    }

    this.isProcessing = true;

    try {
      const pending = await db.syncOperations
        .where('status')
        .equals('pending')
        .sortBy('timestamp');

      console.log(`Processing ${pending.length} sync operations`);

      for (const operation of pending) {
        try {
          await this.processOperation(operation);
          await db.syncOperations.update(operation.id, {
            status: 'completed'
          });
        } catch (error) {
          await this.handleOperationError(operation, error);
        }
      }

      console.log('Sync queue processed');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single sync operation
   */
  private async processOperation(operation: any): Promise<void> {
    console.log(`Processing ${operation.type} operation for ${operation.entityType}:${operation.entityId}`);

    switch (operation.entityType) {
      case 'note':
        await this.processNoteOperation(operation);
        break;
      case 'folder':
        // TODO: Implement folder sync
        break;
      case 'attachment':
        // TODO: Implement attachment sync
        break;
      default:
        throw new Error(`Unknown entity type: ${operation.entityType}`);
    }
  }

  /**
   * Process note sync operation
   */
  private async processNoteOperation(operation: any): Promise<void> {
    const note = await db.notes.get(operation.entityId);

    switch (operation.type) {
      case 'create':
      case 'update':
        if (!note) {
          throw new Error('Note not found');
        }
        if (note.driveFileId) {
          await updateNoteInDrive(operation.entityId);
        } else {
          await uploadNoteToDrive(operation.entityId);
        }
        break;

      case 'delete':
        if (note?.driveFileId) {
          await deleteFileFromDrive(note.driveFileId);
        }
        await db.notes.delete(operation.entityId);
        break;

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Handle operation error with retry logic
   */
  private async handleOperationError(operation: any, error: any): Promise<void> {
    console.error(`Operation failed:`, error);

    const maxRetries = this.retryDelays.length;
    const newRetryCount = operation.retryCount + 1;

    if (newRetryCount >= maxRetries) {
      // Max retries reached - mark as failed
      await db.syncOperations.update(operation.id, {
        status: 'failed',
        lastError: error.message,
        retryCount: newRetryCount
      });
      console.error(`Operation failed after ${maxRetries} retries`);
    } else {
      // Schedule retry
      const delay = this.retryDelays[newRetryCount] || this.retryDelays[maxRetries - 1];
      await db.syncOperations.update(operation.id, {
        retryCount: newRetryCount,
        lastError: error.message
      });
      
      setTimeout(() => {
        this.processSyncQueue();
      }, delay);
      
      console.log(`Operation will retry in ${delay}ms (attempt ${newRetryCount + 1}/${maxRetries})`);
    }
  }

  /**
   * Start automatic sync
   */
  startAutoSync(intervalMinutes: number = 5): void {
    // Process queue immediately
    this.processSyncQueue();

    // Set up periodic sync
    setInterval(() => {
      this.processSyncQueue();
    }, intervalMinutes * 60 * 1000);

    // Listen for online events
    window.addEventListener('online', () => {
      console.log('Back online - processing sync queue');
      this.processSyncQueue();
    });
  }
}

export const syncManager = new SyncManager();
```

### Step 3.2: Integrate Sync Manager (1 hour)

Update `src/App.tsx`:

```typescript
import { useEffect } from 'react';
import { syncManager } from '@/services/SyncManager';
import { initializeDriveFolders } from '@/lib/drive/drive-api';

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Initialize sync when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      initializeDriveFolders()
        .then(() => {
          syncManager.startAutoSync(5); // Sync every 5 minutes
        })
        .catch(console.error);
    }
  }, [isAuthenticated, isLoading]);

  // ... rest of component
}
```

### Step 3.3: Add Sync Status Hook (30 minutes)

Create `src/hooks/useSyncStatus.ts`:

```typescript
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/database';

export function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const pendingCount = useLiveQuery(
    () => db.syncOperations.where('status').equals('pending').count(),
    [],
    0
  );

  const failedCount = useLiveQuery(
    () => db.syncOperations.where('status').equals('failed').count(),
    [],
    0
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const status = !isOnline
    ? 'offline'
    : pendingCount > 0
    ? 'syncing'
    : failedCount > 0
    ? 'error'
    : 'synced';

  return {
    status,
    isOnline,
    pendingCount,
    failedCount
  };
}
```

---

## 🎯 Phase 4: Remaining Quick Wins

### Task #19: PWA Service Worker (1 hour)

The service worker is already configured. Just need to verify:

```typescript
// Check vite.config.ts - already configured ✅
// Check public/manifest.json - already created ✅

// To activate, build and test:
npm run build
npm run preview

// Open in browser and check:
// 1. DevTools → Application → Service Workers (should be registered)
// 2. DevTools → Application → Manifest (should show app info)
// 3. Look for "Install" prompt in browser
```

### Task #20: Offline Indicators (2 hours)

Update `src/components/layout/Header.tsx`:

```typescript
import { useSyncStatus } from '@/hooks/useSyncStatus';

function Header({ onMenuClick, showSearch = true }: HeaderProps) {
  const { user } = useAuth();
  const { status, isOnline, pendingCount } = useSyncStatus();
  // ... rest of component

  // Add sync indicator before user menu:
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
    {status === 'offline' && (
      <>
        <span className="w-2 h-2 rounded-full bg-gray-400"></span>
        <span className="text-sm text-gray-600 dark:text-gray-400">Offline</span>
      </>
    )}
    {status === 'syncing' && (
      <>
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
        <span className="text-sm text-yellow-600 dark:text-yellow-400">
          Syncing {pendingCount}...
        </span>
      </>
    )}
    {status === 'synced' && isOnline && (
      <>
        <span className="w-2 h-2 rounded-full bg-green-400"></span>
        <span className="text-sm text-green-600 dark:text-green-400">Synced</span>
      </>
    )}
    {status === 'error' && (
      <>
        <span className="w-2 h-2 rounded-full bg-red-400"></span>
        <span className="text-sm text-red-600 dark:text-red-400">Sync Error</span>
      </>
    )}
  </div>
}
```

### Task #24: Keyboard Shortcuts (2 hours)

Create `src/components/ui/KeyboardShortcutsModal.tsx`:

```typescript
import Modal from './Modal';
import Badge from './Badge';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const shortcuts = [
    { keys: ['Ctrl', 'N'], description: 'Create new note' },
    { keys: ['Ctrl', 'K'], description: 'Search notes' },
    { keys: ['Ctrl', 'B'], description: 'Bold text' },
    { keys: ['Ctrl', 'I'], description: 'Italic text' },
    { keys: ['Ctrl', 'U'], description: 'Underline text' },
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
    { keys: ['Esc'], description: 'Close modal / Exit search' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
      <div className="space-y-3">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">{shortcut.description}</span>
            <div className="flex gap-1">
              {shortcut.keys.map((key, i) => (
                <Badge key={i} variant="default">
                  {key}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default KeyboardShortcutsModal;
```

Add to Header:

```typescript
const [showShortcuts, setShowShortcuts] = useState(false);

// Add button in header:
<IconButton
  icon={<KeyboardIcon />}
  label="Keyboard shortcuts"
  onClick={() => setShowShortcuts(true)}
/>

// Add modal:
<KeyboardShortcutsModal
  isOpen={showShortcuts}
  onClose={() => setShowShortcuts(false)}
/>
```

---

## 📋 Testing Checklist

After implementing each phase:

### Phase 1: OAuth Testing
- [ ] Can initiate OAuth flow
- [ ] Google consent screen appears
- [ ] Redirects back successfully
- [ ] Tokens stored in IndexedDB
- [ ] Tokens refresh automatically
- [ ] Sign out clears tokens
- [ ] User info displayed in header

### Phase 2: Drive API Testing
- [ ] App folders created in Drive
- [ ] Notes upload successfully
- [ ] Notes update successfully
- [ ] Can list notes in Drive
- [ ] Manual verification in Drive UI
- [ ] Error handling works

### Phase 3: Sync Testing
- [ ] Sync queue processes automatically
- [ ] Failed operations retry
- [ ] Online/offline detection works
- [ ] Background sync continues
- [ ] Status updates correctly

### Phase 4: Polish Testing
- [ ] PWA installs on desktop
- [ ] PWA installs on mobile
- [ ] Offline indicator shows
- [ ] Sync status accurate
- [ ] Keyboard shortcuts work

---

## 🎯 Priority Order

If you have limited time, implement in this order:

1. **Phase 1 (OAuth)** - Critical, 4-6 hours
2. **Phase 2 (Drive API)** - Critical, 6-8 hours
3. **Phase 3 (Sync)** - Important, 4-5 hours
4. **Task #20 (Indicators)** - Nice to have, 2 hours
5. **Task #19 (PWA)** - Already done, just verify, 1 hour
6. **Task #24 (Shortcuts)** - Polish, 2 hours

**Total time estimate: 19-24 hours of focused work**

---

## 🆘 Troubleshooting

### OAuth Issues
**Problem:** "redirect_uri_mismatch" error
**Solution:** Verify redirect URI in Google Console exactly matches `http://localhost:5173/auth/callback`

**Problem:** Tokens not storing
**Solution:** Check browser console for IndexedDB errors. Clear application data and try again.

### Drive API Issues
**Problem:** 401 Unauthorized
**Solution:** Token expired. Check refresh token logic. Try signing out and back in.

**Problem:** 403 Forbidden
**Solution:** Check scopes in Google Console. Ensure `drive.file` scope is enabled.

### Sync Issues
**Problem:** Queue not processing
**Solution:** Check browser console. Verify navigator.onLine. Check for JavaScript errors.

**Problem:** Operations stuck in pending
**Solution:** Check error messages in syncOperations table. May need to clear and retry.

---

## 📚 Additional Resources

- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **Google Drive API**: https://developers.google.com/drive/api/guides/about-sdk
- **PKCE Flow**: https://oauth.net/2/pkce/
- **IndexedDB**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

---

## ✅ Completion Criteria

You'll know you're done when:

1. ✅ User can sign in with Google
2. ✅ Notes sync to Google Drive automatically
3. ✅ Offline mode works completely
4. ✅ Sync status shows in header
5. ✅ PWA can be installed
6. ✅ All features work end-to-end

**Congratulations! You'll have a fully functional, production-ready note-taking PWA! 🎉**
