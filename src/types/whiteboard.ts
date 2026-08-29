export interface Whiteboard {
  id: string;
  title: string;
  sceneJson: string;
  previewDataUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateWhiteboardInput {
  title?: string;
}

export interface UpdateWhiteboardInput {
  title?: string;
  sceneJson?: string;
  previewDataUrl?: string | null;
}
