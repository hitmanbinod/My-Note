import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db/database';
import { getValidAccessToken } from '@/lib/auth/google-auth';
import { ensureAppFolders, createJsonFile, deleteFile } from './drive-service';

vi.mock('@/lib/auth/google-auth', () => ({
  getValidAccessToken: vi.fn()
}));

describe('drive-service', () => {
  beforeEach(async () => {
    vi.mocked(getValidAccessToken).mockResolvedValue('test-token');
    await db.settings.update('singleton', {
      appFolderDriveId: null,
      notesFolderDriveId: null,
      attachmentsFolderDriveId: null,
      trashFolderDriveId: null,
      foldersFolderDriveId: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses cached folder ids from settings instead of calling Drive', async () => {
    await db.settings.update('singleton', {
      appFolderDriveId: 'app1',
      notesFolderDriveId: 'notes1',
      attachmentsFolderDriveId: 'att1',
      trashFolderDriveId: 'trash1',
      foldersFolderDriveId: 'folders1'
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const ids = await ensureAppFolders();

    expect(ids).toEqual({
      appFolderDriveId: 'app1',
      notesFolderDriveId: 'notes1',
      attachmentsFolderDriveId: 'att1',
      trashFolderDriveId: 'trash1',
      foldersFolderDriveId: 'folders1'
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends an authorized multipart request when creating a JSON file', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'file1', modifiedTime: '2024-01-01T00:00:00.000Z' }), { status: 200 })
    );

    const result = await createJsonFile('note.json', 'parent1', { hello: 'world' });

    expect(result).toEqual({ id: 'file1', modifiedTime: '2024-01-01T00:00:00.000Z' });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toContain('uploadType=multipart');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
    expect(String(init?.body)).toContain('"hello":"world"');
  });

  it('does not throw when deleting a file that is already gone', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not found', { status: 404 }));
    await expect(deleteFile('missing')).resolves.toBeUndefined();
  });
});
