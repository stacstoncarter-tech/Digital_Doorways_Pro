'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';

export async function deleteSelectedDrafts(ids:string[]):Promise<{deleted?:number;error?:string}>{
 if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(id=>! /^[0-9a-f-]{36}$/i.test(id)))return {error:'Select up to 100 valid saved drafts.'};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Please sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin'].includes(member.role))return {error:'Only an owner or admin can delete drafts.'};
 const unique=[...new Set(ids)];
 const {data:rows,error:readError}=await supabase.from('customer_agreements').select('id,status,contractor_signed_at,signed_at').is('deleted_at',null).eq('business_id',member.business_id).in('id',unique);
 if(readError)return {error:'Could not verify selected drafts: '+readError.message};
 if(!rows||rows.length!==unique.length)return {error:'One or more selected drafts were not found. Refresh and retry.'};
 if(rows.some(row=>row.status!=='draft'||row.contractor_signed_at||row.signed_at))return {error:'Only unsigned drafts can be deleted. Sent, signed, or otherwise finalized agreements are protected.'};
 const {data:deleted,error}=await supabase.rpc('set_records_deleted',{p_kind:'agreement',p_ids:unique,p_deleted:true});
 if(error)return {error:'Could not move selected drafts to Trash: '+error.message};
 revalidatePath('/agreements');
 return {deleted:Number(deleted)};
}
