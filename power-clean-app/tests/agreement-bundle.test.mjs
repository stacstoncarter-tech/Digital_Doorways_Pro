import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../app/agreements/bundle-actions.ts',import.meta.url),'utf8');
function harness(existing=[],failSecond=false,deleted=[]){
 const rows=existing.map(type=>({id:type,document_type:type,status:'draft',title:type,body:type==='service_contract'?'SERVICE master':'LIABILITY master'}));
 for(const type of deleted)rows.push({id:'deleted-'+type,document_type:type,status:'draft',title:type,body:type==='service_contract'?'SERVICE master':'LIABILITY master',deleted_at:'2026-11-09T00:00:00Z'});
 const calls=[];let resets=0;
 const client={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from(table){let inserted,updated;const filters=[];const q={is(column,value){filters.push(row=>(row[column]??null)===value);return q},select(){return q},eq(){return q},order(){return q},insert(data){inserted=Array.isArray(data)?data:[data];return q},single:async()=>{const row={...inserted[0],id:inserted[0].document_type,status:'draft'};rows.push(row);return {data:row}},update(){updated=true;return q},maybeSingle:async()=>({data:table==='business_members'?{business_id:'business',role:'owner'}:table==='customers'?{id:'customer',name:'Disposable Test'}:(resets++,{id:'service_contract'})}),then(resolve){if(inserted){const created=inserted.map(d=>({...d,id:d.document_type,status:'draft'}));rows.push(...created);return Promise.resolve({data:created}).then(resolve)}if(updated)resets++;return Promise.resolve({data:rows.filter(row=>filters.every(filter=>filter(row)))}).then(resolve)}};return q}};
 const testModule={exports:{}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:testModule.exports,require(name){if(name.includes('supabase'))return {createClient:async()=>client};if(name==='./templates')return {SERVICE_TEMPLATE:'SERVICE master',LIABILITY_TEMPLATE:'LIABILITY master'};if(name==='./signing-actions')return {prepareSigningLink:async id=>{calls.push(id);return failSecond&&calls.length===2?{error:'Injected failure'}:{token:id+'-token'}}};throw Error(name)}});
 return {run:testModule.exports.prepareAgreementBundle,rows,calls,get resets(){return resets}};
}
for(const existing of [[],['service_contract'],['liability_release'],['service_contract','liability_release']])test(`one click prepares both with ${existing.length} existing drafts (${existing.join(',')})`,async()=>{const h=harness(existing);const r=await h.run('customer');assert.equal(r.serviceToken,'service_contract-token');assert.equal(r.liabilityToken,'liability_release-token');assert.equal(h.rows.length,2);assert.deepEqual(h.calls,['service_contract','liability_release']);});
test('second preparation failure revokes first and returns no shareable token',async()=>{const h=harness([],true);const r=await h.run('customer');assert.match(r.error,/Neither agreement link was issued/);assert.equal(r.serviceToken,undefined);assert.equal(r.liabilityToken,undefined);assert.equal(h.resets,1)});
const {refreshAgreementCustomer}=await import('../lib/agreement-customer.ts');
test('current customer identity replaces stale service draft details and preserves disclosures',()=>{
 const body='PRESSURE AND SOFT WASHING SERVICES AGREEMENT\nOld Name, an individual (“Customer”). Contractor and Customer are\nProperty (service address): Old address\nCustomer telephone / email: old / old\nInspection: cracked driveway';
 const fresh=refreshAgreementCustomer(body,{name:'Disposable Test',phone:'555-0100',email:'test@example.invalid'},'123 Test Lane');
 assert.ok(fresh.includes('Disposable Test, an individual'));
 assert.ok(fresh.includes('Property (service address): 123 Test Lane'));
 assert.ok(fresh.includes('555-0100 / test@example.invalid'));
 assert.ok(fresh.includes('Inspection: cracked driveway'));
 assert.ok(!fresh.includes('Old Name'));
});
test('liability draft uses same current customer and property',()=>{
 const body='PROPERTY CONDITION DISCLOSURE\nOld Name (“Customer”). The Acknowledgment concerns the real\nproperty located at Old address, Florida (the “Property”),\nInspection: chipped paint';
 const fresh=refreshAgreementCustomer(body,{name:'Disposable Test',phone:null,email:null},'123 Test Lane');
 assert.ok(fresh.includes('Disposable Test (“Customer”)'));
 assert.ok(fresh.includes('property located at 123 Test Lane, Florida'));
 assert.ok(fresh.includes('Inspection: chipped paint'));
});

test('explicit TEST ONLY path creates both documents without estimate or schedule queries',async()=>{const h=harness();const r=await h.run('customer',true);assert.equal(r.serviceToken,'service_contract-token');assert.equal(r.liabilityToken,'liability_release-token');assert.equal(h.rows.length,2);for(const row of h.rows){assert.match(row.title,/^TEST ONLY/);assert.match(row.body,/NOT A LEGAL AGREEMENT/);}});

test('deleted master drafts are excluded and both active agreements are prepared',async()=>{const h=harness([],false,['service_contract']);const r=await h.run('customer');assert.equal(r.serviceToken,'service_contract-token');assert.equal(r.liabilityToken,'liability_release-token');assert.equal(h.rows.length,3);assert.ok(h.rows.find(r=>r.id==='deleted-service_contract').deleted_at);});

test('customer agreement links use the stable public app URL',async()=>{
 const {getPublicAppUrl}=await import('../lib/public-app-url.ts');
 const original=process.env.NEXT_PUBLIC_APP_URL;
 try{
  delete process.env.NEXT_PUBLIC_APP_URL;
  assert.equal(getPublicAppUrl(),'https://power-clean-operations.vercel.app');
  process.env.NEXT_PUBLIC_APP_URL='https://power-clean-operations-agyenx4cy-stacstoncarter-5554.vercel.app';
  assert.equal(getPublicAppUrl(),'https://power-clean-operations.vercel.app');
  process.env.NEXT_PUBLIC_APP_URL='https://app.powerclean.example/ignored/path';
  assert.equal(getPublicAppUrl(),'https://app.powerclean.example');
 }finally{
  if(original===undefined)delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL=original;
 }
 const bundle=readFileSync(new URL('../app/agreements/bundle-button.tsx',import.meta.url),'utf8');
 const single=readFileSync(new URL('../app/agreements/signing-link.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(bundle,/window\.location\.origin/);
 assert.doesNotMatch(single,/window\.location\.origin/);
 assert.match(bundle,/getPublicAppUrl\(\)/);
 assert.match(single,/getPublicAppUrl\(\)/);
});
