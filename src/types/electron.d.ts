export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      startGoogleAuth: (authUrl: string, redirectUri: string) => Promise<string>;
    };
  }
}
