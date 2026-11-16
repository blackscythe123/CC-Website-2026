import {verticalCategories} from './vertical-content';

/** One newspaper article. Built from real markdown posts via `postsToBlogs`; never hard-coded. */
export type Blog = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  date: string;
  readTime: string;
  author: string;
  image: string;
  imageAlt: string;
  accent: string;
  content: string[];
  /** Page holding the full article. */
  href?: string;
};

/** The subset of a portal's PostSummary that the newspaper needs. */
export type BlogPost = {
  slug: string;
  vertical: string;
  title: string;
  summary: string;
  date: string;
  author: string;
  coverImage?: string;
  readMinutes?: number;
};

const categoryStyle: Record<string, {poster: string; accent: string}> = {
  'AI / ML': {poster: 'transformers', accent: '#f3b5d0'},
  Cybersecurity: {poster: 'security', accent: '#8fdac0'},
  Design: {poster: 'design', accent: '#f6d277'},
  'Full Stack': {poster: 'chat', accent: '#b9a1ec'},
  'Open Source': {poster: 'opensource', accent: '#9ddacb'},
  'AR / VR': {poster: 'ar', accent: '#f7b88c'},
  CP: {poster: 'cp', accent: '#d6cdf5'},
  'SSN Hacks': {poster: 'ssnhacks', accent: '#f7bcb0'},
  Club: {poster: 'community', accent: '#f4c873'},
};

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-04-05` -> `Apr 5, 2026`. Anything unparseable is shown as-is. */
export function formatBlogDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return date;
  return `${months[Number(match[2]) - 1] ?? ''} ${Number(match[3])}, ${match[1]}`;
}

export function categoryForVertical(vertical: string): string {
  if (vertical === 'club') return 'Club';
  return (verticalCategories as Record<string, string>)[vertical] ?? vertical;
}

export function postsToBlogs(posts: BlogPost[], hrefFor: (post: BlogPost) => string): Blog[] {
  return posts.map(post => {
    const category = categoryForVertical(post.vertical);
    const style = categoryStyle[category] ?? categoryStyle.Club;
    return {
      id: `${post.vertical}/${post.slug}`,
      title: post.title,
      category,
      excerpt: post.summary,
      date: formatBlogDate(post.date),
      readTime: `${post.readMinutes ?? 1} min`,
      author: post.author,
      image: post.coverImage || `/posters/${style.poster}.svg`,
      imageAlt: post.title,
      accent: style.accent,
      content: [],
      href: hrefFor(post),
    };
  });
}
