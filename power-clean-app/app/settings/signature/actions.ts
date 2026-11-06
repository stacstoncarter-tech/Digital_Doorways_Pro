'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function setSignatureAuthorization(approved:boolean){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).eq('role','owner').limit(1).maybeSingle();
 if(!member)return {error:'Owner access required.'};
 const now=new Date().toISOString();
 if(approved){
  const {error}=await supabase.from('business_signature_authorizations').upsert({business_id:member.business_id,authorized_by:user.id,signer_name:'Stacston Carter',signer_title:'Owner, Power Clean',authorized_at:now,revoked_at:null,updated_at:now},{onConflict:'business_id'});
  if(error)return {error:'Could not save authorization.'};
 }else{
  const {error}=await supabase.from('business_signature_authorizations').update({revoked_at:now,updated_at:now}).eq('business_id',member.business_id).eq('authorized_by',user.id);
  if(error)return {error:'Could not revoke authorization.'};
 }
 revalidatePath('/settings/signature');
 return {success:true};
}

export async function saveSignatureArtwork(dataUrl:string){
 if(!/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)||dataUrl.length>350000)return {error:'Upload a PNG or WebP signature image under 250 KB.'};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).eq('role','owner').limit(1).maybeSingle();
 if(!member)return {error:'Owner access required.'};
 const {error}=await supabase.from('business_signature_authorizations').update({signature_image_data:dataUrl,updated_at:new Date().toISOString()}).eq('business_id',member.business_id).eq('authorized_by',user.id).is('revoked_at',null);
 if(error)return {error:'Unable to save signature image.'};
 revalidatePath('/settings/signature');
 return {success:true};
}
