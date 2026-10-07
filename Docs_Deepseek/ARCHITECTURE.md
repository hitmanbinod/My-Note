# Architecture Documentation

## Overview

This document describes the architecture of the My Notes Progressive Web App, an offline-first note-taking application with Google Drive synchronization and optional end-to-end encryption.

## Core Principles

### 1. Local-First Architecture

The application follows a local-first design philosophy:

```
┌─────────────────────────────────────────┐
│          User Interface (React)         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│       Business Logic (Services)         │
│  • NoteService  • FolderService         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│    Data Access Layer (Repositories)     │
│  • NotesRepo  • FoldersRepo             │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         IndexedDB (Dexie.js)            │
│        Source of Truth                  │
└────────────────┬────────────────────────┘
                 │
         Asynchronous Sync
                 │
┌────────────────▼────────────────────────┐
│          Sync Queue Manager             │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│           Sync Engine                   │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│       Google Drive API Adapter          │
└────────────────┬────────────────────────┘
                 │
                 ▼
          [Google Drive]
```

**Key Characteristics:**
- All operations complete immediately against local storage
- Network is never on the critical path
- Sync happens in the background
- Application works fully offline

### 2. Data Flow

#### Write Operations
1. User creates/updates note in UI
2. `NoteService` validates and processes
3. Repository saves to IndexedDB immediately
4. Operation queued in `syncOperations` table
5. Background sync uploads to Google Drive when online

#### Read Operations
1. UI requests data via hooks (`useNotes`, `useFolders`)
2. Dexie live queries watch IndexedDB
3. UI automatically updates when data changes
4. No network calls needed for reads

## Technology Stack

### Frontend Framework
- **React 18+**: UI library with concurrent features
- **TypeScript**: Static typing for safety
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing

### State Management
- **Dexie.js**: IndexedDB wrapper with live queries
- **dexie-react-hooks**: React integration
- **React hooks**: Local component state

### UI Framework
- **Tailwind CSS**: Utility-first styling
- **Headless UI**: Accessible components
- **Custom components**: Reusable UI primitives

### Rich Text Editing
- **Tiptap**: ProseMirror wrapper
- **Extensions**: StarterKit, Link, Image, Table, TaskList, CodeBlock
- **Lowlight**: Syntax highlighting

### Search
- **MiniSearch**: Full-text search engine
- Features: Fuzzy matching, prefix search, field boosting

### Encryption
- **Web Crypto API**: Native browser cryptography
- **AES-GCM-256**: Symmetric encryption
- **PBKDF2**: Key derivation (100,000 iterations)

### PWA
- **Vite PWA Plugin**: Service worker generation
- **Workbox**: Caching strategies
- **Web App Manifest**: Installation metadata

## Database Schema

### IndexedDB Structure

```typescript
Database: NotesDB
├── notes (Table)
│   ├── id (primary key)
│   ├── title
│   ├── content (Tiptap JSON)
│   ├── plainTextContent (for search)
│   ├── tags (multi-entry index)
│   ├── folderId (index)
│   ├── createdAt, updatedAt (indexes)
│   ├── isPinned, isStarred, isArchived, isDeleted
│   ├── syncStatus (index)
│   ├── driveFileId, driveModifiedTime
│   └── encryption metadata
│
├── folders (Table)
│   ├── id (primary key)
│   ├── name
│   ├── parentId (index)
│   ├── color, icon
│   └── sync metadata
│
├── attachmentBlobs (Table)
│   ├── id (primary key)
│   ├── noteId (index)
│   ├── blob (actual file data)
│   ├── driveFileId
│   └── cachedAt
│
├── syncOperations (Table)
│   ├── id (primary key)
│   ├── type (create/update/delete)
│   ├── entityType, entityId
│   ├── status (index)
│   ├── retryCount
│   └── lastError
│
└── settings (Table)
    └── singleton configuration
```

### Google Drive Structure

```
My Notes/
├── app.json                 # App metadata
├── notes/
│   ├── {uuid-1}.json       # Individual note files
│   ├── {uuid-2}.json
│   └── {uuid-3}.json
├── attachments/
│   ├── {uuid-a}.jpg        # Attachment files
│   └── {uuid-b}.png
├── folders/
│   └── folders.json        # All folders (single file)
└── trash/
    └── {deleted-uuid}.json # Soft-deleted notes
```

