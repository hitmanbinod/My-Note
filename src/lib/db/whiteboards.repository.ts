import { db } from './database';
import { CreateWhiteboardInput, UpdateWhiteboardInput, Whiteboard, WhiteboardScope } from '@/types/whiteboard';
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
      scope: input.scope ?? 'workspace',
      createdAt: now,
      updatedAt: now
    };

    await db.whiteboards.add(whiteboard);
    return whiteboard;
  }

  async get(id: string): Promise<Whiteboard | undefined> {
    return db.whiteboards.get(id);
  }

  /**
   * Boards of one scope only: the Whiteboards section lists 'workspace' boards,
   * in-note embeds pick from 'note' boards. The two never mix — deleting or
   * adding in one place leaves the other untouched. Boards created before the
   * scope field existed default to 'workspace'.
   */
  async list(scope: WhiteboardScope = 'workspace'): Promise<Whiteboard[]> {
    const all = await db.whiteboards.orderBy('updatedAt').reverse().toArray();
    return all.filter((board) => (board.scope ?? 'workspace') === scope);
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
