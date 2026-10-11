import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/loaders/express.js';
import { CertificationModel } from '../../src/models/certification.model.js';
import { EducationModel } from '../../src/models/education.model.js';
import { ExperienceModel } from '../../src/models/experience.model.js';
import { MediaModel } from '../../src/models/media.model.js';
import { ProfileModel } from '../../src/models/profile.model.js';
import { ProjectModel } from '../../src/models/project.model.js';
import { SectionModel } from '../../src/models/section.model.js';
import { SettingsModel } from '../../src/models/settings.model.js';
import { SkillGroupModel } from '../../src/models/skill-group.model.js';
import { useTestDatabase } from '../helpers/database.js';
import { createReadyMedia } from '../helpers/media.js';

import type { SectionKey } from '../../src/models/section.model.js';
import type { PublicHome, PublicSection, PublicSite } from '../../src/types/public.types.js';

useTestDatabase();

const app = createApp();

async function getSite(): Promise<PublicSite> {
  const response = await request(app).get('/api/public/site');
  expect(response.status).toBe(200);
  return (response.body as { data: PublicSite }).data;
}

async function getHome(): Promise<PublicHome> {
  const response = await request(app).get('/api/public/home');
  expect(response.status).toBe(200);
  return (response.body as { data: PublicHome }).data;
}

function sectionOf<Key extends PublicSection['key']>(home: PublicHome, key: Key): Extract<PublicSection, { key: Key }> | undefined {
  return home.sections.find((section): section is Extract<PublicSection, { key: Key }> => section.key === key);
}

async function hideSection(key: SectionKey): Promise<void> {
  await SectionModel.updateOne({ key }, { $set: { isVisible: false } });
}

// One visible item in every list section, so all eight sections have something to show.
async function createOneOfEverything(): Promise<void> {
  await Promise.all([
    ExperienceModel.create({ company: 'Acme', role: 'Engineer', startDate: '2024-01' }),
    ProjectModel.create({ title: 'Site', slug: 'site', isFeatured: true }),
    SkillGroupModel.create({ name: 'Backend', skills: [{ name: 'Node.js' }] }),
    EducationModel.create({ institution: 'Uni', degree: 'BSc', startDate: '2018-09' }),
    CertificationModel.create({ name: 'AWS', issuer: 'Amazon', issueDate: '2025-01' }),
  ]);
}

describe('GET /api/public/site', () => {
  it('returns the theme, name, headline, photo, social links and resume', async () => {
    const photo = await createReadyMedia('image/webp', { url: 'https://cdn.example.com/me.webp', altText: 'Me', width: 400, height: 400 });
    const resume = await createReadyMedia('application/pdf', { url: 'https://cdn.example.com/cv.pdf', fileName: 'Mayank CV.pdf' });
    await SettingsModel.updateOne({}, { $set: { theme: 'light' } });
    await ProfileModel.updateOne(
      {},
      {
        $set: {
          name: 'Mayank',
          headline: 'Full-stack engineer',
          photo,
          resume,
          socialLinks: [
            { platform: 'github', url: 'https://github.com/example' },
            { platform: 'x', url: 'https://x.com/example', isVisible: false },
            { platform: 'other', label: 'Blog', url: 'https://blog.example.com' },
          ],
        },
      },
    );

    const site = await getSite();

    expect(site).toEqual({
      theme: 'light',
      name: 'Mayank',
      headline: 'Full-stack engineer',
      photo: { url: 'https://cdn.example.com/me.webp', altText: 'Me', width: 400, height: 400 },
      nav: [
        { key: 'hero', heading: 'Home' },
        { key: 'about', heading: 'About' },
        { key: 'contact', heading: 'Contact' },
      ],
      socialLinks: [
        { platform: 'github', label: null, url: 'https://github.com/example' },
        { platform: 'other', label: 'Blog', url: 'https://blog.example.com' },
      ],
      resume: { url: 'https://cdn.example.com/cv.pdf', fileName: 'Mayank CV.pdf' },
    });
  });

  it('lists visible sections in display order and leaves out empty and hidden ones', async () => {
    await createOneOfEverything();
    await hideSection('education');
    await SectionModel.updateOne({ key: 'contact' }, { $set: { order: -1, heading: 'Say hi' } });

    const site = await getSite();

    expect(site.nav).toEqual([
      { key: 'contact', heading: 'Say hi' },
      { key: 'hero', heading: 'Home' },
      { key: 'about', heading: 'About' },
      { key: 'experience', heading: 'Experience' },
      { key: 'projects', heading: 'Projects' },
      { key: 'skills', heading: 'Skills' },
      { key: 'certifications', heading: 'Certifications' },
    ]);
  });

  it('hides the photo and resume when their files are hidden', async () => {
    const [photo, resume] = await Promise.all([
      createReadyMedia('image/png', { isVisible: false }),
      createReadyMedia('application/pdf', { isVisible: false }),
    ]);
    await ProfileModel.updateOne({}, { $set: { photo, resume } });

    const site = await getSite();

    expect(site.photo).toBeNull();
    expect(site.resume).toBeNull();
  });

  it('returns an empty headline and no photo for a new profile', async () => {
    const site = await getSite();

    expect(site.headline).toBe('');
    expect(site.photo).toBeNull();
  });
});