**Design Decisions:**
- One JSON file per note (granular sync)
- Attachments as separate files (efficient)
- Human-readable format (data portability)
- User can inspect/backup via Drive UI

## Core Services

### NoteService

**Responsibilities:**
- Note CRUD operations
- Encryption/decryption handling
- Auto-save coordination
- Sync queue management

**Key Methods:**
```typescript
createNote(input: CreateNoteInput): Promise<Note>
updateNote(id: string, updates: UpdateNoteInput): Promise<Note>
deleteNote(id: string): Promise<void>
listNotes(filter?: NoteFilter): Promise<Note[]>
searchNotes(query: string): Promise<Note[]>
togglePin/Star/Archive(id: string): Promise<void>
```

**Encryption Handling:**
- Checks if encryption is enabled
- Requires unlock before accessing encrypted notes
- Encrypts notes before saving if enabled
- Throws error if locked

### FolderService

**Responsibilities:**
- Folder management
- Hierarchy handling (future: nested folders)
- Sync coordination

**Key Methods:**
```typescript
createFolder(input: CreateFolderInput): Promise<Folder>
updateFolder(id: string, updates: UpdateFolderInput): Promise<Folder>
deleteFolder(id: string): Promise<void>
listFolders(): Promise<Folder[]>
```

### SearchEngine

**Responsibilities:**
- Full-text indexing
- Search execution
- Auto-suggestions

**Features:**
- Indexes title (3x boost), tags (2x boost), content (1x boost)
- Fuzzy matching (0.2 tolerance)
- Prefix search
- Real-time index updates

## Encryption Architecture

### Key Management

```
User Password
     ↓
 PBKDF2 (100k iterations, SHA-256)
     ↓
 256-bit AES-GCM Key
     ↓
 Stored in memory only (session)
```

**Security Properties:**
- Key never persists to disk
- Requires password on every session
- Application locks after inactivity
- No password recovery possible

### Encrypted Note Format

```json
{
  "version": 1,
  "id": "uuid",
  "isEncrypted": true,
  "encryptionVersion": 1,
  "algorithm": "AES-GCM",
  "iv": "base64...",
  "salt": "base64...",
  "encryptedBlob": "base64...",
  "authTag": "base64...",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

**What's Encrypted:**
- Note title, content, tags
- Folder assignment
- Attachment metadata
- All user-visible content

**What's Not Encrypted:**
- Note ID (meaningless UUID)
- Timestamps (needed for sync)
- Encryption metadata

### Trade-offs

**Advantages:**
- True end-to-end encryption
- Google cannot read note contents
- Protects against Drive breach

**Disadvantages:**
- Search requires decryption (slower)
- No password recovery
- Cannot share encrypted notes
- Slightly more storage overhead

## Synchronization Strategy

### Conflict Detection

```typescript
enum SyncAction {
  UPLOAD,       // Local is newer
  DOWNLOAD,     // Remote is newer
  CONFLICT,     // Both changed
  NONE          // Already synced
}

