'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function deleteCustomer(customerId:string,confirmation:string){
 if(!/^[0-9a-f-]{36}$/i.test(customerId)||confirmation!=='DELETE')return {error:'Type DELETE to confirm.'};
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)return {error:'Sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin'].includes(member.role))return {error:'Only the business owner or administrator may delete customers.'};
 const {data:customer}=await supabase.from('customers').select('id').eq('id',customerId).eq('business_id',member.business_id).maybeSingle();
 if(!customer)return {error:'Customer not found.'};
 for(const table of ['customer_agreements','estimates','jobs','invoices']){
  const {count,error}=await supabase.from(table).select('id',{head:true,count:'exact'}).eq('business_id',member.business_id).eq('customer_id',customerId);
  if(error)return {error:'Could not verify linked records. No deletion performed.'};
  if((count||0)>0)return {error:'This customer has agreements, estimates, jobs, or invoices. Deletion is blocked to preserve business and legal records.'};
 }
 const {data:photos,error:photoError}=await supabase.storage.from('power-clean-customer-photos').list(member.business_id+'/'+customerId,{limit:1});
 if(photoError)return {error:'Could not check stored customer photos. No deletion performed.'};
 if(photos?.length)return {error:'This customer has stored photos. Remove them separately before deleting the customer.'};
 const {error}=await supabase.from('customers').delete().eq('id',customerId).eq('business_id',member.business_id);
 if(error)return {error:'Could not delete this customer. Linked records or permissions may prevent deletion.'};
 revalidatePath('/customers');return {success:true};
}
