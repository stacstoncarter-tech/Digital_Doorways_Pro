import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
export default async function EstimateView({searchParams}:{searchParams:Promise<{id?:string}>}){
 const {id}=await searchParams;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)redirect('/customers');
 const {data:estimate}=await supabase.from('estimates').select('id,status,notes,discount,tax_rate,customers(name),estimate_items(id,description,pricing_mode,square_feet,rate,fixed_price)').eq('id',id||'00000000-0000-0000-0000-000000000000').eq('business_id',member.business_id).maybeSingle();
 if(!estimate)return <main className="workspace"><h1>Estimate not found</h1><Link href="/estimates/history">Back to estimates</Link></main>;
 const customer=estimate.customers as unknown as {name:string}|null;
 const items=estimate.estimate_items as {id:string;description:string;pricing_mode:string;square_feet:number|null;rate:number|null;fixed_price:number|null}[];
 const subtotal=items.reduce((sum,i)=>sum+(i.pricing_mode==='area'?Number(i.square_feet||0)*Number(i.rate||0):Number(i.fixed_price||0)),0);
 const discount=Math.min(subtotal,Number(estimate.discount||0));
 const total=(subtotal-discount)*(1+Number(estimate.tax_rate||0)/100);
 const usd=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
 return <main className="workspace"><header className="workspace-header"><div><h1>Power Clean Estimate</h1><p>{customer?.name||'Customer'} · {estimate.status}</p></div><Link href="/estimates/history">All estimates</Link></header><section className="panel"><h2>Services</h2><ul>{items.map(i=><li key={i.id}>{i.description} — {usd(i.pricing_mode==='area'?Number(i.square_feet||0)*Number(i.rate||0):Number(i.fixed_price||0))}</li>)}</ul><p>Subtotal: {usd(subtotal)}</p><p>Discount: {usd(discount)}</p><h2>Total: {usd(total)}</h2>{estimate.notes&&<p>{estimate.notes}</p>}<p className="muted">Reference: {estimate.id}</p><p>Use your browser Print command to print this estimate.</p></section></main>;
}
