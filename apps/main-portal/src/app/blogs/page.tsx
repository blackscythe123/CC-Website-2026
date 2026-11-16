import { postsToBlogs } from "@coding-club/scrapbook-ui";
import BlogsIsolated from "../../components/BlogsIsolated";
import { getAllPosts } from "../../lib/posts";
export default function Page() {
  return <BlogsIsolated items={postsToBlogs(getAllPosts(), (post) => `/blog/${post.vertical}/${post.slug}`)} />;
}
