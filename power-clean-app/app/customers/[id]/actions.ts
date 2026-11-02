'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type CustomerActionState = { error:string; success:string };
async function access(customerId:string) {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member) return null;
 const {data:customer}=await supabase.from('customers').select('id').eq('id',customerId).eq('business_id',member.business_id).maybeSingle();
 if(!customer)return null;
 return {supabase,member,user};
}
export async function addAddress(_state:CustomerActionState,form:FormData):Promise<CustomerActionState>{
 const customerId=String(form.get('customerId')||'');
 const label=String(form.get('label')||'').trim();
 const address=String(form.get('address')||'').trim();
 if(!/^[0-9a-f-]{36}$/i.test(customerId)||!label||label.length>80||!address||address.length>240)return {error:'Enter a valid label and service address.',success:''};
 const ctx=await access(customerId);
 if(!ctx||!['owner','admin','staff'].includes(ctx.member.role))return {error:'Access denied.',success:''};
 const {error}=await ctx.supabase.from('customer_addresses').insert({business_id:ctx.member.business_id,customer_id:customerId,label,address});
 if(error)return {error:'Could not save service address.',success:''};
 revalidatePath('/customers/'+customerId);
 return {error:'',success:'Service address added.'};
}
export async function addNote(_state:CustomerActionState,form:FormData):Promise<CustomerActionState>{
 const customerId=String(form.get('customerId')||'');
 const body=String(form.get('body')||'').trim();
 if(!/^[0-9a-f-]{36}$/i.test(customerId)||!body||body.length>4000)return {error:'Enter a note (up to 4,000 characters).',success:''};
 const ctx=await access(customerId);
 if(!ctx||!['owner','admin','staff'].includes(ctx.member.role))return {error:'Access denied.',success:''};
 const {error}=await ctx.supabase.from('customer_notes').insert({business_id:ctx.member.business_id,customer_id:customerId,author_id:ctx.user.id,body});
 if(error)return {error:'Could not save customer note.',success:''};
 revalidatePath('/customers/'+customerId);
 return {error:'',success:'Note saved.'};
}

export async function updateCustomer(_state:CustomerActionState,form:FormData):Promise<CustomerActionState>{
 const customerId=String(form.get('customerId')||'');
 const name=String(form.get('name')||'').trim(),email=String(form.get('email')||'').trim(),phone=String(form.get('phone')||'').trim();
 if(!/^[0-9a-f-]{36}$/i.test(customerId)||!name||name.length>120||email.length>200||phone.length>40||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return {error:'Check customer name, email and phone.',success:''};
 const ctx=await access(customerId);
 if(!ctx||!['owner','admin','staff'].includes(ctx.member.role))return {error:'Access denied.',success:''};
 const {error}=await ctx.supabase.from('customers').update({name,email:email||null,phone:phone||null}).eq('id',customerId).eq('business_id',ctx.member.business_id);
 if(error)return {error:'Could not update customer.',success:''};
 revalidatePath('/customers');revalidatePath('/customers/'+customerId);
 return {error:'',success:'Customer updated.'};
}
export async function updateAddress(_state:CustomerActionState,form:FormData):Promise<CustomerActionState>{
 const customerId=String(form.get('customerId')||''),addressId=String(form.get('addressId')||'');
 const label=String(form.get('label')||'').trim(),address=String(form.get('address')||'').trim();
 if(!/^[0-9a-f-]{36}$/i.test(customerId)||!/^[0-9a-f-]{36}$/i.test(addressId)||!label||label.length>80||!address||address.length>240)return {error:'Check the property label and address.',success:''};
 const ctx=await access(customerId);
 if(!ctx||!['owner','admin','staff'].includes(ctx.member.role))return {error:'Access denied.',success:''};
 const {data,error}=await ctx.supabase.from('customer_addresses').update({label,address}).eq('id',addressId).eq('customer_id',customerId).eq('business_id',ctx.member.business_id).select('id').maybeSingle();
 if(error||!data)return {error:'Could not update property.',success:''};
 revalidatePath('/customers/'+customerId);
 return {error:'',success:'Property updated.'};
}
