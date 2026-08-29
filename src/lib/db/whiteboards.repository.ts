import { db } from './database';
import { CreateWhiteboardInput, UpdateWhiteboardInput, Whiteboard } from '@/types/whiteboard';
import { generateUUID } from '@/lib/utils/uuid';
import { EMPTY_SCENE_JSON } from '@/lib/whiteboards/constants';

export class WhiteboardsRepository {
  async create(input: CreateWhiteboardInput = {}): Promise<Whiteboard> {
    const now = Date.now();
    const whiteboard: Whiteboard = {
      id: generateUUID(),
      title: input.title?.trim() || 'Untitled whiteboard',
      sceneJson: EMPTY_SCENE_JSON,
      previewDataUrl: null,
      createdAt: now,
      updatedAt: now
    };

    await db.whiteboards.add(whiteboard);
    return whiteboard;
  }

  async get(id: string): Promise<Whiteboard | undefined> {
    return db.whiteboards.get(id);
  }

  async list(): Promise<Whiteboard[]> {
    return db.whiteboards.orderBy('updatedAt').reverse().toArray();
  }

  async update(id: string, updates: UpdateWhiteboardInput): Promise<Whiteboard | undefined> {
    const updated = await db.whiteboards.update(id, { ...updates, updatedAt: Date.now() });
    return updated ? this.get(id) : undefined;
  }

  async delete(id: string): Promise<void> {
    await db.whiteboards.delete(id);
  }
}

export const whiteboardsRepository = new WhiteboardsRepository();
