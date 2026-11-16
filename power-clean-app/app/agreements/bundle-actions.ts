'use server';
import {createClient} from '@/lib/supabase/server';
import {prepareSigningLink} from './signing-actions';
import {SERVICE_TEMPLATE,LIABILITY_TEMPLATE} from './templates';
export async function prepareAgreementBundle(customerId:string,testMode=false,cancellationDeadline?:string){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).eq('role','owner').maybeSingle();
 if(!member)return {error:'The business owner must approve both documents.'};
 if(testMode){
  const testBody='TEST ONLY — NOT A LEGAL AGREEMENT OR LIABILITY RELEASE. This document solely tests the Power Clean electronic signing workflow. No cleaning services are ordered, no payment is due, and no liability is waived.';
  const ids:string[]=[];
  for(const [type,title] of [['service_contract','TEST ONLY — Power Clean Service Agreement'],['liability_release','TEST ONLY — Power Clean Property Condition Disclosure and Acknowledgment of Risk']] as const){
   const {data:created,error:insertError}=await supabase.from('customer_agreements').insert({business_id:member.business_id,customer_id:customerId,created_by:user.id,document_type:type,title,body:testBody}).select('id').single();
   if(insertError||!created)return {error:'Could not create test agreement: '+(insertError?.message||'Unknown error')};
   ids.push(created.id);
  }
  const first=await prepareSigningLink(ids[0]);
  if(!first.token)return {error:'Test Service Agreement: '+(first.error||'Signing link failed')};
  const second=await prepareSigningLink(ids[1]);
  if(!second.token){
   const {data:resetRow,error:resetError}=await supabase.from('customer_agreements').update({status:'draft',signing_token_hash:null,signing_expires_at:null,contractor_signer_name:null,contractor_signer_title:null,contractor_signed_at:null,contractor_authorized_by:null,contractor_signature_image_data:null}).is('deleted_at',null).eq('id',ids[0]).eq('business_id',member.business_id).eq('status','sent').select('id').maybeSingle();
   return {error:resetError||!resetRow?'Test bundle failed and the first link reset could not be verified. Do not share links: '+(resetError?.message||'No row was reset'):'Test bundle failed; first link revoked: '+(second.error||'Signing link failed')};
  }
  return {serviceToken:first.token,liabilityToken:second.token};
 }
 const {data:docs,error}=await supabase.from('customer_agreements').select('id,document_type,status,title,body').is('deleted_at',null).eq('business_id',member.business_id).eq('customer_id',customerId).eq('status','draft').order('created_at',{ascending:false});
 if(error)return {error:'Could not load customer agreements: '+error.message};
 const matchesMaster=(body:string,template:string)=>body.startsWith(template.slice(0,75));
 let service=docs?.find(d=>d.document_type==='service_contract'&&matchesMaster(d.body,SERVICE_TEMPLATE));
 let liability=docs?.find(d=>d.document_type==='liability_release'&&matchesMaster(d.body,LIABILITY_TEMPLATE));

 // Older drafts remain untouched and do not block creation of current master agreements.
 // They are never reused for new signing links.
 if(!service||!liability){
  const {data:customer,error:customerError}=await supabase.from('customers').select('id,name').eq('id',customerId).eq('business_id',member.business_id).maybeSingle();
  if(customerError||!customer)return {error:'Customer record could not be loaded: '+(customerError?.message||'Select a saved customer.')};
  const toCreate=[
   ...(!service?[{document_type:'service_contract',title:'Power Clean Pressure & Soft Washing Service Agreement',body:SERVICE_TEMPLATE}]:[]),
   ...(!liability?[{document_type:'liability_release',title:'Power Clean Property Condition Disclosure and Acknowledgment of Risk',body:LIABILITY_TEMPLATE}]:[])
  ];
  const {data:created,error:insertError}=await supabase.from('customer_agreements').insert(toCreate.map(d=>({...d,business_id:member.business_id,customer_id:customerId,created_by:user.id}))).select('id,document_type,status,title,body');
  if(insertError)return {error:'Could not save missing agreement drafts: '+insertError.message};
  service=service||created?.find(d=>d.document_type==='service_contract');
  liability=liability||created?.find(d=>d.document_type==='liability_release');
 }
 if(!service||!liability)return {error:'Both agreement drafts could not be verified. Nothing was sent.'};
 const first=await prepareSigningLink(service.id,false,cancellationDeadline);
 if(!first.token)return {error:'Service Agreement: '+(first.error||'Could not prepare signing link.')};
 const second=await prepareSigningLink(liability.id);
 if(!second.token){
  // Never expose a partially prepared bundle: revoke the first token before returning.
  const {data:rollbackRow,error:rollbackError}=await supabase.from('customer_agreements').update({
   status:'draft',signing_token_hash:null,signing_expires_at:null,
   contractor_signer_name:null,contractor_signer_title:null,contractor_signed_at:null,
   contractor_authorized_by:null,contractor_signature_image_data:null
  }).is('deleted_at',null).eq('id',service.id).eq('business_id',member.business_id).eq('status','sent').select('id').maybeSingle();
  if(rollbackError||!rollbackRow)return {error:'The second agreement failed and the first reset could not be verified. Do not share any links. Contact the administrator: '+(rollbackError?.message||'No row was reset')};
  return {error:'Neither agreement link was issued. The second document failed validation: '+(second.error||'Could not prepare signing link.')};
 }
 return {serviceToken:first.token,liabilityToken:second.token};
}

