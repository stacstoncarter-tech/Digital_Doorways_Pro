'use server';
import {createClient} from '@/lib/supabase/server';
import {prepareSigningLink} from './signing-actions';
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
 if(!service||!liability)return {error:'Create both a draft Service Agreement and a draft Property Condition & Liability Acknowledgment for this customer first.'};
 const first=await prepareSigningLink(service.id);
 if(!first.token)return {error:'Service Agreement: '+(first.error||'Could not prepare signing link.')};
 const second=await prepareSigningLink(liability.id);
 if(!second.token)return {error:'Service Agreement prepared, but liability acknowledgment failed: '+(second.error||'Could not prepare signing link.')+'. Return to agreements to prepare the second document.'};
 return {serviceToken:first.token,liabilityToken:second.token};
}
