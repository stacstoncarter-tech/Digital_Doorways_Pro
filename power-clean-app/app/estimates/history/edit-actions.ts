'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function updateDraftDetails(id:string,notes:string,discount:number,taxRate:number){
 if(!id||notes.length>2000||!Number.isFinite(discount)||discount<0||!Number.isFinite(taxRate)||taxRate<0||taxRate>100)return {error:'Invalid details'};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in again'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin','staff'].includes(member.role))return {error:'Permission denied'};
 const {data,error}=await supabase.from('estimates').update({notes,discount,tax_rate:taxRate}).eq('id',id).eq('business_id',member.business_id).eq('status','draft').select('id').maybeSingle();
 if(error||!data)return {error:'Only drafts can be edited'};
 revalidatePath('/estimates/history');
 return {success:true};
}
