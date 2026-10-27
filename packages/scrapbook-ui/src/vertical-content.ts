import {sampleProjects} from './data/projects';
import {events} from './data/events';
import {blogs} from './data/blogs';

export const verticalCategories={
 'ai-ml':'AI / ML',
 'ar-vr-game-dev':'AR / VR',
 'competitive-programming':'CP',
 cybersecurity:'Cybersecurity',
 'design-ui-ux':'Design',
 'full-stack':'Full Stack',
 'open-source':'Open Source',
 ssnhacks:'SSN Hacks',
} as const;
export type VerticalSlug=keyof typeof verticalCategories;
export function getVerticalContent(slug:VerticalSlug){
 const category=verticalCategories[slug];
 return {
  category,
  projects:sampleProjects.filter(project=>project.category===category),
  events:events.filter(event=>event.vertical===category),
  blogs:blogs.filter(blog=>blog.category===category),
 };
}
