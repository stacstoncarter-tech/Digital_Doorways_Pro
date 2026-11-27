import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('customer profile retains visible gallery',()=>{
 const page=read('app/customers/[id]/page.tsx');
 assert.match(page,/import CustomerPhotos from '\.\/customer-photos'/);
 assert.match(page,/<CustomerPhotos\s/);
 assert.match(page,/power-clean-customer-photos/);
});
test('customer gallery retains upload and delete actions',()=>{
 const gallery=read('app/customers/[id]/customer-photos.tsx');
 assert.match(gallery,/deleteCustomerPhoto\(/);
 assert.match(gallery,/Delete photo/);
 assert.match(gallery,/type="file"/);
});
test('customer delete requires authenticated ownership and scoped path',()=>{
 const action=read('app/customers/[id]/photo-delete.ts');
 assert.match(action,/supabase\.auth\.getUser\(/);
 assert.match(action,/eq\('business_id',member\.business_id\)/);
 assert.match(action,/path\.startsWith\(prefix\)/);
 assert.match(action,/\.remove\(\[path\]\)/);
});
test('job gallery retains deletion control',()=>{
 const page=read('app/jobs/[id]/page.tsx');
 const actions=read('app/jobs/[id]/actions.ts');
 assert.match(page,/<PhotoDeleteButton\s/);
 assert.match(actions,/export async function deleteJobPhoto/);
 assert.match(actions,/eq\('business_id',ctx\.member\.business_id\)/);
});
test('agreement and estimate entry points remain on customer profile',()=>{
 const page=read('app/customers/[id]/page.tsx');
 assert.match(page,/Create agreement/);
 assert.match(page,/Create estimate/);
});