function detectChanges(local: Note, remote: DriveFile): SyncAction {
  if (!local.driveFileId) return UPLOAD;  // New note
  if (!remote) return DELETE_LOCAL;       // Deleted remotely
  
  const localChanged = local.localVersion > local.lastSyncedVersion;
  const remoteChanged = remote.modifiedTime > local.driveModifiedTime;
  
  if (localChanged && !remoteChanged) return UPLOAD;
  if (!localChanged && remoteChanged) return DOWNLOAD;
  if (localChanged && remoteChanged) return CONFLICT;
  return NONE;
}
```

### Conflict Resolution

**Strategy: Preserve Both Versions**

```typescript
// When conflict detected:
1. Keep local version (user's current device wins)
2. Download remote version as "{Title} (Conflict Copy)"
3. Mark both as synced
4. Notify user with actionable message
```

**Rationale:**
- Never loses user data
- Automatic merging is error-prone for rich text
- User can manually merge if needed

### Sync Queue

**Operation Types:**
- `create`: New note created locally
- `update`: Existing note modified
- `delete`: Note moved to trash
- `upload_attachment`: New attachment added
- `delete_attachment`: Attachment removed

**Processing:**
1. Operations queued immediately (non-blocking)
2. Background worker processes queue when online
3. Exponential backoff on failures
4. Retries up to 5 times
5. Failed operations stay in queue

## Component Architecture

### Layout Components

**Header**
- Logo and app name
- Search bar (debounced)
- User menu (profile, settings, logout)
- Responsive (hamburger menu on mobile)

**Sidebar**
- New note button
- Navigation (All, Starred, Archive, Trash)
- Folder list with counts
- Create folder inline
- Mobile: slide-over drawer

**Layout**
- Wraps all authenticated pages
- Manages sidebar state
- Renders nested routes via Outlet

### Note Components

**NoteCard**
- Two views: list and grid
- Shows title, preview, tags
- Displays pins, stars, attachments
- Click to navigate to editor

**NoteList**
- Renders collection of NoteCards
- Empty states with helpful messages
- Loading spinner
- Supports both view modes

**NoteEditor**
- Title input (auto-save)
- Tiptap rich text editor
- Tag management (add/remove)
- Action buttons (pin, star, delete)
- Auto-save with debounce (1 second)
- Word count and metadata
- Navigation back to list

### Editor Components

**TiptapEditor**
- Wraps Tiptap's EditorContent
- Manages editor state
- Handles content changes
- Supports read-only mode

**EditorToolbar**
- Formatting buttons (bold, italic, etc.)
- Heading levels (H1-H3)
- Lists (bullet, ordered, task)
- Code blocks and quotes
- Link insertion modal
- Active state highlighting

## Hooks

### Data Hooks

**useNotes(filter?, sortBy?, sortOrder?)**
- Returns: `{ notes, loading, error }`
- Uses Dexie live queries
- Automatically decrypts if needed
- Updates reactively

**useNote(id)**
- Returns: `{ note, loading, error }`
- Single note lookup
- Decrypts if encrypted
- Updates access time

**useFolders()**
- Returns: `{ folders, loading }`
- All folders ordered by name
- Live query

**useSearch(query, options?)**
- Returns: `{ results, isSearching }`
- Full-text search via MiniSearch
- Auto-indexes notes
- Relevance-sorted results

### Utility Hooks

**useAuth()**
- Returns: `{ isAuthenticated, isLoading, user }`
- Checks for valid tokens
- Provides user info

**useTheme()**
- Returns: `{ theme, configuredTheme, setTheme }`
- Manages light/dark/system theme
- Listens to system changes
- Persists preference

## Security Architecture

### Content Security Policy

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://lh3.googleusercontent.com;
connect-src 'self' https://www.googleapis.com https://accounts.google.com;
frame-src https://accounts.google.com;
frame-ancestors 'none';
```

### Authentication Flow

1. User clicks "Connect Google Drive"
2. Generate PKCE code verifier and challenge
3. Redirect to Google OAuth consent screen
4. User grants permission
5. Google redirects back with authorization code
6. Exchange code + verifier for tokens
7. Store tokens encrypted in IndexedDB
8. Tokens auto-refresh before expiry

### OAuth Scopes

```
https://www.googleapis.com/auth/drive.file
```

**Why this scope:**
- Only accesses files created by this app
- User can see files in Drive UI (unlike appdata)
- Minimal permissions principle
- User maintains control

### Threat Model

**Protected Against:**
- XSS attacks (CSP, sanitization)
- Basic token theft (encrypted storage)
- Casual device access (app lock)
- Google Drive snooping (encryption)
- Link injection (URL validation)

**Not Protected Against:**
- Determined attacker with physical access
- Browser/OS vulnerabilities
- Compromised Google account
- Malicious browser extensions
- Supply chain attacks

## Performance Optimizations

### Bundle Optimization

**Code Splitting:**
- Route-based splitting (React.lazy)
- Vendor chunks (react, tiptap, dexie)
- Dynamic imports for heavy features

**Tree Shaking:**
- ES modules everywhere
- Named exports
- Vite's automatic tree shaking

### Runtime Optimization

**Virtualization:**
- Large note lists use react-window
- Only render visible notes

**Debouncing:**
- Search input (300ms)
- Auto-save (1000ms)
- Resize handlers (150ms)

**Memoization:**
- useMemo for expensive computations
- useCallback for stable references
- React.memo for pure components

### Caching Strategy

**Service Worker:**
- App shell: Cache-first
- API responses: Network-first with fallback
- Attachments: Cache-first with expiration

**IndexedDB:**
- Primary data cache
- Attachment thumbnails (10KB limit)
- Eviction after 30 days

## Accessibility

### WCAG 2.2 AA Compliance

**Keyboard Navigation:**
- All features keyboard-accessible
- Visible focus indicators
- Tab order follows visual order
- Escape to dismiss modals

**Screen Reader Support:**
- Semantic HTML
- ARIA labels on icon buttons
- ARIA live regions for updates
- Landmark regions

**Visual:**
- Sufficient color contrast (4.5:1)
- Text resizable to 200%
- No reliance on color alone
- Focus visible at all times

### Keyboard Shortcuts

```
Ctrl/Cmd + N     Create new note
Ctrl/Cmd + K     Search notes
Ctrl/Cmd + B     Bold text
Ctrl/Cmd + I     Italic text
Ctrl/Cmd + U     Underline text
Ctrl/Cmd + Z     Undo
Ctrl/Cmd+Shift+Z Redo
Esc              Close modal/exit search
```

## Testing Strategy

### Unit Tests (Vitest)

**Coverage Areas:**
- Utility functions (crypto, text, date)
- Repository methods
- Service business logic
- Encryption/decryption
- Conflict detection

### Integration Tests

**Test Scenarios:**
- Create/read/update/delete flows
- Sync queue processing
- Search indexing
- Offline→online transitions

### E2E Tests (Playwright)

**User Journeys:**
- Complete onboarding flow
- Create and edit note
- Organize with folders/tags
- Search functionality
- Offline editing scenario
- Settings changes

## Deployment Architecture

### Static Hosting

**Cloudflare Pages:**
- Global CDN distribution
- Automatic HTTPS
- Edge caching
- Git-based deployments
- Preview deployments

### Build Process

```bash
1. npm install          # Install dependencies
2. npm run build        # TypeScript → JavaScript + bundling
3. Vite optimization    # Minification, splitting, hashing
4. PWA manifest         # Generate service worker
5. Output to dist/      # Static files ready
```

### CI/CD Pipeline

```yaml
GitHub Actions:
  1. Checkout code
  2. Setup Node.js
  3. Install dependencies
  4. Run tests
  5. Build production bundle
  6. Deploy to Cloudflare Pages
```

## Future Enhancements

### Planned Features

1. **Google Drive Sync** (Tasks #15-18)
   - OAuth implementation
   - Drive API adapter
   - Sync queue processor
   - Conflict resolution UI

2. **Attachments** (Task #13)
   - Image upload and display
   - Drag-and-drop
   - Thumbnail generation
   - Cache management

3. **Folders** (Task #12)
   - Full folder management UI
   - Nested folders
   - Folder-specific search
   - Bulk move operations

4. **Import/Export** (Task #21)
   - JSON export
   - Markdown export
   - ZIP with attachments
   - Import from various formats

5. **PWA Enhancement** (Task #19)
   - Background sync
   - Push notifications
   - Offline indicators
   - Update prompts

### Advanced Features (Future)

- **Collaboration**: Share notes with others
- **Note linking**: Wiki-style [[links]]
- **Version history**: Time-travel through edits
- **Templates**: Reusable note structures
- **Canvas mode**: Infinite whiteboard
- **Voice notes**: Audio recording
- **OCR**: Extract text from images
- **AI assist**: Summaries, suggestions

## Troubleshooting

### Common Issues

**Build Fails:**
- Clear node_modules and reinstall
- Check Node.js version (18+)
- Verify all dependencies installed

**IndexedDB Errors:**
- Clear browser data
- Check browser compatibility
- Verify quota not exceeded

**Sync Not Working:**
- Check network connection
- Verify OAuth tokens valid
- Inspect sync queue in DevTools

**PWA Not Installing:**
- Ensure HTTPS enabled
- Check manifest.json served correctly
- Verify all icons accessible
- Clear service worker cache

## Contributing

See CONTRIBUTING.md for:
- Code style guidelines
- Pull request process
- Testing requirements
- Documentation standards

## License

MIT License - see LICENSE file
