export type Theme = 'light' | 'dark' | 'system';
export type DefaultView = 'list' | 'grid';
export type EditorFont = 'system' | 'inter' | 'claude' | 'lora' | 'georgia' | 'times' | 'verdana' | 'arial' | 'courier' | 'mono';
export type AccentColor = 'blue' | 'sky' | 'indigo' | 'teal' | 'green' | 'yellow' | 'orange' | 'red' | 'pink' | 'violet' | 'magenta' | 'graphite';
export type PageColor = 'default' | 'paper' | 'white' | 'mist' | 'rose' | 'slate';

export interface AppSettings {
  id: 'singleton';

  // Authentication
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleTokenExpiry: number | null;
  userEmail: string | null;
  userName: string | null;
  userPhotoUrl: string | null;

  // Encryption
  encryptionEnabled: boolean;
  encryptionSalt: string | null;

  // Sync
  lastFullSyncTime: number | null;
  syncInterval: number; // minutes
  appFolderDriveId: string | null;
  notesFolderDriveId: string | null;
  attachmentsFolderDriveId: string | null;
  trashFolderDriveId: string | null;
  foldersFolderDriveId: string | null;

  // UI preferences
  theme: Theme;
  defaultView: DefaultView;
  sortBy: 'updatedAt' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
  editorFont: EditorFont;
  accentColor: AccentColor;
  pageColor: PageColor;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  listWidth: number;
  editorFontSize: number;
  editorLineHeight: number;
  focusMode: boolean;
  splitView: boolean;
  splitNoteId: string | null;
  typewriterMode: boolean;
  shortcuts: Record<string, string>;
  toolbarOrder?: string[];

  // Editor behaviour
  autosaveEnabled: boolean;

  // Lock (4-digit PIN for locked notes + password vault)
  pinSalt: string | null;
  pinHash: string | null;
  vaultPinSalt: string | null;
  vaultPinHash: string | null;

  // Backup (UpNote-style local backups of notes + notebooks)
  backupFrequency: 'off' | 'hourly' | 'daily' | 'weekly';
  backupMaxCount: number;
  backupDir: string | null;
  lastBackupAt: number | null;

  // Security
  autoLockEnabled: boolean;
  autoLockMinutes: number;
  lastUnlockedAt: number | null;

  // First-time setup
  onboardingCompleted: boolean;
}

export interface UpdateSettingsInput {
  theme?: Theme;
  defaultView?: DefaultView;
  sortBy?: 'updatedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  autoLockEnabled?: boolean;
  autoLockMinutes?: number;
  syncInterval?: number;
  encryptionEnabled?: boolean;
  editorFont?: EditorFont;
  accentColor?: AccentColor;
  pageColor?: PageColor;
  sidebarCollapsed?: boolean;
  autosaveEnabled?: boolean;
  sidebarWidth?: number;
  listWidth?: number;
  editorFontSize?: number;
  editorLineHeight?: number;
  focusMode?: boolean;
  splitView?: boolean;
  splitNoteId?: string | null;
  typewriterMode?: boolean;
  shortcuts?: Record<string, string>;
  toolbarOrder?: string[];
  pinSalt?: string | null;
  pinHash?: string | null;
  vaultPinSalt?: string | null;
  vaultPinHash?: string | null;
  backupFrequency?: 'off' | 'hourly' | 'daily' | 'weekly';
  backupMaxCount?: number;
  backupDir?: string | null;
  lastBackupAt?: number | null;
}
