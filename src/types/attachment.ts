export interface AttachmentBlob {
  id: string;
  noteId: string;
  blob: Blob;
  driveFileId: string | null;
  cachedAt: number;
}

export interface UploadAttachmentInput {
  file: File;
  noteId: string;
  alt?: string;
  caption?: string;
}
