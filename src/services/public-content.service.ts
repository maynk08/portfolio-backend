import { NEWEST_ISSUED_FIRST } from './certification.service.js';
import { loadPublicMedia } from './public-media.service.js';
import { manualOrderSort, newestFirstSort } from './shared/content-query.js';
import { NotFoundError } from '../errors/app-error.js';
import { CertificationModel } from '../models/certification.model.js';
import { EducationModel } from '../models/education.model.js';
import { ExperienceModel } from '../models/experience.model.js';
import { ProfileModel } from '../models/profile.model.js';
import { ProjectModel } from '../models/project.model.js';
import { SectionModel } from '../models/section.model.js';
import { SettingsModel } from '../models/settings.model.js';
import { SkillGroupModel } from '../models/skill-group.model.js';
import { MAX_SLUG_LENGTH, SLUG_PATTERN } from '../utils/slug.utils.js';

import type { PublicMediaLookup } from './public-media.service.js';
import type { StoredDocument } from './shared/content-query.js';
import type { Certification } from '../models/certification.model.js';
import type { Education } from '../models/education.model.js';
import type { Experience } from '../models/experience.model.js';
import type { Profile } from '../models/profile.model.js';
import type { Project } from '../models/project.model.js';
import type { Section, SectionKey } from '../models/section.model.js';
import type { SkillGroup } from '../models/skill-group.model.js';
import type {
  PublicCertification,
  PublicEducation,
  PublicExperience,
  PublicHome,
  PublicProfile,
  PublicProject,
  PublicProjectCard,
  PublicSection,
  PublicSite,
  PublicSkillGroup,
  PublicSocialLink,
} from '../types/public.types.js';
import type { Model, PipelineStage } from 'mongoose';

const QUERY_MAX_TIME_MS = 5_000;
// Singletons are created at startup; a missing one means startup did not finish, so it is a server error.
const MISSING_SINGLETON_MESSAGE = 'Profile or settings document is missing; ensureDefaultContent must run at startup';
const PROJECT_NOT_FOUND_MESSAGE = 'Project not found';

const VISIBLE = { isVisible: true };
const PROJECT_CARD_FIELDS = 'slug title summary role techStack liveUrl repoUrl coverImage isFeatured updatedAt';
const PROJECT_DETAIL_FIELDS = `${PROJECT_CARD_FIELDS} description gallery`;

type ListSectionKey = Exclude<SectionKey, 'hero' | 'about' | 'contact'>;

// Whether a list section has anything to show; must match what `buildSection` leaves out, so the nav matches the page.
const LIST_SECTION_HAS_CONTENT: Record<ListSectionKey, () => Promise<unknown>> = {
  experience: () => ExperienceModel.exists(VISIBLE),
  projects: () => ProjectModel.exists(VISIBLE),
  skills: () => SkillGroupModel.exists({ isVisible: true, 'skills.isVisible': true }),
  education: () => EducationModel.exists(VISIBLE),
  certifications: () => CertificationModel.exists(VISIBLE),
};

function isListSection(key: SectionKey): key is ListSectionKey {
  return Object.hasOwn(LIST_SECTION_HAS_CONTENT, key);
}

// Only visible items, sorted like the CMS lists them.
function findVisibleSorted<T>(model: Model<T>, sortStages: PipelineStage[]): Promise<StoredDocument<T>[]> {
  return model
    .aggregate<StoredDocument<T>>([{ $match: VISIBLE }, ...sortStages])
    .option({ maxTimeMS: QUERY_MAX_TIME_MS })
    .exec();
}

async function findVisibleSections(): Promise<StoredDocument<Section>[]> {
  return SectionModel.find(VISIBLE).sort({ order: 1, _id: 1 }).lean();
}

async function findProfile(): Promise<StoredDocument<Profile>> {
  const profile = await ProfileModel.findOne().lean();
  if (profile === null) {
    throw new Error(MISSING_SINGLETON_MESSAGE);
  }
  return profile;
}

// The project pages disappear together with the home page section.
async function assertProjectsSectionVisible(notFoundMessage: string): Promise<void> {
  if ((await SectionModel.exists({ key: 'projects', isVisible: true })) === null) {
    throw new NotFoundError(notFoundMessage);
  }
}

function shownValue<T>(field: { value?: T | null; isVisible: boolean } | null | undefined): T | null {
  return field?.isVisible === true ? (field.value ?? null) : null;
}

function toPublicSocialLinks(profile: StoredDocument<Profile>): PublicSocialLink[] {
  return profile.socialLinks
    .filter((link) => link.isVisible)
    .map((link) => ({ platform: link.platform, label: link.label ?? null, url: link.url }));
}

