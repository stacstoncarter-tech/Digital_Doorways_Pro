'use server';
import {createClient} from '@/lib/supabase/server';
import {headers} from 'next/headers';
export async function submitSignature(token:string,name:string,acknowledged:boolean,marketingPhotoConsent:boolean=true,documentType:string=''){
 if(token.length!==64||!name.trim()||name.length>160||!acknowledged)return {error:'Complete all signature fields.'};
 const supabase=await createClient();
 const requestHeaders=await headers();
 const agent=(requestHeaders.get('user-agent')||'Unknown browser').slice(0,400);
 const {data,error}=documentType==='service_contract'?await supabase.rpc('sign_customer_agreement_with_photo_consent',{p_token:token,p_signer_name:name,p_acknowledged:acknowledged,p_user_agent:agent,p_marketing_photo_consent:marketingPhotoConsent}):await supabase.rpc('sign_customer_agreement',{p_token:token,p_signer_name:name,p_acknowledged:acknowledged,p_user_agent:agent});
 if(error||data!==true)return {error:'This link is invalid, expired, or already signed.'};
 return {success:true};
}
