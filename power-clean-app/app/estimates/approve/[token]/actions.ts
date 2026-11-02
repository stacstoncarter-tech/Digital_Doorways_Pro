'use server';
import {createClient} from '@/lib/supabase/server';
export async function respondToEstimate(token:string,response:'accepted'|'declined'){
 if(!/^[0-9a-f]{64}$/.test(token)||!['accepted','declined'].includes(response))return {error:'Invalid link.'};
 const supabase=await createClient();
 const {data,error}=await supabase.rpc('respond_customer_estimate',{p_token:token,p_response:response});
 if(error||!data)return {error:'This link has expired or the estimate has already been answered.'};
 return {success:true};
}
