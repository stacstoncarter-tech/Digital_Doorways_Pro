'use server';
import {createClient} from '@/lib/supabase/server';
import {prepareSigningLink} from './signing-actions';
import {createAgreement} from './actions';
import {SERVICE_TEMPLATE,LIABILITY_TEMPLATE} from './templates';
export async function prepareAgreementBundle(customerId:string){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).eq('role','owner').maybeSingle();
 if(!member)return {error:'The business owner must approve both documents.'};
 const {data:docs,error}=await supabase.from('customer_agreements').select('id,document_type,status,title').eq('business_id',member.business_id).eq('customer_id',customerId).eq('status','draft').order('created_at',{ascending:false});
 if(error)return {error:'Could not load customer agreements.'};
 const service=docs?.find(d=>d.document_type==='service_contract');
 const liability=docs?.find(d=>d.document_type==='liability_release');
 if(!service||!liability){
  const created:string[]=[];
  if(!service){
   const result=await createAgreement(customerId,'service_contract','Power Clean Pressure & Soft Washing Service Agreement',SERVICE_TEMPLATE);
   if(result.error)return {error:'Could not create Service Agreement: '+result.error};
   created.push('Service Agreement');
  }
  if(!liability){
   const result=await createAgreement(customerId,'liability_release','Power Clean Property Condition & Liability Acknowledgment',LIABILITY_TEMPLATE);
   if(result.error)return {error:'Could not create Liability Acknowledgment: '+result.error};
   created.push('Liability Acknowledgment');
  }
  return {error:'Created the missing '+created.join(' and ')+'. Both drafts are now saved. Review and finalize their terms before sending; legal-review notices cannot be automatically approved.'};
 }
 const first=await prepareSigningLink(service.id);
 if(!first.token)return {error:'Service Agreement: '+(first.error||'Could not prepare signing link.')};
 const second=await prepareSigningLink(liability.id);
 if(!second.token)return {error:'Service Agreement prepared, but liability acknowledgment failed: '+(second.error||'Could not prepare signing link.')+'. Return to agreements to prepare the second document.'};
 return {serviceToken:first.token,liabilityToken:second.token};
}