describe('GET /api/public/home', () => {
  it('returns the default profile and only the sections that never need items', async () => {
    const home = await getHome();

    expect(home).toEqual({
      profile: {
        name: '',
        headline: '',
        heroPhrases: [],
        about: '',
        photo: null,
        resume: null,
        socialLinks: [],
        location: null,
        publicEmail: null,
        isOpenToWork: null,
        yearsOfExperience: null,
        languages: [],
      },
      sections: [
        { key: 'hero', heading: 'Home', settings: {} },
        { key: 'about', heading: 'About', settings: {} },
        { key: 'contact', heading: 'Contact', settings: {} },
      ],
    });
  });

  it('shows optional profile details only when they are switched on', async () => {
    await ProfileModel.updateOne(
      {},
      {
        $set: {
          location: { value: 'Berlin', isVisible: true },
          publicEmail: { value: 'me@example.com', isVisible: false },
          isOpenToWork: { value: true, isVisible: true },
          yearsOfExperience: { value: 6, isVisible: false },
          languages: { value: [{ name: 'English', proficiency: 'Fluent' }, { name: 'Hindi' }], isVisible: true },
        },
      },
    );

    const { profile } = await getHome();

    expect(profile).toMatchObject({
      location: 'Berlin',
      publicEmail: null,
      isOpenToWork: true,
      yearsOfExperience: null,
      languages: [
        { name: 'English', proficiency: 'Fluent' },
        { name: 'Hindi', proficiency: null },
      ],
    });
  });

  it('expands the photo and resume, and drops them when hidden or not uploaded', async () => {
    const photo = await createReadyMedia('image/png', { url: 'https://cdn.example.com/me.png', altText: 'Me', width: 400, height: 500 });
    const resume = await createReadyMedia('application/pdf', { status: 'pending' });
    await ProfileModel.updateOne({}, { $set: { photo, resume } });

    const { profile } = await getHome();
    expect(profile.photo).toEqual({ url: 'https://cdn.example.com/me.png', altText: 'Me', width: 400, height: 500 });
    expect(profile.resume).toBeNull();

    await MediaModel.updateOne({ _id: photo }, { $set: { isVisible: false } });
    expect((await getHome()).profile.photo).toBeNull();
  });

  it('includes every visible section in order with its items, matching the site nav', async () => {
    await createOneOfEverything();
    await hideSection('about');

    const [home, site] = await Promise.all([getHome(), getSite()]);

    expect(home.sections.map((section) => section.key)).toEqual([
      'hero',
      'experience',
      'projects',
      'skills',
      'education',
      'certifications',
      'contact',
    ]);
    expect(site.nav.map((item) => item.key)).toEqual(home.sections.map((section) => section.key));
  });

  it('returns experience newest first with current roles on top, without hidden items or admin fields', async () => {
    const logo = await createReadyMedia('image/png', { url: 'https://cdn.example.com/acme.png' });
    await ExperienceModel.create([
      { company: 'Old', role: 'Intern', startDate: '2018-01', endDate: '2019-01' },
      { company: 'Recent', role: 'Engineer', startDate: '2020-01', endDate: '2023-06' },
      { company: 'Current', role: 'Lead', startDate: '2023-07', companyLogo: logo, highlights: ['Shipped it'] },
      { company: 'Secret', role: 'Spy', startDate: '2024-01', isVisible: false },
    ]);

    const experience = sectionOf(await getHome(), 'experience');

    expect(experience?.items.map((item) => item.company)).toEqual(['Current', 'Recent', 'Old']);
    expect(experience?.items[0]).toEqual({
      id: expect.any(String) as string,
      company: 'Current',
      role: 'Lead',
      location: null,
      startDate: '2023-07',
      endDate: null,
      summary: null,
      highlights: ['Shipped it'],
      techStack: [],
      companyLogo: { url: 'https://cdn.example.com/acme.png', altText: null, width: null, height: null },
      companyUrl: null,
    });
  });

  it('shows featured projects in manual order and counts every visible project', async () => {
    await ProjectModel.create([
      { title: 'Second', slug: 'second', isFeatured: true, order: 1 },
      { title: 'First', slug: 'first', isFeatured: true, order: 0 },
      { title: 'Not featured', slug: 'plain', order: 2 },
      { title: 'Hidden featured', slug: 'hidden', isFeatured: true, isVisible: false, order: 3 },
    ]);

    const projects = sectionOf(await getHome(), 'projects');

    expect(projects?.items.map((project) => project.slug)).toEqual(['first', 'second']);
    expect(projects?.totalCount).toBe(3);
    expect(projects?.items[0]).not.toHaveProperty('description');
    expect(projects?.items[0]).not.toHaveProperty('gallery');
  });

  it('keeps the projects section without featured projects, but drops it when no project is visible', async () => {
    await ProjectModel.create({ title: 'Plain', slug: 'plain' });
    expect(sectionOf(await getHome(), 'projects')).toMatchObject({ items: [], totalCount: 1 });

    await ProjectModel.updateOne({ slug: 'plain' }, { $set: { isVisible: false } });
    expect(sectionOf(await getHome(), 'projects')).toBeUndefined();
    expect((await getSite()).nav.map((item) => item.key)).not.toContain('projects');
  });

  it('removes hidden skills and skill groups that have none left', async () => {
    await SkillGroupModel.create([
      {
        name: 'Backend',
        order: 0,
        skills: [
          { name: 'Node.js', icon: 'nodedotjs' },
          { name: 'PHP', isVisible: false },
        ],
      },
      { name: 'Only hidden', order: 1, skills: [{ name: 'Cobol', isVisible: false }] },
      { name: 'Hidden group', order: 2, isVisible: false, skills: [{ name: 'Go' }] },
    ]);

    const skills = sectionOf(await getHome(), 'skills');

    expect(skills?.items).toEqual([
      { id: expect.any(String) as string, name: 'Backend', skills: [{ name: 'Node.js', icon: 'nodedotjs' }] },
    ]);
  });

  it('drops the skills section from the page and the nav when no visible skill is left', async () => {
    await SkillGroupModel.create({ name: 'Only hidden', skills: [{ name: 'Cobol', isVisible: false }] });

    expect(sectionOf(await getHome(), 'skills')).toBeUndefined();
    expect((await getSite()).nav.map((item) => item.key)).not.toContain('skills');
  });

  it('returns certifications newest issued first, including expired ones', async () => {
    await CertificationModel.create([
      { name: 'Old', issuer: 'X', issueDate: '2019-01', expiryDate: '2021-01' },
      { name: 'New', issuer: 'X', issueDate: '2025-03' },
    ]);

    const certifications = sectionOf(await getHome(), 'certifications');

    expect(certifications?.items.map((item) => [item.name, item.expiryDate])).toEqual([
      ['New', null],
      ['Old', '2021-01'],
    ]);
  });

  it('leaves out hidden sections even when they have items', async () => {
    await createOneOfEverything();
    await hideSection('experience');
    await hideSection('hero');

    const keys = (await getHome()).sections.map((section) => section.key);

    expect(keys).not.toContain('experience');
    expect(keys).not.toContain('hero');
  });

  it('loads all media for the page in a single query', async () => {
    const [photo, logo, cover, badge] = await Promise.all([createReadyMedia(), createReadyMedia(), createReadyMedia(), createReadyMedia()]);
    await ProfileModel.updateOne({}, { $set: { photo } });
    await Promise.all([
      ExperienceModel.create({ company: 'A', role: 'B', startDate: '2024-01', companyLogo: logo }),
      ProjectModel.create({ title: 'P', slug: 'p', isFeatured: true, coverImage: cover }),
      CertificationModel.create({ name: 'C', issuer: 'D', issueDate: '2024-01', badge }),
    ]);
    const findSpy = vi.spyOn(MediaModel, 'find');

    const home = await getHome();

    expect(findSpy).toHaveBeenCalledTimes(1);
    findSpy.mockRestore();
    expect(sectionOf(home, 'certifications')?.items[0]?.badge).not.toBeNull();
  });
});
