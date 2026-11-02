'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
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
 const {data:e}=await ctx.supabase.from('estimates').select('id,customer_id,service_address_id,status').eq('id',estimateId).eq('business_id',ctx.member.business_id).maybeSingle();
 if(!e||e.status!=='accepted')return {error:'Only accepted estimates can become jobs.'};
 const {error}=await ctx.supabase.from('jobs').insert({business_id:ctx.member.business_id,customer_id:e.customer_id,estimate_id:e.id,service_address_id:e.service_address_id,created_by:ctx.user.id});
 if(error)return {error:error.code==='23505'?'A job already exists for this estimate.':'Could not create job.'};
 revalidatePath('/jobs');revalidatePath('/estimates/history');
 return {success:true};
}
export async function updateJob(_state:{error:string;success:string},form:FormData):Promise<{error:string;success:string}>{
 const ctx=await context();if(!ctx)return {error:'Access denied.',success:''};
 const id=String(form.get('id')||''),status=String(form.get('status')||''),notes=String(form.get('notes')||'').trim();
 if(!/^[0-9a-f-]{36}$/i.test(id)||!['unscheduled','scheduled','in_progress','completed','canceled'].includes(status)||notes.length>4000)return {error:'Invalid job details.',success:''};
 const start=String(form.get('start')||''),end=String(form.get('end')||'');
 const startIso=start?new Date(start).toISOString():null,endIso=end?new Date(end).toISOString():null;
 if((start&&!Number.isFinite(Date.parse(start)))||(end&&!Number.isFinite(Date.parse(end)))||(endIso&&(!startIso||endIso<=startIso)))return {error:'Check the service date and arrival window.',success:''};
 if(status==='scheduled'&&!startIso)return {error:'A scheduled job needs a start date.',success:''};
 const {data:old}=await ctx.supabase.from('jobs').select('status,completed_at').eq('id',id).eq('business_id',ctx.member.business_id).maybeSingle();
 if(!old)return {error:'Job not found.',success:''};
 const {error}=await ctx.supabase.from('jobs').update({status,notes,scheduled_start:startIso,scheduled_end:endIso,completed_at:status==='completed'?(old.completed_at||new Date().toISOString()):null,updated_at:new Date().toISOString()}).eq('id',id).eq('business_id',ctx.member.business_id);
 if(error)return {error:'Could not update job.',success:''};
 revalidatePath('/jobs');return {error:'',success:'Job updated.'};
}
