'use server';
import {randomBytes,createHash} from 'node:crypto';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function prepareSigningLink(id:string,reissue=false){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin'].includes(member.role))return {error:'Only an owner or admin can prepare signing links.'};
 const token=randomBytes(32).toString('hex');
 const hash=createHash('sha256').update(token).digest('hex');
 const expires=new Date(Date.now()+7*24*60*60*1000).toISOString();
 const {data,error}=await supabase.from('customer_agreements').update({status:'sent',signing_token_hash:hash,signing_expires_at:expires}).eq('id',id).eq('business_id',member.business_id).eq('status',reissue?'sent':'draft').select('id').maybeSingle();
 if(error||!data)return {error:'Could not prepare the signing link. The agreement may already be signed.'};
 revalidatePath('/agreements');
 return {token};
}
