export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      startGoogleAuth: (authUrl: string) => Promise<string>;
    };
  }
}
