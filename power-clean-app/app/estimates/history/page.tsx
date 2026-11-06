import ServiceControls from './service-controls';
import ServiceEditor from './service-editor';
import DraftEditor from './draft-editor';
import EstimateStatus from './estimate-status';
import EstimateApprovalLink from './approval-link';
import CreateJobButton from './create-job-button';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const currency=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
type EstimateItem={id:string;description:string;pricing_mode:string;square_feet:number|null;rate:number|null;fixed_price:number|null};
export default async function EstimateHistoryPage({searchParams}:{searchParams:Promise<{status?:string;q?:string}>}){
 const params=await searchParams;
 const selectedStatus=['all','draft','sent','accepted','declined'].includes(params.status||'')?params.status||'all':'all';
 const query=(params.q||'').trim().slice(0,100).toLowerCase();
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:membership}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(!membership)return <main className="workspace"><h1>Access pending</h1><p>No business membership was found.</p><Link href="/customers">Customers</Link></main>;
 const {data:estimates,error}=await supabase.from('estimates').select('id,created_at,status,notes,discount,tax_rate,customer_id,service_address_id,customers(name),estimate_items(id,description,pricing_mode,square_feet,rate,fixed_price)').eq('business_id',membership.business_id).order('created_at',{ascending:false}).limit(100);
 const filtered=(estimates||[]).filter(e=>(selectedStatus==='all'||e.status===selectedStatus)&&(!query||((e.customers as unknown as {name:string}|null)?.name||'').toLowerCase().includes(query)||e.id.toLowerCase().includes(query)));
 const propertyIds=[...new Set((estimates||[]).map(e=>e.service_address_id).filter((id):id is string=>!!id))];
 const {data:properties}=propertyIds.length?await supabase.from('customer_addresses').select('id,label,address').eq('business_id',membership.business_id).in('id',propertyIds):{data:[]};
 const propertyMap=new Map((properties||[]).map(p=>[p.id,p]));
 return <main className="workspace">
  <header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / OPERATIONS</span><h1>Saved estimates</h1><p className="muted">Your 100 most recent estimates</p></div><div><Link href="/estimates">New estimate</Link> · <Link href="/jobs">Jobs & Scheduling</Link></div></header>
  <section className="panel"><h2>Find estimates</h2><form method="get" style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'end'}}><label>Customer or estimate ID<input name="q" defaultValue={params.q||''} maxLength={100} placeholder="Search saved estimates"/></label><label>Status<select name="status" defaultValue={selectedStatus}>{['all','draft','sent','accepted','declined'].map(s=><option key={s} value={s}>{s==='all'?'All statuses':s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></label><button type="submit">Filter</button><Link href="/estimates/history">Clear</Link></form><p className="muted">Showing {filtered.length} of {(estimates||[]).length} recent estimates.</p></section>
  {error?<section className="panel"><p role="alert">Could not load estimates. Please try again.</p></section>:
  !estimates?.length?<section className="panel"><h2>No saved estimates yet</h2><p>Create an estimate and save it to see it here.</p><Link href="/estimates">Create estimate</Link></section>:
  filtered.length===0?<section className="panel"><p>No estimates match these filters.</p></section>:
  filtered.map(e=>{
   const items=(e.estimate_items||[]) as EstimateItem[];
   const subtotal=items.reduce((sum,item)=>sum+(item.pricing_mode==='area'?Number(item.square_feet||0)*Number(item.rate||0):Number(item.fixed_price||0)),0);
   const discount=Math.min(subtotal,Number(e.discount||0));
   const total=(subtotal-discount)*(1+Number(e.tax_rate||0)/100);
   const customer=e.customers as unknown as {name:string}|null;
   return <section className="panel" key={e.id}><div className="section-heading"><div><h2>{customer?.name||'Customer'}</h2><p className="muted">{new Date(e.created_at).toLocaleDateString('en-US')} · {e.status} · {items.length} service(s)</p></div><strong>{currency(total)}</strong></div>
    {e.service_address_id&&propertyMap.get(e.service_address_id)&&<p className="muted">Property: {propertyMap.get(e.service_address_id)?.label} — {propertyMap.get(e.service_address_id)?.address}</p>}
    <ul>{items.map(item=><li key={item.id}>{item.description}: {currency(item.pricing_mode==='area'?Number(item.square_feet||0)*Number(item.rate||0):Number(item.fixed_price||0))}</li>)}</ul>
    {e.status==='draft'&&<><ServiceControls estimateId={e.id}/>{items.map(item=><div key={item.id}><ServiceEditor estimateId={e.id} item={item}/><ServiceControls estimateId={e.id} itemId={item.id}/></div>)}</>}{e.notes&&<p className="muted">{e.notes}</p>}
    <EstimateStatus id={e.id} initial={e.status}/>{['draft','sent'].includes(e.status)&&<EstimateApprovalLink id={e.id}/>}{e.status==='accepted'&&<CreateJobButton estimateId={e.id}/>}{e.status==='draft'&&<DraftEditor id={e.id} notes={e.notes||''} discount={Number(e.discount||0)} taxRate={Number(e.tax_rate||0)}/>} <p><Link href={`/estimates/view?id=${e.id}`}>Open estimate</Link></p><small>Estimate ID: {e.id}</small>
   </section>;
  })}
 </main>;
}
