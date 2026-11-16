import {postsToBlogs} from '@coding-club/scrapbook-ui';
import ScrollHome from '../components/ScrollHome';
import {getAllPosts} from '../lib/posts';
export default function Home(){return <ScrollHome blogs={postsToBlogs(getAllPosts(),post=>`/blog/${post.vertical}/${post.slug}`)}/>;}
