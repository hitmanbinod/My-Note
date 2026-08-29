import { Note, NoteSecrets, EncryptedNote } from '@/types';
import { arrayBufferToBase64, base64ToArrayBuffer, generateIV } from '@/lib/utils/crypto';

/**
 * Derive encryption key from password using PBKDF2
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt note data
 */
export async function encryptNote(note: Note, key: CryptoKey, salt: Uint8Array): Promise<EncryptedNote> {
  // Extract secrets to encrypt
  const secrets: NoteSecrets = {
    title: note.title,
    content: note.content,
    plainTextContent: note.plainTextContent,
    tags: note.tags,
    folderId: note.folderId,
    color: note.color,
    attachments: note.attachments,
    isPinned: note.isPinned,
    isStarred: note.isStarred,
    isArchived: note.isArchived,
    isDeleted: note.isDeleted,
    deletedAt: note.deletedAt,
    accessedAt: note.accessedAt,
    conflictCopyOf: note.conflictCopyOf
  };
  
  // Serialize secrets
  const plaintext = JSON.stringify(secrets);
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Generate random IV
  const iv = generateIV();
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    data.buffer as ArrayBuffer
  );
  
  // Split ciphertext and auth tag
  const ciphertextArray = new Uint8Array(ciphertext);
  const authTag = ciphertextArray.slice(-16);
  const encryptedData = ciphertextArray.slice(0, -16);
  
  return {
    id: note.id,
    isEncrypted: true,
    encryptedBlob: arrayBufferToBase64(encryptedData.buffer as ArrayBuffer),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    authTag: arrayBufferToBase64(authTag.buffer as ArrayBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    encryptionVersion: 1,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    syncStatus: note.syncStatus,
    driveFileId: note.driveFileId,
    driveModifiedTime: note.driveModifiedTime,
    localVersion: note.localVersion,
    lastSyncedVersion: note.lastSyncedVersion
  };
}

/**
 * Decrypt note data
 */
export async function decryptNote(encryptedNote: EncryptedNote, key: CryptoKey): Promise<Note> {
  // Reconstruct ciphertext with auth tag
  const encryptedData = base64ToArrayBuffer(encryptedNote.encryptedBlob);
  const authTag = base64ToArrayBuffer(encryptedNote.authTag);
  const iv = base64ToArrayBuffer(encryptedNote.iv);
  
  const ciphertext = new Uint8Array(encryptedData.byteLength + authTag.byteLength);
  ciphertext.set(new Uint8Array(encryptedData), 0);
  ciphertext.set(new Uint8Array(authTag), encryptedData.byteLength);
  
  // Decrypt
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      ciphertext
    );
    
    // Decode
    const decoder = new TextDecoder();
    const json = decoder.decode(plaintext);
    const secrets: NoteSecrets = JSON.parse(json);
    
    // Reconstruct note
    return {
      id: encryptedNote.id,
      ...secrets,
      syncStatus: encryptedNote.syncStatus,
      driveFileId: encryptedNote.driveFileId,
      driveModifiedTime: encryptedNote.driveModifiedTime,
      localVersion: encryptedNote.localVersion,
      lastSyncedVersion: encryptedNote.lastSyncedVersion,
      isEncrypted: true,
      encryptionVersion: encryptedNote.encryptionVersion,
      createdAt: encryptedNote.createdAt,
      updatedAt: encryptedNote.updatedAt
    };
  } catch (error) {
    throw new Error('Failed to decrypt note. Wrong password or corrupted data.');
  }
}

/**
 * Encrypt blob (for attachments)
 */
export async function encryptBlob(blob: Blob, key: CryptoKey): Promise<Blob> {
  const data = await blob.arrayBuffer();
  const iv = generateIV();
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    data as ArrayBuffer
  );
  
  // Prepend IV to ciphertext
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.length);
  
  return new Blob([result], { type: 'application/octet-stream' });
}

/**
 * Decrypt blob (for attachments)
 */
export async function decryptBlob(encryptedBlob: Blob, key: CryptoKey): Promise<Blob> {
  const data = await encryptedBlob.arrayBuffer();
  const dataArray = new Uint8Array(data);
  
  // Extract IV and ciphertext
  const iv = dataArray.slice(0, 12);
  const ciphertext = dataArray.slice(12);
  
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );
    
    return new Blob([plaintext]);
  } catch (error) {
    throw new Error('Failed to decrypt blob. Wrong key or corrupted data.');
  }
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters');
  } else {
    score += 1;
  }
  
  if (password.length >= 12) {
    score += 1;
  }
  
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include both uppercase and lowercase letters');
  }
  
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one number');
  }
  
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one special character');
  }
  
  return {
    isValid: score >= 3,
    score,
    feedback
  };
}
