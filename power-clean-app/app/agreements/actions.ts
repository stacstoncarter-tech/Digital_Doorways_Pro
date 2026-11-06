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
 const {data:estimate}=await supabase.from('estimates').select('id,notes,discount,tax_rate,status').eq('business_id',member.business_id).eq('customer_id',customer.id).in('status',['accepted','approved']).order('created_at',{ascending:false}).limit(1).maybeSingle();
 const {data:job}=await supabase.from('jobs').select('scheduled_start,scheduled_end').eq('business_id',member.business_id).eq('customer_id',customer.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
 const serviceDate=job?.scheduled_start?new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'medium'}).format(new Date(job.scheduled_start)):'';
 const replacements:Record<string,string>={'[CUSTOMER FULL NAME]':customer.name,'[PROPERTY ADDRESS]':address,'[CUSTOMER EMAIL]':customer.email||'','[CUSTOMER PHONE]':customer.phone||'','[NAME]':customer.name,'[DATE]':today,'[REFERENCE]':estimate?.id||'','[ESTIMATE NUMBER OR ATTACHMENT]':estimate?.id||'','[DATE / WINDOW]':serviceDate,'[OWNER NAME]':'Stacston Carter'};
 let personalized=body.trim().replaceAll('Power Clean representative: [NAME]','Power Clean representative: Stacston Carter');
 for(const [placeholder,value] of Object.entries(replacements)){if(value)personalized=personalized.replaceAll(placeholder,value);}
 if(!/^TEST ONLY\b/i.test(title.trim())&&!/^TEST ONLY\b/i.test(personalized)){const missing:string[]=[];if(!customer.name.trim())missing.push('customer full name');if(!address.trim())missing.push('service property address');const unresolved=[...new Set((personalized.match(/\[[A-Z][A-Z /-]+\]/g)||[]))];for(const field of unresolved)missing.push('unfilled agreement field '+field);if(missing.length)return {error:'Cannot save agreement. Missing: '+missing.join('; ')+'.'};}
 const {error}=await supabase.from('customer_agreements').insert({business_id:member.business_id,customer_id:customer.id,created_by:user.id,document_type:documentType,title:title.trim(),body:personalized});
 if(error)return {error:'Unable to save agreement.'};
 revalidatePath('/agreements');
 return {success:true};
}
