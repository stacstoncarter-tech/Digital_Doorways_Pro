'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
import {serviceTimeToIso} from '@/lib/schedule-time';
type Result={error?:string;success?:boolean};
async function context(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)return null;
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin','staff'].includes(member.role))return null;
 return {supabase,user,member};
}
export async function createJobFromEstimate(estimateId:string):Promise<Result>{
 const ctx=await context();if(!ctx)return {error:'Access denied.'};
 if(!/^[0-9a-f-]{36}$/i.test(estimateId))return {error:'Invalid estimate.'};
 const {data:e}=await ctx.supabase.from('estimates').select('id,customer_id,service_address_id,status').is('deleted_at',null).eq('id',estimateId).eq('business_id',ctx.member.business_id).maybeSingle();
 if(!e||e.status!=='accepted')return {error:'Only accepted estimates can become jobs.'};
 const {data:existing}=await ctx.supabase.from('jobs').select('id').is('deleted_at',null).eq('business_id',ctx.member.business_id).eq('estimate_id',e.id).limit(1).maybeSingle();
 if(existing)return {error:'A job already exists for this estimate.'};
 const {error}=await ctx.supabase.from('jobs').insert({business_id:ctx.member.business_id,customer_id:e.customer_id,estimate_id:e.id,service_address_id:e.service_address_id,created_by:ctx.user.id});
 if(error)return {error:error.code==='23505'?'A job already exists for this estimate.':'Could not create job.'};
 revalidatePath('/jobs');revalidatePath('/estimates/history');
 return {success:true};
}
export async function updateJob(_state:{error:string;success:string},form:FormData):Promise<{error:string;success:string}>{
 const ctx=await context();if(!ctx)return {error:'Access denied.',success:''};
 const id=String(form.get('id')||''),status=String(form.get('status')||''),notes=String(form.get('notes')||'').trim();
 const testScheduling=form.get('testScheduling')==='on';
 if(!/^[0-9a-f-]{36}$/i.test(id)||!['unscheduled','scheduled','in_progress','completed','canceled'].includes(status)||notes.length>4000)return {error:'Invalid job details.',success:''};
 const start=String(form.get('start')||''),end=String(form.get('end')||'');
 const startIso=start?serviceTimeToIso(start):null,endIso=end?serviceTimeToIso(end):null;
 if((start&&!startIso)||(end&&!endIso))return {error:'Check the service dates. Enter valid Eastern times.',success:''};
 if(endIso&&(!startIso||endIso<=startIso))return {error:'Check the service date and arrival window.',success:''};
 if(status==='scheduled'&&!startIso)return {error:'A scheduled job needs a start date.',success:''};
 const {data:old}=await ctx.supabase.from('jobs').select('status,completed_at,notes').is('deleted_at',null).eq('id',id).eq('business_id',ctx.member.business_id).maybeSingle();
 if(!old)return {error:'Job not found.',success:''};
 if(['scheduled','in_progress','completed'].includes(status)){
  const {data:job}=await ctx.supabase.from('jobs').select('customer_id').is('deleted_at',null).eq('id',id).eq('business_id',ctx.member.business_id).maybeSingle();
  if(!job)return {error:'Job not found.',success:''};
  const {data:docs,error:docError}=await ctx.supabase.from('customer_agreements').select('document_type,status,title,body').is('deleted_at',null).eq('business_id',ctx.member.business_id).eq('customer_id',job.customer_id).in('document_type',['service_contract','liability_release']).eq('status','signed');
  if(docError)return {error:'Unable to verify signed documents. Try again.',success:''};
  const types=new Set((docs||[]).filter(d=>!/^TEST ONLY\b/i.test(d.title.trim())&&!/\bDraft\b/i.test(d.title)&&!/^TEST ONLY\b/i.test(d.body.trim())&&!/DRAFT TEMPLATE — REVIEW WITH FLORIDA COUNSEL BEFORE USE/i.test(d.body)).map(d=>d.document_type));
  if(!types.has('service_contract')||!types.has('liability_release')){
   const testDocs=(docs||[]).filter(d=>/^TEST ONLY\b/i.test(d.title.trim())||/^TEST ONLY\b/i.test(d.body.trim()));
   const testTypes=new Set(testDocs.map(d=>d.document_type));
   const isTestOnlyBundle=testTypes.has('service_contract')&&testTypes.has('liability_release');
   if(testScheduling&&ctx.member.role==='owner'&&status==='scheduled'&&isTestOnlyBundle){
    const testNotes='[TEST ONLY — NOT AUTHORIZED FOR CUSTOMER WORK] '+notes;
    const {data:savedTest,error:testError}=await ctx.supabase.from('jobs').update({status,notes:testNotes,scheduled_start:startIso,scheduled_end:endIso,completed_at:null,updated_at:new Date().toISOString()}).is('deleted_at',null).eq('id',id).eq('business_id',ctx.member.business_id).select('id').maybeSingle();
    if(testError||!savedTest)return {error:'Could not save test schedule.',success:''};
    revalidatePath('/jobs');revalidatePath('/jobs/calendar');revalidatePath('/jobs/'+id);
    return {error:'',success:'TEST ONLY schedule saved. This does not authorize real customer work.'};
   }
   if(testScheduling)return {error:'Test scheduling requires an owner account, Scheduled status, and both signed TEST ONLY agreements for this customer.',success:''};
   const missing=[!types.has('service_contract')?'Service Agreement':null,!types.has('liability_release')?'Property Condition & Liability Acknowledgment':null].filter(Boolean).join(' and ');
   const signed=(docs||[]).filter(d=>d.status==='signed');
   const excluded=signed.filter(d=>/^TEST ONLY\b/i.test(d.title.trim())||/\bDraft\b/i.test(d.title)||/^TEST ONLY\b/i.test(d.body.trim())||/DRAFT TEMPLATE — REVIEW WITH FLORIDA COUNSEL BEFORE USE/i.test(d.body));
   return {error:excluded.length?'Scheduling blocked: signed test-only or draft agreements cannot authorize real work. Prepare and sign the approved final agreements for this customer. Missing eligible document(s): '+missing+'.':'Scheduling blocked: no eligible signed '+missing+' found for this job’s customer. Open Agreements for this customer, verify both final documents are signed, then retry.',success:''};
  }
 }
 if((old.notes||'').startsWith('[TEST ONLY — NOT AUTHORIZED FOR CUSTOMER WORK]')&&status!=='canceled')return {error:'This is a TEST ONLY job. It cannot be converted into real customer work; create a separate production job with approved agreements.',success:''};
 const {data:saved,error}=await ctx.supabase.from('jobs').update({status,notes,scheduled_start:startIso,scheduled_end:endIso,completed_at:status==='completed'?(old.completed_at||new Date().toISOString()):null,updated_at:new Date().toISOString()}).is('deleted_at',null).eq('id',id).eq('business_id',ctx.member.business_id).select('id').maybeSingle();
 if(error||!saved)return {error:'Could not save this job. Refresh and check that the job is still available and editable.',success:''};
 revalidatePath('/jobs');revalidatePath('/jobs/calendar');revalidatePath('/jobs/'+id);return {error:'',success:status==='scheduled'?'Job scheduled.':status==='unscheduled'&&startIso?'Proposed service dates saved. Job is still unscheduled.':'Job updated.'};
}
