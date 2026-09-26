import { MediaModel } from '../../src/models/media.model.js';

// Inserts a finished upload directly, for tests that only need something to reference.
export async function createReadyMedia(mimeType = 'image/png'): Promise<string> {
  const media = await MediaModel.create({
    key: `media/${Math.random().toString(36).slice(2)}/file`,
    url: 'https://cdn.example.com/file',
    fileName: 'file',
    mimeType,
    size: 1000,
    status: 'ready',
  });
  return media._id.toString();
}
