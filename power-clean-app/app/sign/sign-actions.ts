'use server';
import {createClient} from '@/lib/supabase/server';
export async function submitSignature(token:string,name:string,acknowledged:boolean){
 if(token.length!==64||!name.trim()||name.length>160||!acknowledged)return {error:'Complete all signature fields.'};
 const supabase=await createClient();
 const {data,error}=await supabase.rpc('sign_customer_agreement',{p_token:token,p_signer_name:name,p_acknowledged:acknowledged,p_user_agent:'Web signing form'});
 if(error||data!==true)return {error:'This link is invalid, expired, or already signed.'};
 return {success:true};
}
