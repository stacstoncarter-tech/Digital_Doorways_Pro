'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
type Result={error?:string;success?:boolean};
async function context(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return null;const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();if(!member||!['owner','admin','staff'].includes(member.role))return null;return {supabase,user,member};}
export async function invoiceCompletedJob(jobId:string):Promise<Result>{
 const ctx=await context();if(!ctx)return {error:'Access denied.'};
 if(!/^[0-9a-f-]{36}$/i.test(jobId))return {error:'Invalid job.'};
 const {error}=await ctx.supabase.rpc('invoice_completed_job',{p_job_id:jobId});
 if(error){
  if(error.code==='23505')return {error:'An invoice already exists for this job.'};
  if(error.code==='P0001')return {error:error.message};
  return {error:'Could not create invoice.'};
 }
 revalidatePath('/invoices');revalidatePath('/jobs');return {success:true};
}
export async function setInvoiceStatus(id:string,status:string):Promise<Result>{
 const ctx=await context();if(!ctx)return {error:'Access denied.'};
 if(!/^[0-9a-f-]{36}$/i.test(id)||!['sent','void'].includes(status))return {error:'Invalid invoice update.'};
 if(status==='void')return changeInvoiceVoidStatus(id,false);
 const {data:invoice}=await ctx.supabase.from('invoices').select('id,status').is('deleted_at',null).eq('id',id).eq('business_id',ctx.member.business_id).maybeSingle();
 if(!invoice||['paid','partially_paid','void'].includes(invoice.status))return {error:'This invoice cannot be changed.'};
 const {error}=await ctx.supabase.from('invoices').update({status,updated_at:new Date().toISOString()}).is('deleted_at',null).eq('id',id).eq('business_id',ctx.member.business_id);
 if(error)return {error:'Could not update invoice.'};revalidatePath('/invoices');revalidatePath('/dashboard');revalidatePath('/operations');return {success:true};
}
export async function changeInvoiceVoidStatus(id:string,restore:boolean,legacyStatus?:string):Promise<Result>{
 const ctx=await context();if(!ctx)return {error:'Access denied.'};
 if(!/^[0-9a-f-]{36}$/i.test(id)||(legacyStatus&&!['draft','sent'].includes(legacyStatus)))return {error:'Invalid invoice update.'};
 const {error}=await ctx.supabase.rpc('change_invoice_void_status',{p_invoice_id:id,p_restore:restore,p_legacy_status:legacyStatus||null});
 if(error)return {error:error.code==='P0001'?error.message:'Could not change invoice status.'};
 const {data:invoice}=await ctx.supabase.from('invoices').select('customer_id').eq('id',id).eq('business_id',ctx.member.business_id).single();
 revalidatePath('/invoices');revalidatePath('/invoices/'+id);revalidatePath('/dashboard');revalidatePath('/operations');revalidatePath('/reports');
 if(invoice)revalidatePath('/customers/'+invoice.customer_id+'/timeline');
 return {success:true};
}
export async function recordPayment(_state:{error:string;success:string},form:FormData){
 const ctx=await context();if(!ctx)return {error:'Access denied.',success:''};
 const id=String(form.get('invoiceId')||''),amount=Number(form.get('amount')),method=String(form.get('method')||''),reference=String(form.get('reference')||'').trim();
 if(!/^[0-9a-f-]{36}$/i.test(id)||!Number.isFinite(amount)||amount<=0||Math.abs(Math.round(amount*100)-amount*100)>0.000001||!['cash','check','card','bank_transfer','other'].includes(method)||reference.length>200)return {error:'Check payment details.',success:''};
 const {error}=await ctx.supabase.rpc('record_invoice_payment',{p_invoice_id:id,p_amount:amount,p_method:method,p_reference:reference});
 if(error)return {error:'Payment could not be recorded. Verify the outstanding balance and invoice status.',success:''};
 revalidatePath('/invoices');return {error:'',success:'Payment recorded.'};
}
