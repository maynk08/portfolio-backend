import type { SocialPlatform } from '../models/profile.model.js';
import type { SectionKey } from '../models/section.model.js';
import type { Theme } from '../models/settings.model.js';

// Shapes returned by /api/public. Only visible content, and no admin-only fields such as `isVisible` or `order`.

export interface PublicImage {
  url: string;
  // null when the admin left it empty; the portfolio falls back to context such as the project title.
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface PublicDocument {
  url: string;
  fileName: string;
}

export interface PublicSocialLink {
  platform: SocialPlatform;
  label: string | null;
  url: string;
}

export interface PublicLanguage {
  name: string;
  proficiency: string | null;
}

export interface PublicSite {
  theme: Theme;
  name: string;
  // For page descriptions and share images.
  headline: string;
  photo: PublicImage | null;
  // Visible sections that have something to show, in display order.
  nav: { key: SectionKey; heading: string }[];
  socialLinks: PublicSocialLink[];
  resume: PublicDocument | null;
}

// Optional details are null (languages empty) when hidden.
export interface PublicProfile {
  name: string;
  headline: string;
  heroPhrases: string[];
  about: string;
  photo: PublicImage | null;
  resume: PublicDocument | null;
  socialLinks: PublicSocialLink[];
  location: string | null;
  publicEmail: string | null;
  isOpenToWork: boolean | null;
  yearsOfExperience: number | null;
  languages: PublicLanguage[];
}

export interface PublicExperience {
  id: string;
  company: string;
  role: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  summary: string | null;
  highlights: string[];
  techStack: string[];
  companyLogo: PublicImage | null;
  companyUrl: string | null;
}

export interface PublicProjectCard {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  role: string | null;
  techStack: string[];
  liveUrl: string | null;
  repoUrl: string | null;
  coverImage: PublicImage | null;
  isFeatured: boolean;
  updatedAt: Date;
}

export interface PublicProject extends PublicProjectCard {
  // Markdown.
  description: string | null;
  gallery: PublicImage[];
}

export interface PublicSkillGroup {
  id: string;
  name: string;
  skills: { name: string; icon: string | null }[];
}

export interface PublicEducation {
  id: string;
  institution: string;
  degree: string;
  field: string | null;
  startDate: string;
  endDate: string | null;
  grade: string | null;
  description: string | null;
  logo: PublicImage | null;
}

export interface PublicCertification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  badge: PublicImage | null;
}

interface SectionBase<Key extends SectionKey> {
  key: Key;
  heading: string;
  settings: Record<string, unknown>;
}

// Hero, about and contact read their content from `profile`.
export type PublicSection =
  | SectionBase<'hero' | 'about' | 'contact'>
  | (SectionBase<'experience'> & { items: PublicExperience[] })
  // `items` are the featured projects; `totalCount` counts every visible project, for the "View all" link.
  | (SectionBase<'projects'> & { items: PublicProjectCard[]; totalCount: number })
  | (SectionBase<'skills'> & { items: PublicSkillGroup[] })
  | (SectionBase<'education'> & { items: PublicEducation[] })
  | (SectionBase<'certifications'> & { items: PublicCertification[] });

export interface PublicHome {
  profile: PublicProfile;
  sections: PublicSection[];
}
