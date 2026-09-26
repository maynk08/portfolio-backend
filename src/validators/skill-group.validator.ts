import { z } from 'zod';

import { optionalText, requiredText, TEXT_LIMITS } from './common.validator.js';

const MAX_SKILLS_PER_GROUP = 50;

const skillSchema = z.object({
  name: requiredText(TEXT_LIMITS.tag),
  icon: optionalText(TEXT_LIMITS.tag).refine(
    (icon) => icon === null || icon === undefined || /^[a-z0-9]+$/.test(icon),
    'Use a Simple Icons slug: lowercase letters and numbers, for example nodedotjs',
  ),
  isVisible: z.boolean().optional(),
});

const skillGroupFields = z.object({
  name: requiredText(TEXT_LIMITS.name),
  skills: z.array(skillSchema).max(MAX_SKILLS_PER_GROUP).optional(),
  isVisible: z.boolean().optional(),
});

export const createSkillGroupSchema = skillGroupFields;
export const updateSkillGroupSchema = skillGroupFields.partial();

export type CreateSkillGroupInput = z.infer<typeof createSkillGroupSchema>;
export type UpdateSkillGroupInput = z.infer<typeof updateSkillGroupSchema>;
