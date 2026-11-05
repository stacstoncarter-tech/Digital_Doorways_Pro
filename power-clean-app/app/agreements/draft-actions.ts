'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function saveAgreementDraft(id:string,body:string){
 if(!/^[0-9a-f-]{36}$/i.test(id)||!body.trim()||body.length>20000)return {error:'Invalid agreement details.'};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||member.role!=='owner')return {error:'Only the business owner can finalize agreement wording.'};
 const {data,error}=await supabase.from('customer_agreements').update({body:body.trim()}).eq('id',id).eq('business_id',member.business_id).eq('status','draft').select('id').maybeSingle();
 if(error||!data)return {error:'Draft was not updated. Signed or sent documents cannot be edited.'};
 revalidatePath('/agreements');revalidatePath('/agreements/view');
 return {success:true};
}
