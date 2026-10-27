import EstimateStatus from './estimate-status';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const currency=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
type EstimateItem={id:string;description:string;pricing_mode:string;square_feet:number|null;rate:number|null;fixed_price:number|null};
export default async function EstimateHistoryPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:membership}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(!membership)return <main className="workspace"><h1>Access pending</h1><p>No business membership was found.</p><Link href="/customers">Customers</Link></main>;
 const {data:estimates,error}=await supabase.from('estimates').select('id,created_at,status,notes,discount,tax_rate,customer_id,customers(name),estimate_items(id,description,pricing_mode,square_feet,rate,fixed_price)').eq('business_id',membership.business_id).order('created_at',{ascending:false}).limit(100);
 return <main className="workspace">
  <header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / OPERATIONS</span><h1>Saved estimates</h1><p className="muted">Your 100 most recent estimates</p></div><Link href="/estimates">New estimate</Link></header>
  {error?<section className="panel"><p role="alert">Could not load estimates. Please try again.</p></section>:
  !estimates?.length?<section className="panel"><h2>No saved estimates yet</h2><p>Create an estimate and save it to see it here.</p><Link href="/estimates">Create estimate</Link></section>:
  estimates.map(e=>{
   const items=(e.estimate_items||[]) as EstimateItem[];
   const subtotal=items.reduce((sum,item)=>sum+(item.pricing_mode==='area'?Number(item.square_feet||0)*Number(item.rate||0):Number(item.fixed_price||0)),0);
   const discount=Math.min(subtotal,Number(e.discount||0));
   const total=(subtotal-discount)*(1+Number(e.tax_rate||0)/100);
   const customer=e.customers as unknown as {name:string}|null;
   return <section className="panel" key={e.id}><div className="section-heading"><div><h2>{customer?.name||'Customer'}</h2><p className="muted">{new Date(e.created_at).toLocaleDateString('en-US')} · {e.status} · {items.length} service(s)</p></div><strong>{currency(total)}</strong></div>
    <ul>{items.map(item=><li key={item.id}>{item.description}: {currency(item.pricing_mode==='area'?Number(item.square_feet||0)*Number(item.rate||0):Number(item.fixed_price||0))}</li>)}</ul>
    {e.notes&&<p className="muted">{e.notes}</p>}
    <EstimateStatus id={e.id} initial={e.status}/><p><Link href={`/estimates/view?id=${e.id}`}>Open estimate</Link></p><small>Estimate ID: {e.id}</small>
   </section>;
  })}
 </main>;
}
