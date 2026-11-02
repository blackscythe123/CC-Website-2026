import {VerticalPortalHome,type VerticalSlug} from '@coding-club/scrapbook-ui';
import portalConfig from '../../portal.config.json';
import {getPortalPosts,getPortalPost} from '@/lib/posts';
export default async function HomePage(){
 const posts=getPortalPosts();
 const updates=posts.filter(post=>post.tags.some(tag=>['announcement','announcements','news','latest-news','club-announcement'].includes(tag.toLowerCase())));
 const details=await Promise.all(updates.map(post=>getPortalPost(post.slug)));
 const broadcastItems=details.flatMap(post=>post?[{id:post.slug,type:post.tags.some(tag=>['news','latest-news'].includes(tag.toLowerCase()))?'news' as const:'announcement' as const,title:post.title,category:post.tags.some(tag=>['news','latest-news'].includes(tag.toLowerCase()))?'LATEST NEWS':'ANNOUNCEMENT',body:[],contentHtml:post.contentHtml,date:post.date,source:post.author}]:[]);
 return <VerticalPortalHome slug={portalConfig.verticalSlug as VerticalSlug} publishedPosts={posts} broadcastItems={broadcastItems}/>;
}
