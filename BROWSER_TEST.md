# Browser Console Tests

Run these commands in your browser console (F12) to test if everything is working.

## Step 1: Clear Everything and Start Fresh

```javascript
// Delete the database
indexedDB.deleteDatabase('NotesDB');
console.log('Database deleted. Now reload the page.');
```

Then **reload the page** (F5 or Ctrl+R).

---

## Step 2: Check Database Initialization

```javascript
// Check if database exists
indexedDB.databases().then(dbs => {
  const notesDb = dbs.find(db => db.name === 'NotesDB');
  if (notesDb) {
    console.log('✅ Database exists:', notesDb);
  } else {
    console.error('❌ Database not found!');
  }
});
```

---

## Step 3: Check Settings

```javascript
// Check settings
(async () => {
  const { db } = await import('/src/lib/db/database.ts');
  const settings = await db.settings.get('singleton');
  console.log('Settings:', settings);
})();
```

---

## Step 4: Create a Test Note

```javascript
// Create a test note
(async () => {
  const { db } = await import('/src/lib/db/database.ts');
  
  const testNote = {
    id: crypto.randomUUID(),
    title: 'Test Note',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'This is a test' }] }] },
    plainTextContent: 'This is a test',
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
  };
  
  await db.notes.add(testNote);
  console.log('✅ Test note created:', testNote.id);
  
  // Verify it was added
  const notes = await db.notes.toArray();
  console.log('Total notes:', notes.length);
  console.log('Notes:', notes);
})();
```

---

## Step 5: Check for Errors

Look in the console for any red error messages. Common issues:

- **QuotaExceededError**: Browser storage is full
- **VersionError**: Database schema mismatch
- **NotFoundError**: Database or table doesn't exist

---

## Expected Results

After running all tests, you should see:

✅ Database exists  
✅ Settings object present  
✅ Test note created successfully  
✅ No red errors in console  

---

## If Tests Fail

### Database Won't Create
```javascript
// Check if IndexedDB is available
if (window.indexedDB) {
  console.log('✅ IndexedDB is available');
} else {
  console.error('❌ IndexedDB not available in this browser');
}
```

### Settings Not Found
```javascript
// Manually create settings
(async () => {
  const { db } = await import('/src/lib/db/database.ts');
  await db.settings.add({
    id: 'singleton',
    googleAccessToken: null,
    googleRefreshToken: null,
    googleTokenExpiry: null,
    userEmail: null,
    userName: null,
    userPhotoUrl: null,
    encryptionEnabled: false,
    encryptionSalt: null,
    lastFullSyncTime: null,
    syncInterval: 15,
    appFolderDriveId: null,
    notesFolderDriveId: null,
    attachmentsFolderDriveId: null,
    trashFolderDriveId: null,
    foldersFolderDriveId: null,
    theme: 'system',
    defaultView: 'list',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    autoLockEnabled: false,
    autoLockMinutes: 15,
    lastUnlockedAt: null,
    onboardingCompleted: false
  });
  console.log('✅ Settings created');
})();
```

---

## Clear Browser Data (If All Else Fails)

1. Press F12
2. Go to "Application" tab
3. Click "Clear site data" button
4. Reload page
