'use server';
import {randomBytes,createHash} from 'node:crypto';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function prepareSigningLink(id:string,reissue=false){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin'].includes(member.role))return {error:'Only an owner or admin can prepare signing links.'};
 const {data:authorization}=await supabase.from('business_signature_authorizations').select('authorized_by,signer_name,signer_title,revoked_at,signature_image_data').eq('business_id',member.business_id).maybeSingle();
 if(!authorization||authorization.revoked_at)return {error:'Authorize your business signature in Settings before preparing customer agreements.'};
 if(authorization.authorized_by!==user.id)return {error:'The business owner must personally approve this agreement for sending.'};
 const {data:agreement}=await supabase.from('customer_agreements').select('title,body,document_type,customer_id').eq('id',id).eq('business_id',member.business_id).maybeSingle();
 if(!agreement)return {error:'Agreement not found.'};
 const {data:customer}=await supabase.from('customers').select('name,email,phone,service_address').eq('id',agreement.customer_id).eq('business_id',member.business_id).maybeSingle();
 if(!customer)return {error:'Customer information is missing.'};
 const {data:addressRow}=await supabase.from('customer_addresses').select('address').eq('customer_id',agreement.customer_id).eq('business_id',member.business_id).eq('is_primary',true).limit(1).maybeSingle();
 const address=addressRow?.address||customer.service_address||'';
 const {data:estimate}=await supabase.from('estimates').select('id').eq('business_id',member.business_id).eq('customer_id',agreement.customer_id).in('status',['accepted','approved']).order('created_at',{ascending:false}).limit(1).maybeSingle();
 const {data:job}=await supabase.from('jobs').select('scheduled_start').eq('business_id',member.business_id).eq('customer_id',agreement.customer_id).order('created_at',{ascending:false}).limit(1).maybeSingle();
 const today=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'medium'}).format(new Date());
 const date=job?.scheduled_start?new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'medium'}).format(new Date(job.scheduled_start)):'';
 const values:Record<string,string>={'[CUSTOMER FULL NAME]':customer.name,'[PROPERTY ADDRESS]':address,'[CUSTOMER EMAIL]':customer.email||'','[CUSTOMER PHONE]':customer.phone||'','[DATE]':today,'[DATE / WINDOW]':date,'[ESTIMATE NUMBER OR ATTACHMENT]':estimate?.id||'','[REFERENCE]':estimate?.id||'','[OWNER NAME]':authorization.signer_name};
 let preparedBody=agreement.body.replaceAll('Power Clean representative: [NAME]','Power Clean representative: '+authorization.signer_name);
 for(const [key,value] of Object.entries(values))if(value)preparedBody=preparedBody.replaceAll(key,value);
 if(customer.name)preparedBody=preparedBody.replaceAll('[NAME]',customer.name);
 if(!agreement.title.toUpperCase().startsWith('TEST ONLY')&&!preparedBody.toUpperCase().startsWith('TEST ONLY')){
  if(!address)return {error:'Add a service address to this customer profile before sending.'};
  if(preparedBody.includes('DRAFT TEMPLATE')||agreement.title.toUpperCase().includes('DRAFT'))return {error:'This is an unreviewed draft template. An approved final contract version is required before customer signing.'};
  if(/\\[[A-Z][A-Z /-]+\\]/.test(preparedBody))return {error:'Some service details are not yet recorded (such as price, estimate or date). Complete the estimate and schedule before sending.'};
 }
 const token=randomBytes(32).toString('hex');
 const hash=createHash('sha256').update(token).digest('hex');
 const expires=new Date(Date.now()+7*24*60*60*1000).toISOString();
 const {data,error}=await supabase.from('customer_agreements').update({status:'sent',signing_token_hash:hash,signing_expires_at:expires,body:preparedBody,contractor_signer_name:authorization.signer_name,contractor_signer_title:authorization.signer_title,contractor_signed_at:new Date().toISOString(),contractor_authorized_by:user.id,contractor_signature_image_data:authorization.signature_image_data||null}).eq('id',id).eq('business_id',member.business_id).eq('status',reissue?'sent':'draft').select('id').maybeSingle();
 if(error||!data)return {error:'Could not prepare the signing link. The agreement may already be signed.'};
 revalidatePath('/agreements');
 return {token};
}
