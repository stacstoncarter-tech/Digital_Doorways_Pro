'use server';
import {createClient} from '@/lib/supabase/server';
import {prepareSigningLink} from './signing-actions';
import {createAgreement} from './actions';
import {SERVICE_TEMPLATE,LIABILITY_TEMPLATE} from './templates';
export async function prepareAgreementBundle(customerId:string,testMode=false){
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
   const {error:resetError}=await supabase.from('customer_agreements').update({status:'draft',signing_token_hash:null,signing_expires_at:null,contractor_signer_name:null,contractor_signer_title:null,contractor_signed_at:null,contractor_authorized_by:null,contractor_signature_image_data:null}).eq('id',ids[0]).eq('business_id',member.business_id).eq('status','sent');
   return {error:resetError?'Test bundle failed and the first link could not be reset: '+resetError.message:'Test bundle failed; first link revoked: '+(second.error||'Signing link failed')};
  }
  return {serviceToken:first.token,liabilityToken:second.token};
 }
 const {data:docs,error}=await supabase.from('customer_agreements').select('id,document_type,status,title,body').eq('business_id',member.business_id).eq('customer_id',customerId).eq('status','draft').order('created_at',{ascending:false});
 if(error)return {error:'Could not load customer agreements.'};
 const matchesMaster=(body:string,template:string)=>body.startsWith(template.slice(0,75));
 const service=docs?.find(d=>d.document_type==='service_contract'&&matchesMaster(d.body,SERVICE_TEMPLATE));
 const liability=docs?.find(d=>d.document_type==='liability_release'&&matchesMaster(d.body,LIABILITY_TEMPLATE));
 const olderDrafts=(docs||[]).filter(d=>!((d.document_type==='service_contract'&&matchesMaster(d.body,SERVICE_TEMPLATE))||(d.document_type==='liability_release'&&matchesMaster(d.body,LIABILITY_TEMPLATE))));
 if(olderDrafts.length)return {error:'Older or customized agreement drafts exist for this customer. Review or void them before preparing the current master templates. No signing links were issued.'};
 if(!service||!liability){
  const created:string[]=[];
  if(!service){
   const result=await createAgreement(customerId,'service_contract','Power Clean Pressure & Soft Washing Service Agreement',SERVICE_TEMPLATE);
   if(result.error)return {error:'Could not create Service Agreement: '+result.error};
   created.push('Service Agreement');
  }
  if(!liability){
   const result=await createAgreement(customerId,'liability_release','Power Clean Property Condition Disclosure and Acknowledgment of Risk',LIABILITY_TEMPLATE);
   if(result.error)return {error:'Could not create Liability Acknowledgment: '+result.error};
   created.push('Liability Acknowledgment');
  }
  return {error:'Created the missing '+created.join(' and ')+'. Both drafts are now saved. Review and finalize their terms before sending; legal-review notices cannot be automatically approved.'};
 }
 const first=await prepareSigningLink(service.id);
 if(!first.token)return {error:'Service Agreement: '+(first.error||'Could not prepare signing link.')};
 const second=await prepareSigningLink(liability.id);
 if(!second.token){
  // Never expose a partially prepared bundle: revoke the first token before returning.
  const {error:rollbackError}=await supabase.from('customer_agreements').update({
   status:'draft',signing_token_hash:null,signing_expires_at:null,
   contractor_signer_name:null,contractor_signer_title:null,contractor_signed_at:null,
   contractor_authorized_by:null,contractor_signature_image_data:null
  }).eq('id',service.id).eq('business_id',member.business_id).eq('status','sent');
  if(rollbackError)return {error:'The second agreement failed and the first could not be reset. Do not share any links. Contact the administrator: '+rollbackError.message};
  return {error:'Neither agreement link was issued. The second document failed validation: '+(second.error||'Could not prepare signing link.')};
 }
 return {serviceToken:first.token,liabilityToken:second.token};
}
