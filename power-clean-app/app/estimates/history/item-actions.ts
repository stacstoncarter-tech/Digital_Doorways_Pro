'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
type Input={id:string;estimateId:string;description:string;mode:'area'|'fixed';squareFeet:number;rate:number;fixedPrice:number};
export async function updateEstimateItem(input:Input){
 if(!input.description.trim()||input.description.length>200||!['area','fixed'].includes(input.mode))return {error:'Enter a valid service description.'};
 if(![input.squareFeet,input.rate,input.fixedPrice].every(Number.isFinite)||input.squareFeet<0||input.rate<0||input.fixedPrice<0||input.squareFeet>10000000||input.rate>100000||input.fixedPrice>10000000)return {error:'Check the price and square footage.'};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin','staff'].includes(member.role))return {error:'Permission denied.'};
 const {data:estimate}=await supabase.from('estimates').select('id').eq('id',input.estimateId).eq('business_id',member.business_id).eq('status','draft').maybeSingle();
 if(!estimate)return {error:'Only draft estimates can be edited.'};
 const {data,error}=await supabase.from('estimate_items').update({description:input.description.trim(),pricing_mode:input.mode,square_feet:input.mode==='area'?input.squareFeet:null,rate:input.mode==='area'?input.rate:null,fixed_price:input.mode==='fixed'?input.fixedPrice:null}).eq('id',input.id).eq('estimate_id',estimate.id).select('id').maybeSingle();
 if(error||!data)return {error:'Could not update service.'};
 revalidatePath('/estimates/history');
 revalidatePath('/estimates/view');
 return {success:true};
}