function toPublicProfile(profile: StoredDocument<Profile>, media: PublicMediaLookup): PublicProfile {
  return {
    name: profile.name,
    headline: profile.headline,
    heroPhrases: profile.heroPhrases,
    about: profile.about,
    photo: media.image(profile.photo),
    resume: media.document(profile.resume),
    socialLinks: toPublicSocialLinks(profile),
    location: shownValue(profile.location),
    publicEmail: shownValue(profile.publicEmail),
    isOpenToWork: shownValue(profile.isOpenToWork),
    yearsOfExperience: shownValue(profile.yearsOfExperience),
    languages: (shownValue(profile.languages) ?? []).map((language) => ({
      name: language.name,
      proficiency: language.proficiency ?? null,
    })),
  };
}

// About shows the text, the photo and the visible details; with none of them the section is left out of the page and
// the nav, like an empty list section.
function hasAboutContent(profile: PublicProfile): boolean {
  return (
    profile.about.trim() !== '' ||
    profile.photo !== null ||
    profile.location !== null ||
    profile.yearsOfExperience !== null ||
    profile.languages.length > 0
  );
}

function toPublicExperience(experience: StoredDocument<Experience>, media: PublicMediaLookup): PublicExperience {
  return {
    id: experience._id.toString(),
    company: experience.company,
    role: experience.role,
    location: experience.location ?? null,
    startDate: experience.startDate,
    endDate: experience.endDate ?? null,
    summary: experience.summary ?? null,
    highlights: experience.highlights,
    techStack: experience.techStack,
    companyLogo: media.image(experience.companyLogo),
    companyUrl: experience.companyUrl ?? null,
  };
}

function toPublicProjectCard(project: StoredDocument<Project>, media: PublicMediaLookup): PublicProjectCard {
  return {
    id: project._id.toString(),
    slug: project.slug,
    title: project.title,
    summary: project.summary ?? null,
    role: project.role ?? null,
    techStack: project.techStack,
    liveUrl: project.liveUrl ?? null,
    repoUrl: project.repoUrl ?? null,
    coverImage: media.image(project.coverImage),
    isFeatured: project.isFeatured,
    updatedAt: project.updatedAt,
  };
}

function toPublicSkillGroup(group: StoredDocument<SkillGroup>): PublicSkillGroup {
  return {
    id: group._id.toString(),
    name: group.name,
    skills: group.skills.filter((skill) => skill.isVisible).map((skill) => ({ name: skill.name, icon: skill.icon ?? null })),
  };
}

function toPublicEducation(education: StoredDocument<Education>, media: PublicMediaLookup): PublicEducation {
  return {
    id: education._id.toString(),
    institution: education.institution,
    degree: education.degree,
    field: education.field ?? null,
    startDate: education.startDate,
    endDate: education.endDate ?? null,
    grade: education.grade ?? null,
    description: education.description ?? null,
    logo: media.image(education.logo),
  };
}

function toPublicCertification(certification: StoredDocument<Certification>, media: PublicMediaLookup): PublicCertification {
  return {
    id: certification._id.toString(),
    name: certification.name,
    issuer: certification.issuer,
    issueDate: certification.issueDate,
    expiryDate: certification.expiryDate ?? null,
    credentialId: certification.credentialId ?? null,
    credentialUrl: certification.credentialUrl ?? null,
    badge: media.image(certification.badge),
  };
}

export async function getPublicSite(): Promise<PublicSite> {
  const [settings, profile, sections] = await Promise.all([
    SettingsModel.findOne().select('theme').lean(),
    findProfile(),
    findVisibleSections(),
  ]);
  if (settings === null) {
    throw new Error(MISSING_SINGLETON_MESSAGE);
  }

  const media = await loadPublicMedia([profile.photo, profile.resume]);
  const hasAbout = hasAboutContent(toPublicProfile(profile, media));
  const hasContent = await Promise.all(
    sections.map(async (section) => {
      if (section.key === 'about') {
        return hasAbout;
      }
      return !isListSection(section.key) || (await LIST_SECTION_HAS_CONTENT[section.key]()) !== null;
    }),
  );

  return {
    theme: settings.theme,
    name: profile.name,
    headline: profile.headline,
    photo: media.image(profile.photo),
    nav: sections.filter((_section, index) => hasContent[index]).map((section) => ({ key: section.key, heading: section.heading })),
    socialLinks: toPublicSocialLinks(profile),
    resume: media.document(profile.resume),
  };
}

interface HomeItems {
  experiences: StoredDocument<Experience>[];
  featuredProjects: StoredDocument<Project>[];
  visibleProjectCount: number;
  skillGroups: StoredDocument<SkillGroup>[];
  education: StoredDocument<Education>[];
  certifications: StoredDocument<Certification>[];
}

