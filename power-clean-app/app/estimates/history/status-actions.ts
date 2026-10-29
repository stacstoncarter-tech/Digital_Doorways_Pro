'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function updateEstimateStatus(id:string,status:string):Promise<{error?:string;success?:boolean}>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return {error:'Invalid estimate ID.'};
 if(!['draft','sent','accepted','declined'].includes(status))return {error:'Invalid status.'};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in to update estimates.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin','staff'].includes(member.role))return {error:'You do not have permission to update estimates.'};
 const {data,error}=await supabase.from('estimates').update({status}).eq('id',id).eq('business_id',member.business_id).select('id').maybeSingle();
 if(error||!data)return {error:'Could not update this estimate.'};
 revalidatePath('/estimates/history');
 revalidatePath('/estimates/view');
 return {success:true};
}
