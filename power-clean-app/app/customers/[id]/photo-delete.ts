'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function deleteCustomerPhoto(customerId:string,path:string){
 if(!/^[0-9a-f-]{36}$/i.test(customerId))return {error:'Invalid customer ID.'};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)return {error:'Please sign in.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin','staff'].includes(member.role))return {error:'You do not have permission to delete photos.'};
 const {data:customer}=await supabase.from('customers').select('id').eq('id',customerId).eq('business_id',member.business_id).maybeSingle();
 if(!customer)return {error:'Customer not found.'};
 const prefix=member.business_id+'/'+customerId+'/';
 if(!path.startsWith(prefix)||path.slice(prefix.length).includes('/')||!/^[-\w.]+\.(jpg|jpeg|png|webp|heic|heif)$/i.test(path.slice(prefix.length)))return {error:'Invalid photo path.'};
 const {data,error}=await supabase.storage.from('power-clean-customer-photos').remove([path]);
 if(error)return {error:'Photo could not be deleted: '+error.message};
 if(!data?.some(f=>f.name===path))return {error:'Photo deletion could not be confirmed.'};
 revalidatePath('/customers/'+customerId+'/photos');return {success:true};
}
