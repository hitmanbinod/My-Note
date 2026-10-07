export type WhiteboardScope = 'note' | 'workspace';

export interface Whiteboard {
  id: string;
  title: string;
  sceneJson: string;
  previewDataUrl: string | null;
  /** 'workspace' boards live in the Whiteboards section; 'note' boards belong to the note that embedded them. */
  scope?: WhiteboardScope;
  createdAt: number;
  updatedAt: number;
}

export interface CreateWhiteboardInput {
  title?: string;
  scope?: WhiteboardScope;
}

export interface UpdateWhiteboardInput {
  title?: string;
  sceneJson?: string;
  previewDataUrl?: string | null;
}
