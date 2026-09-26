import { z } from 'zod';

import { THEMES } from '../models/settings.model.js';

export const settingsSchema = z.object({
  theme: z.enum(THEMES),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
