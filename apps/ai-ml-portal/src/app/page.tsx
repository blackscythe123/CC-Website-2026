import {VerticalPortalHome,type VerticalSlug} from '@coding-club/scrapbook-ui';
import portalConfig from '../../portal.config.json';
import {getPortalPosts} from '@/lib/posts';
export default function HomePage(){return <VerticalPortalHome slug={portalConfig.verticalSlug as VerticalSlug} publishedPosts={getPortalPosts()}/>}