// Collections behind hidden sections are not queried at all.
async function findHomeItems(shownKeys: Set<SectionKey>): Promise<HomeItems> {
  const whenShown = <T>(key: SectionKey, load: () => Promise<T>, fallback: T): Promise<T> =>
    shownKeys.has(key) ? load() : Promise.resolve(fallback);

  const [experiences, featuredProjects, visibleProjectCount, skillGroups, education, certifications] = await Promise.all([
    whenShown('experience', () => findVisibleSorted(ExperienceModel, newestFirstSort('startDate', 'endDate')), []),
    whenShown(
      'projects',
      () => ProjectModel.find({ isVisible: true, isFeatured: true }).select(PROJECT_CARD_FIELDS).sort({ order: 1, _id: 1 }).lean(),
      [],
    ),
    whenShown('projects', () => ProjectModel.countDocuments(VISIBLE), 0),
    whenShown('skills', () => findVisibleSorted(SkillGroupModel, manualOrderSort), []),
    whenShown('education', () => findVisibleSorted(EducationModel, newestFirstSort('startDate', 'endDate')), []),
    whenShown('certifications', () => findVisibleSorted(CertificationModel, NEWEST_ISSUED_FIRST), []),
  ]);
  return { experiences, featuredProjects, visibleProjectCount, skillGroups, education, certifications };
}

// Returns null for a section with nothing to show, so it is left out of the page.
function buildSection(
  section: StoredDocument<Section>,
  items: HomeItems,
  media: PublicMediaLookup,
  profile: PublicProfile,
): PublicSection | null {
  const base = { heading: section.heading, settings: (section.settings ?? {}) as Record<string, unknown> };
  const unlessEmpty = (built: PublicSection & { items: unknown[] }): PublicSection | null => (built.items.length > 0 ? built : null);

  switch (section.key) {
    case 'hero':
    case 'contact':
      return { key: section.key, ...base };
    case 'about':
      return hasAboutContent(profile) ? { key: 'about', ...base } : null;
    case 'experience':
      return unlessEmpty({ key: 'experience', ...base, items: items.experiences.map((item) => toPublicExperience(item, media)) });
    case 'projects':
      // Kept without featured projects as long as some are visible, so the "View all" link still shows.
      return items.visibleProjectCount === 0
        ? null
        : {
            key: 'projects',
            ...base,
            items: items.featuredProjects.map((project) => toPublicProjectCard(project, media)),
            totalCount: items.visibleProjectCount,
          };
    case 'skills':
      return unlessEmpty({
        key: 'skills',
        ...base,
        items: items.skillGroups.map(toPublicSkillGroup).filter((group) => group.skills.length > 0),
      });
    case 'education':
      return unlessEmpty({ key: 'education', ...base, items: items.education.map((item) => toPublicEducation(item, media)) });
    case 'certifications':
      return unlessEmpty({
        key: 'certifications',
        ...base,
        items: items.certifications.map((item) => toPublicCertification(item, media)),
      });
  }
}

export async function getPublicHome(): Promise<PublicHome> {
  const [profile, sections] = await Promise.all([findProfile(), findVisibleSections()]);
  const items = await findHomeItems(new Set(sections.map((section) => section.key)));

  const media = await loadPublicMedia([
    profile.photo,
    profile.resume,
    ...items.experiences.map((experience) => experience.companyLogo),
    ...items.featuredProjects.map((project) => project.coverImage),
    ...items.education.map((education) => education.logo),
    ...items.certifications.map((certification) => certification.badge),
  ]);

  const publicProfile = toPublicProfile(profile, media);
  return {
    profile: publicProfile,
    sections: sections.flatMap((section) => buildSection(section, items, media, publicProfile) ?? []),
  };
}

// Every visible project in manual order; not paginated, since the portfolio shows them all on one page.
export async function listPublicProjects(): Promise<PublicProjectCard[]> {
  await assertProjectsSectionVisible('Projects not found');
  const projects = await ProjectModel.find(VISIBLE).select(PROJECT_CARD_FIELDS).sort({ order: 1, _id: 1 }).lean();
  const media = await loadPublicMedia(projects.map((project) => project.coverImage));
  return projects.map((project) => toPublicProjectCard(project, media));
}

// A malformed, unknown or hidden slug is a 404 alike, so the portfolio only has to show its not-found page.
export async function getPublicProject(slug: string): Promise<PublicProject> {
  if (slug.length > MAX_SLUG_LENGTH || !SLUG_PATTERN.test(slug)) {
    throw new NotFoundError(PROJECT_NOT_FOUND_MESSAGE);
  }
  await assertProjectsSectionVisible(PROJECT_NOT_FOUND_MESSAGE);

  const project = await ProjectModel.findOne({ slug, isVisible: true }).select(PROJECT_DETAIL_FIELDS).lean();
  if (project === null) {
    throw new NotFoundError(PROJECT_NOT_FOUND_MESSAGE);
  }

  const media = await loadPublicMedia([project.coverImage, ...project.gallery]);
  return {
    ...toPublicProjectCard(project, media),
    description: project.description ?? null,
    gallery: media.images(project.gallery),
  };
}
