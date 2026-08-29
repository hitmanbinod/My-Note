import { db } from '@/lib/db/database';
import { arrayBufferToBase64 } from '@/lib/utils/crypto';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
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
  const verifier = arrayBufferToBase64(array.buffer as ArrayBuffer)
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
  if (!CLIENT_ID) {
    throw new Error('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in .env file.');
  }

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
    throw new Error('PKCE verifier not found in session storage. Please try signing in again.');
  }

  if (!CLIENT_ID) {
    throw new Error('Google Client ID not configured');
  }

  // For Web Applications, Google requires client_secret even with PKCE
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET || '', // Include client secret
    code: code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    code_verifier: verifier
  });

  console.log('Exchanging code for tokens...', {
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    has_code: !!code,
    has_verifier: !!verifier
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Token exchange error response:', error);
    throw new Error(`Failed to exchange code for tokens: ${error.error_description || error.error || response.statusText}`);
  }

  const tokens = await response.json();
  console.log('Tokens received successfully');

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

  if (!CLIENT_ID) {
    throw new Error('Google Client ID not configured');
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
    const error = await response.json().catch(() => ({}));
    throw new Error(`Failed to refresh token: ${error.error_description || response.statusText}`);
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
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const settings = await db.settings.get('singleton');
  return !!(settings?.googleAccessToken && settings?.googleRefreshToken);
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
    userPhotoUrl: null,
    onboardingCompleted: false
  });
}