/** Owner-only, isolated test document. Never changes a real customer agreement. */
export async function testRollbackSafeguard(customerId:string){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {passed:false,error:'Sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).eq('role','owner').maybeSingle();
 if(!member)return {passed:false,error:'Only the business owner can run this test.'};
 const {data:customer}=await supabase.from('customers').select('id').eq('id',customerId).eq('business_id',member.business_id).maybeSingle();
 if(!customer)return {passed:false,error:'Choose a customer in your business.'};
 const {data:created,error:insertError}=await supabase.from('customer_agreements').insert({
  business_id:member.business_id,customer_id:customerId,created_by:user.id,
  document_type:'service_contract',title:'TEST ONLY — Rollback safeguard verification',
  body:'TEST ONLY — NOT A LEGAL AGREEMENT. This document tests signing-link revocation. No service, payment, or liability waiver is authorized.'
 }).select('id').single();
 if(insertError||!created)return {passed:false,error:'Could not create isolated test document: '+(insertError?.message||'Unknown error')};
 const first=await prepareSigningLink(created.id);
 if(!first.token)return {passed:false,error:'First test signing link could not be prepared: '+(first.error||'Unknown error')};
 // Deliberately simulate a failure preparing the second agreement; do not touch a real second document.
 const simulatedSecondFailure=true;
 if(!simulatedSecondFailure)return {passed:false,error:'Failure injection did not run.'};
 const {data:reset,error:resetError}=await supabase.from('customer_agreements').update({
  status:'draft',signing_token_hash:null,signing_expires_at:null,
  contractor_signer_name:null,contractor_signer_title:null,contractor_signed_at:null,
  contractor_authorized_by:null,contractor_signature_image_data:null
 }).is('deleted_at',null).eq('id',created.id).eq('business_id',member.business_id).eq('status','sent').select('id,status,signing_token_hash,signing_expires_at').maybeSingle();
 if(resetError||!reset)return {passed:false,error:'Rollback failed or did not update a row: '+(resetError?.message||'No matching row'),testAgreementId:created.id};
 const {data:readBack,error:readError}=await supabase.from('customer_agreements').select('status,signing_token_hash,signing_expires_at').is('deleted_at',null).eq('id',created.id).eq('business_id',member.business_id).single();
 const {data:publicRead,error:publicError}=await supabase.rpc('read_agreement_for_signing',{p_token:first.token});
 const accessible=Array.isArray(publicRead)&&publicRead.length>0;
 const revoked=!readError&&readBack?.status==='draft'&&readBack.signing_token_hash===null&&readBack.signing_expires_at===null;
 const passed=revoked&&!accessible&&!publicError;
 return {passed,firstPrepared:true,secondFailedIntentionally:true,revoked,oldLinkRejected:!accessible&&!publicError,
  testAgreementId:created.id,error:passed?undefined:'Verification failed: '+(readError?.message||publicError?.message||'Link or status not revoked')};
}
