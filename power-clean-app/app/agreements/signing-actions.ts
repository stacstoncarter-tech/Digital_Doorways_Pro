'use server';
import {randomBytes,createHash} from 'node:crypto';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function prepareSigningLink(id:string,reissue=false,cancellationDeadline?:string){
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
 const {data:addressRow}=await supabase.from('customer_addresses').select('address').eq('customer_id',agreement.customer_id).eq('business_id',member.business_id).order('is_primary',{ascending:false}).order('created_at',{ascending:true}).limit(1).maybeSingle();
 const address=addressRow?.address||customer.service_address||'';
 const {data:estimate}=await supabase.from('estimates').select('id,created_at').eq('business_id',member.business_id).eq('customer_id',agreement.customer_id).in('status',['accepted','approved']).order('created_at',{ascending:false}).limit(1).maybeSingle();
 const {data:items}=estimate?await supabase.from('estimate_items').select('pricing_mode,square_feet,rate,fixed_price').eq('estimate_id',estimate.id):{data:null};
 const total=items?.reduce((sum,item)=>sum+(item.pricing_mode==='fixed'?Number(item.fixed_price||0):Number(item.square_feet||0)*Number(item.rate||0)),0);
 const amount=items?.length?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(total||0):'';
 const {data:job}=await supabase.from('jobs').select('scheduled_start').eq('business_id',member.business_id).eq('customer_id',agreement.customer_id).order('created_at',{ascending:false}).limit(1).maybeSingle();
 const today=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'medium'}).format(new Date());
 const date=job?.scheduled_start?new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'medium'}).format(new Date(job.scheduled_start)):'';
 const estimateDate=estimate?.created_at?new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'medium'}).format(new Date(estimate.created_at)):'';
 const {data:photoFiles}=await supabase.storage.from('power-clean-customer-photos').list(member.business_id+'/'+agreement.customer_id,{limit:100});
 const photoCount=(photoFiles||[]).filter(p=>['jpg','jpeg','png','webp','heic','heif'].includes((p.name.split('.').pop()||'').toLowerCase())).length;
 const values:Record<string,string>={'[CUSTOMER FULL NAME]':customer.name,'[PROPERTY ADDRESS]':address,'[CUSTOMER EMAIL]':customer.email||'','[CUSTOMER PHONE]':customer.phone||'','[DATE]':today,'[DATE / WINDOW]':date,'[ESTIMATE NUMBER OR ATTACHMENT]':estimate?.id||'','[REFERENCE]':estimate?.id||'','[OWNER NAME]':authorization.signer_name,'[AMOUNT]':amount,'[CONTRACTOR PHONE]':'(352) 665-4527','[CONTRACTOR EMAIL]':'pwr.wash.clean2026@gmail.com','[ESTIMATE DATE]':estimateDate,'[TRANSACTION DATE]':today,'[PHOTO COUNT]':String(photoCount)};
 if(cancellationDeadline){if(!/^\d{4}-\d{2}-\d{2}$/.test(cancellationDeadline)||!Number.isFinite(Date.parse(cancellationDeadline+'T12:00:00Z')))return {error:'Enter a valid cancellation deadline date.'};}
 let preparedBody=agreement.body.replaceAll('Power Clean representative: [NAME]','Power Clean representative: '+authorization.signer_name);
 if(cancellationDeadline)preparedBody=preparedBody.replaceAll('[CANCELLATION DEADLINE]',new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'}).format(new Date(cancellationDeadline+'T12:00:00Z')));
 for(const [key,value] of Object.entries(values))if(value)preparedBody=preparedBody.replaceAll(key,value);
 if(customer.name)preparedBody=preparedBody.replaceAll('[NAME]',customer.name);
 if(!agreement.title.toUpperCase().startsWith('TEST ONLY')&&!preparedBody.toUpperCase().startsWith('TEST ONLY')){
  if(!address)return {error:'Add a service address to this customer profile before sending.'};
  if(preparedBody.includes('DRAFT TEMPLATE')||agreement.title.toUpperCase().includes('DRAFT'))return {error:'This is an unreviewed draft template. An approved final contract version is required before customer signing.'};
  const missing:string[]=[];
  if(preparedBody.includes('[AMOUNT]'))missing.push('an accepted estimate with priced items');
  if(preparedBody.includes('[ESTIMATE NUMBER OR ATTACHMENT]')||preparedBody.includes('[REFERENCE]'))missing.push('an accepted estimate');
  if(preparedBody.includes('[DATE / WINDOW]'))missing.push('a scheduled service date');
  // The statutory deadline is determined from the actual signing date, not the preparation date.
  // Empty inspection slots are optional. Never invent an inspection finding or photograph.
  // Keep any actual, already populated disclosures intact.
  if(agreement.document_type==='liability_release'){
   preparedBody=preparedBody.replace(/\\[(?:AREA|CONDITION|PHOTOGRAPHED) [1-6]\\]/g,'Not provided');
   preparedBody=preparedBody.replaceAll('[NO KNOWN CONDITIONS]','Not specified');
   preparedBody=preparedBody.replaceAll('[ATTACHMENTS]','None listed');
   preparedBody=preparedBody.replaceAll('[PAGE COUNT]','See signed document');
  }
  const unresolved=[...new Set(preparedBody.match(/\[[A-Z][A-Z0-9 /-]+\]/g)||[])].filter(field=>!(agreement.document_type==='service_contract'&&(field==='[PHOTO CONSENT]'||field==='[CANCELLATION DEADLINE]')));
  if(unresolved.length)missing.push('unfilled contract fields: '+unresolved.join(', '));
  if(missing.length)return {error:'Complete the customer record before sending: '+[...new Set(missing)].join(', ')+'. The agreements have not been sent.'};
 }
 const token=randomBytes(32).toString('hex');
 const hash=createHash('sha256').update(token).digest('hex');
 const expires=new Date(Date.now()+7*24*60*60*1000).toISOString();
 const {data,error}=await supabase.from('customer_agreements').update({status:'sent',signing_token_hash:hash,signing_expires_at:expires,body:preparedBody,contractor_signer_name:authorization.signer_name,contractor_signer_title:authorization.signer_title,contractor_signed_at:new Date().toISOString(),contractor_authorized_by:user.id,contractor_signature_image_data:authorization.signature_image_data||null}).eq('id',id).eq('business_id',member.business_id).eq('status',reissue?'sent':'draft').select('id').maybeSingle();
 if(error)return {error:'Signing link could not be saved ('+error.code+'): '+error.message};
 if(!data)return {error:'No draft agreement was updated. Refresh the agreement list and confirm it is still in Draft status.'};
 revalidatePath('/agreements');
 return {token};
}
