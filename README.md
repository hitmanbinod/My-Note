# My Notes - Secure Note-Taking App

A production-quality, offline-first Windows desktop app and Progressive Web App for personal note-taking with Google Drive synchronization, rich text editing, and optional end-to-end encryption.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google account (for cloud sync)

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up Google OAuth** (Required for cloud sync)
   
   Follow the detailed guide in `OAUTH_SETUP_GUIDE.md`:
   - Create Google Cloud Project
   - Enable Drive API
   - Configure OAuth consent screen
   - Create OAuth credentials
   - Add redirect URI: `http://localhost:5173/auth/callback`

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Google Client ID:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   
   Open http://localhost:5173

### Testing OAuth

Visit http://localhost:5173/auth-test to test your OAuth setup:
- ✅ Test sign in/out
- ✅ Verify token refresh
- ✅ Test Drive API access

### Windows desktop app

Run the desktop app locally:

```bash
npm run desktop
```

Create the 64-bit Windows installer:

```bash
npm run dist:win
```

The installer is written to `release-windows/My-Notes-Setup-1.0.1.exe`. Google Drive sync in the desktop app defaults to `http://localhost:5173/auth/callback`, matching the redirect URI configured above. You can override it with `VITE_GOOGLE_DESKTOP_REDIRECT_URI`, but the value must exactly match an authorized redirect URI in Google Cloud.

## Features

### Core
- 📝 Rich text editing with Tiptap
- 💾 Offline-first architecture with IndexedDB
- ☁️ Google Drive synchronization
- 🔒 Optional end-to-end encryption
- 📱 Progressive Web App (installable)
- 🌓 Dark mode support
- 📂 Folders and tags organization
- 🔍 Full-text search
- 📎 Image and file attachments
- ♻️ Trash and recovery

### Security
- OAuth 2.0 with PKCE flow
- AES-GCM encryption
- Secure key derivation (PBKDF2)
- Content Security Policy
- XSS protection
- Sanitized HTML output

## Architecture

### Local-First Design
```
UI → NoteService → IndexedDB (source of truth)
                       ↓
                  Sync Queue
                       ↓
                  Sync Engine
                       ↓
                 Google Drive API
```

### Technology Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Rich Text**: Tiptap (ProseMirror)
- **Database**: IndexedDB (Dexie.js)
- **PWA**: Vite PWA Plugin (Workbox)
- **Search**: MiniSearch
- **Authentication**: Google Identity Services

## Project Structure

```
src/
├── components/      # React components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── lib/
│   ├── db/         # Database layer (Dexie)
│   ├── crypto/     # Encryption utilities
│   └── utils/      # Utility functions
├── services/       # Business logic layer
└── types/          # TypeScript types
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Google Cloud Project with Drive API enabled
- OAuth 2.0 credentials

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd notebook_project
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` and add your Google OAuth credentials:
```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
```

4. Run development server
```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Google Cloud Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Note the Project ID

### 2. Enable APIs

1. Navigate to "APIs & Services" → "Library"
2. Enable:
   - Google Drive API
   - Google People API (for user profile)

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in app information:
   - App name: My Notes
   - User support email: your-email@example.com
4. Add scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. Add test users for development

### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: Web application
4. Authorized JavaScript origins:
   - `http://localhost:5173` (development)
   - Your production URL
5. Authorized redirect URIs:
   - `http://localhost:5173/auth/callback`
   - Your production URL + `/auth/callback`
6. Save the Client ID

## Data Storage

### Google Drive Structure

```
My Notes/
├── app.json                 # App metadata
├── notes/
│   ├── {uuid}.json         # Individual notes
│   └── ...
├── attachments/
│   ├── {uuid}.jpg          # Attachment files
│   └── ...
└── folders/
    └── folders.json        # Folder structure
```

### IndexedDB Schema

- **notes**: Note documents (encrypted or plaintext)
- **folders**: Folder organization
- **attachmentBlobs**: Cached attachment files
- **syncOperations**: Pending sync queue
- **settings**: App settings and auth tokens

## Development Status

### ✅ Completed
- [x] Project setup with Vite, React, TypeScript
- [x] TypeScript types and interfaces
- [x] IndexedDB database layer with Dexie.js
- [x] Repository pattern for data access
- [x] Encryption utilities (Web Crypto API)
- [x] Basic routing and authentication hooks
- [x] Theme support (light/dark/system)
- [x] Onboarding flow UI

### 🚧 In Progress
- [ ] NoteService business logic
- [ ] Tiptap editor integration
- [ ] UI component library
- [ ] Notes list and editor views
- [ ] Search functionality
- [ ] Google OAuth implementation
- [ ] Google Drive sync engine
- [ ] Attachment handling
- [ ] Import/export features

## Offline Support

The app works fully offline:
- ✅ Create, edit, delete notes
- ✅ Search notes
- ✅ Organize with folders and tags
- ✅ View cached attachments

Changes sync automatically when internet connection is restored.

## Security Considerations

### What This App Protects Against
- Basic XSS attacks
- Unauthorized Drive API access
- Casual device access (with app lock)
- Google Drive snooping (with encryption)

### What This App Cannot Protect Against
- Physical device access by determined attacker
- Browser vulnerabilities
- OS-level keyloggers
- Compromised Google account
- Malicious browser extensions

### Encryption Notes
- Encryption is **optional** and **user-controlled**
- Uses AES-GCM-256 with PBKDF2 key derivation
- **No password recovery** - lost password = lost data
- Encrypted notes have limited search capability

## Browser Support

### Minimum Requirements
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### Required APIs
- IndexedDB
- Service Worker (HTTPS only)
- Web Crypto API
- ES2020+ features

## License

MIT License - See LICENSE file for details

## Privacy

This application:
- Does not collect analytics or telemetry
- Does not send data to third-party servers
- Only communicates with Google Drive API
- Stores data locally and in your Google Drive
- You own your data completely

## Contributing

Contributions are welcome! Please read CONTRIBUTING.md for guidelines.

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- See documentation in `/docs`

## Acknowledgments

- Tiptap for excellent rich text editor
- Dexie.js for IndexedDB wrapper
- Tailwind CSS for styling
- Vite for build tooling
