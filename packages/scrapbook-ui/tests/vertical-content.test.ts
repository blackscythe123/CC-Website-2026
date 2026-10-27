import test from 'node:test';
import assert from 'node:assert/strict';
import {getVerticalContent,verticalCategories,type VerticalSlug} from '../src/vertical-content';
import {sampleProjects} from '../src/data/projects';
import {events} from '../src/data/events';
import {blogs} from '../src/data/blogs';

for(const slug of Object.keys(verticalCategories) as VerticalSlug[]){
 test(`${slug} contains its own projects, events and blogs only`,()=>{
  const content=getVerticalContent(slug);
  assert.ok(content.projects.length>0,'Existing projects must remain discoverable');
  assert.ok(content.events.length>0,'Existing events must remain discoverable');
  assert.ok(content.blogs.length>0,'Existing blogs must remain discoverable');
  assert.ok(content.projects.every(p=>p.category===verticalCategories[slug]));
  assert.ok(content.events.every(e=>e.vertical===verticalCategories[slug]));
  assert.ok(content.blogs.every(b=>b.category===verticalCategories[slug]));
 });
}
test('canonical portal aliases select the existing AR/VR, Design and CP content',()=>{
 assert.deepEqual(getVerticalContent('ar-vr-game-dev').projects.map(p=>p.id),['horizonxr']);
 assert.deepEqual(getVerticalContent('design-ui-ux').projects.map(p=>p.id),['pixelpad']);
 assert.deepEqual(getVerticalContent('competitive-programming').projects.map(p=>p.id),['algolab']);
});
test('every technical item appears once across the eight portals; PR stays administrative',()=>{
 const all=(Object.keys(verticalCategories) as VerticalSlug[]).map(getVerticalContent);
 assert.equal(all.flatMap(c=>c.projects).length,sampleProjects.length);
 assert.equal(all.flatMap(c=>c.events).length,events.length);
 const technicalBlogs=blogs.filter(b=>b.category!=='PR');
 const selected=all.flatMap(c=>c.blogs);
 assert.equal(selected.length,technicalBlogs.length);
 assert.equal(new Set(selected.map(b=>b.id)).size,technicalBlogs.length);
 assert.ok(selected.every(b=>b.category!=='PR'));
});
