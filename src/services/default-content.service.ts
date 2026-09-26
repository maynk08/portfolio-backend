import { ensureProfile } from './profile.service.js';
import { ensureDefaultSections } from './section.service.js';
import { ensureSettings } from './settings.service.js';

// Runs at startup, before the server accepts requests, so the singletons and sections always exist.
export async function ensureDefaultContent(): Promise<void> {
  await Promise.all([ensureProfile(), ensureSettings(), ensureDefaultSections()]);
}
