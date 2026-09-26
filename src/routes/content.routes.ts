import { createCrudRouter } from './crud.routes.js';
import { certificationService } from '../services/certification.service.js';
import { educationService } from '../services/education.service.js';
import { experienceService } from '../services/experience.service.js';
import { projectService } from '../services/project.service.js';
import { skillGroupService } from '../services/skill-group.service.js';
import { createCertificationSchema, updateCertificationSchema } from '../validators/certification.validator.js';
import { createEducationSchema, updateEducationSchema } from '../validators/education.validator.js';
import { createExperienceSchema, updateExperienceSchema } from '../validators/experience.validator.js';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js';
import { createSkillGroupSchema, updateSkillGroupSchema } from '../validators/skill-group.validator.js';

export const experienceRouter = createCrudRouter({
  service: experienceService,
  resourceName: 'Experience',
  createSchema: createExperienceSchema,
  updateSchema: updateExperienceSchema,
});

export const projectRouter = createCrudRouter({
  service: projectService,
  resourceName: 'Project',
  createSchema: createProjectSchema,
  updateSchema: updateProjectSchema,
});

export const skillGroupRouter = createCrudRouter({
  service: skillGroupService,
  resourceName: 'Skill group',
  createSchema: createSkillGroupSchema,
  updateSchema: updateSkillGroupSchema,
});

export const educationRouter = createCrudRouter({
  service: educationService,
  resourceName: 'Education entry',
  createSchema: createEducationSchema,
  updateSchema: updateEducationSchema,
});

export const certificationRouter = createCrudRouter({
  service: certificationService,
  resourceName: 'Certification',
  createSchema: createCertificationSchema,
  updateSchema: updateCertificationSchema,
});
