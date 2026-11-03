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
 const {data:authorization}=await supabase.from('business_signature_authorizations').select('authorized_by,signer_name,signer_title,revoked_at').eq('business_id',member.business_id).maybeSingle();
 if(!authorization||authorization.revoked_at)return {error:'Authorize your business signature in Settings before preparing customer agreements.'};
 if(authorization.authorized_by!==user.id)return {error:'The business owner must personally approve this agreement for sending.'};
 const {data:agreement}=await supabase.from('customer_agreements').select('title,body,document_type').eq('id',id).eq('business_id',member.business_id).maybeSingle();
 if(!agreement)return {error:'Agreement not found.'};
 if(!/^TEST ONLY\\b/i.test(agreement.title)&&!/^TEST ONLY\\b/i.test(agreement.body)&&(/\\bDRAFT\\b/i.test(agreement.title)||/DRAFT TEMPLATE — REVIEW WITH FLORIDA COUNSEL BEFORE USE/i.test(agreement.body)||/\\[[A-Z][A-Z /-]+\\]/.test(agreement.body)))return {error:'Finalize the agreement and resolve all placeholders before sending it for signature.'};
 const token=randomBytes(32).toString('hex');
 const hash=createHash('sha256').update(token).digest('hex');
 const expires=new Date(Date.now()+7*24*60*60*1000).toISOString();
 const {data,error}=await supabase.from('customer_agreements').update({status:'sent',signing_token_hash:hash,signing_expires_at:expires,contractor_signer_name:authorization.signer_name,contractor_signer_title:authorization.signer_title,contractor_signed_at:new Date().toISOString(),contractor_authorized_by:user.id}).eq('id',id).eq('business_id',member.business_id).eq('status',reissue?'sent':'draft').select('id').maybeSingle();
 if(error||!data)return {error:'Could not prepare the signing link. The agreement may already be signed.'};
 revalidatePath('/agreements');
 return {token};
}
