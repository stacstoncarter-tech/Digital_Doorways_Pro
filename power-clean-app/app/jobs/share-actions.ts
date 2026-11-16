'use server';
import {createClient} from '@/lib/supabase/server';
export async function prepareCustomerShare(jobId:string,includePhotos:boolean){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin','staff'].includes(member.role))return {error:'Access denied.'};
 const {data:job}=await supabase.from('jobs').select('id,customer_id,status,scheduled_start,scheduled_end,notes,service_address_id').is('deleted_at',null).eq('id',jobId).eq('business_id',member.business_id).maybeSingle();
 if(!job||!job.scheduled_start||!['scheduled','in_progress','completed'].includes(job.status))return {error:'Save a scheduled appointment first.'};
 const {data:customer}=await supabase.from('customers').select('name,email,phone,service_address').eq('id',job.customer_id).eq('business_id',member.business_id).maybeSingle();
 if(!customer)return {error:'Customer not found.'};
 const {data:address}=job.service_address_id?await supabase.from('customer_addresses').select('address').eq('id',job.service_address_id).eq('business_id',member.business_id).maybeSingle():{data:null};
 const fmt=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'full',timeStyle:'short'}).format(new Date(date));
 const isTest=(job.notes||'').startsWith('[TEST ONLY — NOT AUTHORIZED FOR CUSTOMER WORK]');
 const subject=(isTest?'TEST ONLY — ':'')+'Power Clean Appointment Confirmation';
 let message=(isTest?'TEST ONLY — This is a demonstration appointment, not a real booking.\n\n':'')+
 'Hello '+customer.name+',\n\nYour Power Clean service appointment is scheduled.\nDate and start: '+fmt(job.scheduled_start)+
 (job.scheduled_end?'\nArrival window ends: '+fmt(job.scheduled_end):'')+
 '\nService address: '+(address?.address||customer.service_address||'Address on file')+
 '\n\nQuestions or changes? Call (352) 665-4527.\nPower Clean';
 let photoCount=0;
 if(includePhotos){
  const {data:photos,error}=await supabase.from('job_photos').select('storage_path,phase').eq('job_id',job.id).eq('business_id',member.business_id).order('created_at',{ascending:false}).limit(20);
  if(error)return {error:'Could not load job photos.'};
  if(!photos?.length)return {error:'Upload job photos before sharing them.'};
  const {data:links,error:linkError}=await supabase.storage.from('power-clean-job-photos').createSignedUrls(photos.map(p=>p.storage_path),86400);
  if(linkError||!links)return {error:'Could not create secure photo links.'};
  const valid=links.map((link,i)=>({url:link.signedUrl,phase:photos[i].phase})).filter(p=>!!p.url);
  if(!valid.length)return {error:'No photos could be shared.'};
  photoCount=valid.length;
  message+='\n\nJOB PHOTOS — secure links expire after 24 hours:\n'+valid.map((p,i)=>(i+1)+'. '+p.phase+': '+p.url).join('\n');
 }
 return {subject,message,email:customer.email||'',phone:customer.phone||'',photoCount,isTest};
}
