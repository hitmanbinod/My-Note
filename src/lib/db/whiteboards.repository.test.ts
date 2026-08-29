import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { whiteboardsRepository } from './whiteboards.repository';

describe('whiteboardsRepository', () => {
  beforeEach(async () => {
    await db.whiteboards.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a whiteboard with an empty Excalidraw scene', async () => {
    const created = await whiteboardsRepository.create({ title: 'Flow' });

    expect(created.title).toBe('Flow');
    expect(created.sceneJson).toContain('"type":"excalidraw"');
  });

  it('updates a whiteboard', async () => {
    const created = await whiteboardsRepository.create({ title: 'Flow' });

    await whiteboardsRepository.update(created.id, {
      title: 'Updated flow',
      sceneJson: '{"type":"excalidraw","version":2,"elements":[],"appState":{},"files":{}}'
    });

    expect((await whiteboardsRepository.get(created.id))?.title).toBe('Updated flow');
  });

  it('lists recently updated whiteboards first', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const older = await whiteboardsRepository.create({ title: 'Older' });
    now.mockReturnValue(2_000);
    const newer = await whiteboardsRepository.create({ title: 'Newer' });

    now.mockReturnValue(3_000);
    await whiteboardsRepository.update(older.id, { title: 'Newest' });

    expect((await whiteboardsRepository.list()).map(board => board.id)).toEqual([older.id, newer.id]);
  });

  it('deletes a whiteboard', async () => {
    const created = await whiteboardsRepository.create({ title: 'Flow' });

    await whiteboardsRepository.delete(created.id);
    expect(await whiteboardsRepository.get(created.id)).toBeUndefined();
  });
});
