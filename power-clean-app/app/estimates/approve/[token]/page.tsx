import DiscountBreakdown from "@/app/estimates/discount-breakdown";
import type { PublicDiscount } from "@/lib/smart-estimate/discounts";
import {createClient} from '@/lib/supabase/server';
import Decision from './decision';
import {POWER_CLEAN_LOGO} from '@/lib/branding';
type Item={description:string;mode:string;squareFeet:number|null;rate:number|null;fixedPrice:number|null};
type Approval={id:string;status:string;response:string|null;expiresAt:string;customerName:string|null;property:string|null;items:Item[];notes:string;subtotal:number;discount:number;discountDetails?:PublicDiscount[];taxRate:number;total:number};
const money=(n:number)=>Number(n).toLocaleString('en-US',{style:'currency',currency:'USD'});
export default async function CustomerEstimateApproval({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[0-9a-f]{64}$/.test(token))return <main className="workspace"><h1>Invalid approval link</h1></main>;
 const supabase=await createClient();
 const {data,error}=await supabase.rpc('get_customer_estimate',{p_token:token});
 if(error||!data)return <main className="workspace"><h1>Estimate link unavailable</h1><p>This link may be expired or invalid. Contact Power Clean for a new link.</p></main>;
 const estimate=data as Approval;
 const {data:photoIndex}=await supabase.rpc("estimate_photo_index",{p_token:token});
 const areas=(photoIndex??[]) as {area:number;name:string;count:number}[];
 return <main className="workspace"><header className="workspace-header"><div><img src={POWER_CLEAN_LOGO} alt="Power Clean company logo" style={{display:"block",maxWidth:380,width:"100%",height:"auto",marginBottom:18}}/><span className="eyebrow">POWER CLEAN</span><h1>Estimate review</h1><p>Prepared for {estimate.customerName||'Customer'}</p></div></header>
 <section className="panel">{estimate.property&&<p><strong>Service address:</strong> {estimate.property}</p>}<h2>Services</h2><ul>{estimate.items.map((i,index)=><li key={index}>{i.description} — {i.mode==='area'?i.squareFeet+' sq ft × '+money(Number(i.rate||0)):'Fixed price'} — <strong>{money(i.mode==='area'?Number(i.squareFeet||0)*Number(i.rate||0):Number(i.fixedPrice||0))}</strong></li>)}</ul>
 <p>Subtotal: {money(estimate.subtotal)}</p><DiscountBreakdown details={estimate.discountDetails} total={estimate.discount}/><p>Tax ({estimate.taxRate}%): {money((estimate.subtotal-estimate.discount)*estimate.taxRate/100)}</p><h2>Total: {money(estimate.total)}</h2>{estimate.notes&&<p style={{whiteSpace:'pre-wrap'}}>{estimate.notes}</p>}</section>
 {areas.map(a=><section className="panel" key={a.area}><h2>{a.name}</h2>{Array.from({length:a.count},(_,i)=><img key={i} loading="lazy" src={"/estimates/approve/"+token+"/photo?area="+a.area+"&photo="+i} alt={a.name+" photo "+(i+1)} style={{width:200,maxWidth:"100%"}}/>)}</section>)}
 {estimate.response||!['draft','sent'].includes(estimate.status)?<section className="panel"><h2>Estimate status: {areas.map(a=><section className="panel" key={a.area}><h2>{a.name}</h2>{Array.from({length:a.count},(_,i)=><img key={i} loading="lazy" src={"/estimates/approve/"+token+"/photo?area="+a.area+"&photo="+i} alt={a.name+" photo "+(i+1)} style={{width:200,maxWidth:"100%"}}/>)}</section>)}
 {estimate.response||estimate.status}</h2><p>Contact Power Clean if you need changes.</p></section>:<Decision token={token}/>}
 <p className="muted">Estimate reference: {estimate.id}. Approval covers the displayed estimate only; separate service agreements and liability releases may be required.</p></main>;
}
