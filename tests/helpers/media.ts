import { MediaModel } from '../../src/models/media.model.js';

// Inserts a finished upload directly, for tests that only need something to reference; `fields` overrides the defaults.
export async function createReadyMedia(mimeType = 'image/png', fields: Record<string, unknown> = {}): Promise<string> {
  const media = await MediaModel.create({
    key: `media/${Math.random().toString(36).slice(2)}/file`,
    url: 'https://cdn.example.com/file',
    fileName: 'file',
    mimeType,
    size: 1000,
    status: 'ready',
    ...fields,
  });
  return media._id.toString();
}
