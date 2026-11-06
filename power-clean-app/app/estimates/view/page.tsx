import Link from 'next/link';
import {POWER_CLEAN_LOGO} from '@/lib/branding';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
export default async function EstimateView({searchParams}:{searchParams:Promise<{id?:string}>}){
 const {id}=await searchParams;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)redirect('/customers');
 const {data:estimate}=await supabase.from('estimates').select('id,status,notes,discount,tax_rate,service_address_id,customers(name),estimate_items(id,description,pricing_mode,square_feet,rate,fixed_price,length_ft,width_ft,show_dimensions_customer)').eq('id',id||'00000000-0000-0000-0000-000000000000').eq('business_id',member.business_id).maybeSingle();
 if(!estimate)return <main className="workspace"><h1>Estimate not found</h1><Link href="/estimates/history">Back to estimates</Link></main>;
 const {data:property}=estimate.service_address_id?await supabase.from('customer_addresses').select('label,address').eq('id',estimate.service_address_id).eq('business_id',member.business_id).maybeSingle():{data:null};
 const customer=estimate.customers as unknown as {name:string}|null;
 const items=estimate.estimate_items as {id:string;description:string;pricing_mode:string;square_feet:number|null;rate:number|null;fixed_price:number|null;length_ft:number|null;width_ft:number|null;show_dimensions_customer:boolean}[];
 const subtotal=items.reduce((sum,i)=>sum+(i.pricing_mode==='area'?Number(i.square_feet||0)*Number(i.rate||0):Number(i.fixed_price||0)),0);
 const discount=Math.min(subtotal,Number(estimate.discount||0));
 const total=(subtotal-discount)*(1+Number(estimate.tax_rate||0)/100);
 const usd=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
 return <main className="workspace"><header className="workspace-header"><div><img src={POWER_CLEAN_LOGO} alt="Power Clean company logo" style={{display:"block",maxWidth:360,width:"100%",height:"auto",marginBottom:16}}/><h1>Power Clean Estimate</h1><p>{customer?.name||'Customer'} · {estimate.status}</p></div><Link href="/estimates/history">All estimates</Link></header><section className="panel"><div style={{borderBottom:"3px solid #0871bd",paddingBottom:12,marginBottom:20}}><img src={POWER_CLEAN_LOGO} alt="Power Clean" style={{display:"block",maxWidth:370,width:"100%",height:"auto"}}/></div><h2>Services</h2>{property&&<p><strong>Service property:</strong> {property.label} — {property.address}</p>}<ul>{items.map(i=><li key={i.id}>{i.description} — {usd(i.pricing_mode==='area'?Number(i.square_feet||0)*Number(i.rate||0):Number(i.fixed_price||0))}{i.show_dimensions_customer&&i.length_ft!=null&&i.width_ft!=null&&<span> — {Number(i.length_ft)} ft × {Number(i.width_ft)} ft ({Number(i.square_feet||0)} sq ft)</span>}</li>)}</ul><p>Subtotal: {usd(subtotal)}</p><p>Discount: {usd(discount)}</p><h2>Total: {usd(total)}</h2>{estimate.notes&&<p>{estimate.notes}</p>}<p className="muted">Reference: {estimate.id}</p><p>Use your browser Print command to print this estimate.</p></section></main>;
}
