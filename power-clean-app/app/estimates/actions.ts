'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
type Item = { service:string; mode:'area'|'fixed'; squareFeet:string; rate:string; manualPrice:string; lengthFt?:string; widthFt?:string; showDimensionsCustomer?:boolean };
type Payload = { customerId:string; serviceAddressId?:string; notes:string; discount:string; taxRate:string; lines:Item[] };
export async function saveEstimate(payload:Payload):Promise<{error?:string;id?:string}> {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) return {error:'Please sign in again.'};
 const {data:membership}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!membership||!['owner','admin','staff'].includes(membership.role)) return {error:'You cannot create estimates.'};
 const {data:customer}=await supabase.from('customers').select('id').eq('id',payload.customerId).eq('business_id',membership.business_id).maybeSingle();
 if(!customer) return {error:'Customer record could not be found for your business. Reopen Customers and select the saved customer.'};
 let serviceAddressId:string|null=null;
 if(payload.serviceAddressId){
  const {data:property}=await supabase.from('customer_addresses').select('id').eq('id',payload.serviceAddressId).eq('customer_id',customer.id).eq('business_id',membership.business_id).maybeSingle();
  if(!property)return {error:'Select a service property belonging to this customer.'};
  serviceAddressId=property.id;
 }
 const discount=Number(payload.discount),taxRate=Number(payload.taxRate);
 if(!Number.isFinite(discount)||discount<0||discount>10000000||!Number.isFinite(taxRate)||taxRate<0||taxRate>100||payload.notes.length>2000||payload.lines.length<1||payload.lines.length>40) return {error:'Check the estimate details.'};
 const items=[] as {description:string;pricing_mode:string;square_feet:number|null;rate:number|null;fixed_price:number|null;position:number;length_ft:number|null;width_ft:number|null;show_dimensions_customer:boolean}[];
 for(const [i,line] of payload.lines.entries()){
  const qty=Number(line.squareFeet),rate=Number(line.rate),fixed=Number(line.manualPrice);
  if(!line.service.trim()||line.service.length>200||!['area','fixed'].includes(line.mode)) return {error:'Each service needs a description and valid pricing.'};
  if(line.mode==='area'&&(!line.squareFeet||!line.rate||!Number.isFinite(qty)||!Number.isFinite(rate)||qty<0||rate<0||qty>10000000||rate>100000)) return {error:'Check square footage and rates.'};
  if(line.mode==='fixed'&&(!line.manualPrice||!Number.isFinite(fixed)||fixed<0||fixed>10000000)) return {error:'Check fixed prices.'};
  const length=line.lengthFt?Number(line.lengthFt):null,width=line.widthFt?Number(line.widthFt):null;
  if((length!==null||width!==null)&&((length===null||width===null)||!Number.isFinite(length)||!Number.isFinite(width)||length<=0||width<=0||length>100000||width>100000))return {error:'Service '+(i+1)+': enter both positive length and width measurements.'};
  if(length!==null&&width!==null&&line.mode==='area'&&Math.abs(length*width-qty)>0.02)return {error:'Service '+(i+1)+': calculated dimensions do not match square footage. Recalculate before saving.'};
  items.push({length_ft:length,width_ft:width,show_dimensions_customer:Boolean(line.showDimensionsCustomer)&&length!==null&&width!==null,description:line.service.trim(),pricing_mode:line.mode,square_feet:line.mode==='area'?qty:null,rate:line.mode==='area'?rate:null,fixed_price:line.mode==='fixed'?fixed:null,position:i});
 }
 const {data:estimate,error}=await supabase.from('estimates').insert({business_id:membership.business_id,customer_id:customer.id,service_address_id:serviceAddressId,created_by:user.id,notes:payload.notes,discount,tax_rate:taxRate}).select('id').single();
 if(error||!estimate) return {error:'Estimate could not be saved: '+(error?.message||'Database did not return the new estimate.')};
 const {error:itemError}=await supabase.from('estimate_items').insert(items.map(item=>({...item,estimate_id:estimate.id})));
 if(itemError) return {error:'Estimate record '+estimate.id+' was created, but its service items failed: '+itemError.message+'. Do not create a duplicate; contact the administrator.'};
 revalidatePath('/estimates');
 return {id:estimate.id};
}
