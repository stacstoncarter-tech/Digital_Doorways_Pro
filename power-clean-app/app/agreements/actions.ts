'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function createAgreement(customerId:string,documentType:string,title:string,body:string){
 if(!['service_contract','liability_release'].includes(documentType)||!title.trim()||title.length>160||!body.trim()||body.length>20000)return {error:'Check the agreement details.'};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin','staff'].includes(member.role))return {error:'Permission denied.'};
 const {data:customer}=await supabase.from('customers').select('id,name,email,phone,service_address').eq('id',customerId).eq('business_id',member.business_id).maybeSingle();
 if(!customer)return {error:'Choose a valid customer.'};
 const {data:primaryAddress}=await supabase.from('customer_addresses').select('address').eq('business_id',member.business_id).eq('customer_id',customer.id).eq('is_primary',true).limit(1).maybeSingle();
 const address=primaryAddress?.address||customer.service_address||'';
 const today=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'long',day:'numeric'}).format(new Date());
 const replacements:Record<string,string>={'[CUSTOMER FULL NAME]':customer.name,'[PROPERTY ADDRESS]':address,'[NAME]':customer.name,'[DATE]':today};
 let personalized=body.trim();
 for(const [placeholder,value] of Object.entries(replacements)){if(value)personalized=personalized.replaceAll(placeholder,value);}
 if(!/^TEST ONLY\\b/i.test(title.trim())&&!/^TEST ONLY\\b/i.test(personalized)&&(!address||/\\[(?:CUSTOMER FULL NAME|PROPERTY ADDRESS|NAME|DATE)\\]/.test(personalized)))return {error:'Customer name, service address, or required details are missing. Complete the customer profile and placeholders first.'};
 const {error}=await supabase.from('customer_agreements').insert({business_id:member.business_id,customer_id:customer.id,created_by:user.id,document_type:documentType,title:title.trim(),body:personalized});
 if(error)return {error:'Unable to save agreement.'};
 revalidatePath('/agreements');
 return {success:true};
}
