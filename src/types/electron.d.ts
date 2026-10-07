export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      startGoogleAuth: (authUrl: string, redirectUri: string) => Promise<string>;
      /** Native edit commands, routed through the main process so they act on
       * the focused element (editor selection, inputs) exactly like Ctrl+X/C/V. */
      editCut: () => Promise<void>;
      editCopy: () => Promise<void>;
      editPaste: () => Promise<void>;
      editPasteAndMatchStyle: () => Promise<void>;
      editSelectAll: () => Promise<void>;
      copyRich: (html: string, text: string) => Promise<void>;
      /** Recolor the native window-button strip so it follows the app theme (Windows overlay). */
      updateTitlebar: (color: string, symbolColor: string) => Promise<boolean>;
      /** Local backup folder access (UpNote-style backups). */
      backupSelectFolder: () => Promise<string | null>;
      backupWrite: (args: { dir: string; fileName: string; json: string; maxCount: number }) => Promise<void>;
      backupList: (dir: string) => Promise<Array<{ file: string; path: string; mtimeMs: number }>>;
      backupRead: (path: string) => Promise<string>;
      backupOpenFolder: (dir: string) => Promise<void>;
      importOpenFile: () => Promise<{ name: string; path: string; text: string } | null>;
      /** App auto-update (electron-updater via GitHub Releases). */
      checkForAppUpdate: () => Promise<{ version: string | null } | { error: string }>;
      installAppUpdate: () => Promise<void>;
      onAppUpdateStatus: (callback: (payload: { state: string; info?: { version?: string; percent?: number; message?: string } }) => void) => () => void;
    };
  }
}
