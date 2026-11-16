import test from 'node:test';
import assert from 'node:assert/strict';
import {postsToBlogs,formatBlogDate,categoryForVertical} from '../src/blog';
import {mainPortalUrl,mainPortalVerticalsUrl} from '../src/portals';

test('postsToBlogs maps real posts into the newspaper shape',()=>{
 const [blog]=postsToBlogs([{slug:'hello',vertical:'ai-ml',title:'Hello',summary:'Sum',date:'2026-04-05',author:'Ann',readMinutes:3}],p=>`/posts/${p.slug}`);
 assert.equal(blog.id,'ai-ml/hello');
 assert.equal(blog.category,'AI / ML');
 assert.equal(blog.date,'Apr 5, 2026');
 assert.equal(blog.readTime,'3 min');
 assert.equal(blog.href,'/posts/hello');
 assert.equal(blog.image,'/posters/transformers.svg');
 assert.deepEqual(blog.content,[]);
});
test('cover image wins over the category poster; club posts get the Club category',()=>{
 const [blog]=postsToBlogs([{slug:'x',vertical:'club',title:'X',summary:'',date:'2026-01-02',author:'A',coverImage:'/uploads/a.webp'}],()=>'/');
 assert.equal(blog.category,'Club');
 assert.equal(blog.image,'/uploads/a.webp');
});
test('no posts yields no blogs, never sample data',()=>assert.deepEqual(postsToBlogs([],()=>'/'),[]));
test('date and category helpers',()=>{
 assert.equal(formatBlogDate('not-a-date'),'not-a-date');
 assert.equal(categoryForVertical('competitive-programming'),'CP');
});
test('main portal URL comes from portals.json',()=>{
 assert.match(mainPortalUrl,/^https:\/\/.+/);
 assert.equal(mainPortalVerticalsUrl,`${mainPortalUrl}/#section-verticals`);
});
