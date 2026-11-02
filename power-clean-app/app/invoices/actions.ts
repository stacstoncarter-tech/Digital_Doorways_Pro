'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
type Result={error?:string;success?:boolean};
async function context(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return null;const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();if(!member||!['owner','admin','staff'].includes(member.role))return null;return {supabase,user,member};}
export async function invoiceCompletedJob(jobId:string):Promise<Result>{
 const ctx=await context();if(!ctx)return {error:'Access denied.'};
 if(!/^[0-9a-f-]{36}$/i.test(jobId))return {error:'Invalid job.'};
 const {data:job}=await ctx.supabase.from('jobs').select('id,customer_id,estimate_id,status').eq('id',jobId).eq('business_id',ctx.member.business_id).maybeSingle();
 if(!job||job.status!=='completed'||!job.estimate_id)return {error:'A completed job with an estimate is required.'};
 const {data:estimate}=await ctx.supabase.from('estimates').select('id,discount,tax_rate,estimate_items(description,pricing_mode,square_feet,rate,fixed_price,position)').eq('id',job.estimate_id).eq('business_id',ctx.member.business_id).maybeSingle();
 if(!estimate)return {error:'Estimate not found.'};
 const items=(estimate.estimate_items||[]).map(i=>({description:i.description,quantity:i.pricing_mode==='area'?Number(i.square_feet||0):1,unit_price:i.pricing_mode==='area'?Number(i.rate||0):Number(i.fixed_price||0),position:i.position})).filter(i=>i.quantity>0&&i.unit_price>=0);
 if(!items.length)return {error:'Estimate has no billable services.'};
 const subtotal=items.reduce((s,i)=>s+i.quantity*i.unit_price,0);
 const invoice_number='PC-'+job.id.slice(0,8).toUpperCase();
 const {data:invoice,error}=await ctx.supabase.from('invoices').insert({business_id:ctx.member.business_id,customer_id:job.customer_id,job_id:job.id,created_by:ctx.user.id,invoice_number,subtotal:Math.round(subtotal*100)/100,discount:Number(estimate.discount||0),tax_rate:Number(estimate.tax_rate||0)}).select('id').single();
 if(error)return {error:error.code==='23505'?'An invoice already exists for this job.':'Could not create invoice.'};
 const {error:itemError}=await ctx.supabase.from('invoice_items').insert(items.map(i=>({...i,invoice_id:invoice.id})));
 if(itemError)return {error:'Invoice created but line items could not be copied. Contact support before sending.'};
 revalidatePath('/invoices');revalidatePath('/jobs');return {success:true};
}
export async function setInvoiceStatus(id:string,status:string):Promise<Result>{
 const ctx=await context();if(!ctx)return {error:'Access denied.'};
 if(!/^[0-9a-f-]{36}$/i.test(id)||!['draft','sent','void'].includes(status))return {error:'Invalid invoice update.'};
 const {data:invoice}=await ctx.supabase.from('invoices').select('id,status').eq('id',id).eq('business_id',ctx.member.business_id).maybeSingle();
 if(!invoice||['paid','partially_paid','void'].includes(invoice.status))return {error:'This invoice cannot be changed.'};
 const {error}=await ctx.supabase.from('invoices').update({status,updated_at:new Date().toISOString()}).eq('id',id).eq('business_id',ctx.member.business_id);
 if(error)return {error:'Could not update invoice.'};revalidatePath('/invoices');return {success:true};
}
export async function recordPayment(_state:{error:string;success:string},form:FormData){
 const ctx=await context();if(!ctx)return {error:'Access denied.',success:''};
 const id=String(form.get('invoiceId')||''),amount=Number(form.get('amount')),method=String(form.get('method')||''),reference=String(form.get('reference')||'').trim();
 if(!/^[0-9a-f-]{36}$/i.test(id)||!Number.isFinite(amount)||amount<=0||Math.round(amount*100)!==amount*100||!['cash','check','card','bank_transfer','other'].includes(method)||reference.length>200)return {error:'Check payment details.',success:''};
 const {data:invoice}=await ctx.supabase.from('invoices').select('id,status,total').eq('id',id).eq('business_id',ctx.member.business_id).maybeSingle();
 if(!invoice||!['sent','partially_paid'].includes(invoice.status))return {error:'Invoice must be sent before recording payment.',success:''};
 const {data:previous}=await ctx.supabase.from('invoice_payments').select('amount').eq('invoice_id',id).eq('business_id',ctx.member.business_id);
 const paid=(previous||[]).reduce((s,p)=>s+Number(p.amount),0);
 if(amount>Number(invoice.total)-paid+0.001)return {error:'Payment exceeds outstanding balance.',success:''};
 const {error}=await ctx.supabase.from('invoice_payments').insert({invoice_id:id,business_id:ctx.member.business_id,recorded_by:ctx.user.id,amount,method,reference});
 if(error)return {error:'Could not record payment.',success:''};
 const newStatus=paid+amount>=Number(invoice.total)-0.001?'paid':'partially_paid';
 await ctx.supabase.from('invoices').update({status:newStatus,updated_at:new Date().toISOString()}).eq('id',id).eq('business_id',ctx.member.business_id);
 revalidatePath('/invoices');return {error:'',success:'Payment recorded.'};
}
