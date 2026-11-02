'use server';
import {randomBytes,createHash} from 'node:crypto';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function createEstimateApprovalLink(estimateId:string):Promise<{url?:string;error?:string}>{
 if(!/^[0-9a-f-]{36}$/i.test(estimateId))return {error:'Invalid estimate.'};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Please sign in.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin','staff'].includes(member.role))return {error:'Access denied.'};
 const {data:estimate}=await supabase.from('estimates').select('id,status').eq('id',estimateId).eq('business_id',member.business_id).maybeSingle();
 if(!estimate||!['draft','sent'].includes(estimate.status))return {error:'Only pending estimates can be shared.'};
 const token=randomBytes(32).toString('hex');
 const token_hash=createHash('sha256').update(token).digest('hex');
 const expires_at=new Date(Date.now()+14*86400000).toISOString();
 const {error}=await supabase.from('estimate_approval_links').insert({estimate_id:estimateId,business_id:member.business_id,token_hash,expires_at,created_by:user.id});
 if(error)return {error:'Could not create approval link.'};
 revalidatePath('/estimates/history');
 const base=process.env.NEXT_PUBLIC_SITE_URL||process.env.NEXT_PUBLIC_APP_URL||'';
 return {url:(base?base.replace(/\/$/,''):'')+'/estimates/approve/'+token};
}
