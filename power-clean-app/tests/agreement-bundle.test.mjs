import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../app/agreements/bundle-actions.ts',import.meta.url),'utf8');
function harness(existing=[],failSecond=false){
 const rows=existing.map(type=>({id:type,document_type:type,status:'draft',title:type,body:type==='service_contract'?'SERVICE master':'LIABILITY master'}));
 const calls=[];let resets=0;
 const client={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from(table){let inserted,updated;const q={select(){return q},eq(){return q},order(){return q},insert(data){inserted=data;return q},update(){updated=true;return q},maybeSingle:async()=>({data:table==='business_members'?{business_id:'business',role:'owner'}:table==='customers'?{id:'customer',name:'Disposable Test'}:(resets++,{id:'service_contract'})}),then(resolve){if(inserted){for(const d of inserted)rows.push({...d,id:d.document_type,status:'draft'});return Promise.resolve({data:rows.filter(r=>inserted.some(d=>d.document_type===r.document_type))}).then(resolve)}if(updated)resets++;return Promise.resolve({data:rows}).then(resolve)}};return q}};
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
