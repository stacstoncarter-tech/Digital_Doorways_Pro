import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {NewLead,EditLead} from './forms';
const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
export default async function LeadsPage(){
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();if(!member)return <main className="workspace"><h1>Access pending</h1></main>;
 const {data:leads,error}=await supabase.from('sales_leads').select('id,name,email,phone,service_address,source,status,estimated_value,notes,follow_up_at,created_at').eq('business_id',member.business_id).order('created_at',{ascending:false}).limit(500);
 const open=(leads||[]).filter(l=>!['won','lost'].includes(l.status));
 const due=open.filter(l=>l.follow_up_at&&new Date(l.follow_up_at)<=new Date());
 const pipeline=open.reduce((s,l)=>s+Number(l.estimated_value||0),0);
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / SALES</span><h1>Leads & Follow-ups</h1><p>Open leads: <strong>{open.length}</strong> · Due follow-ups: <strong>{due.length}</strong> · Pipeline: <strong>{money(pipeline)}</strong></p></div><Link href="/dashboard">Dashboard</Link></header>
 <section className="panel"><NewLead/></section>
 {error?<section className="panel"><p role="alert">Unable to load leads.</p></section>:!leads?.length?<section className="panel"><p>No leads recorded yet.</p></section>:
 [...leads].sort((a,b)=>{const da=a.follow_up_at?new Date(a.follow_up_at).getTime():Infinity,db=b.follow_up_at?new Date(b.follow_up_at).getTime():Infinity;return da-db;}).map(l=><section className="panel" key={l.id}><div className="section-heading"><div><h2>{l.name}</h2><p>{l.status.replaceAll('_',' ')} · {l.source.replaceAll('_',' ')} · {l.phone||l.email||'No contact details'}</p></div><strong>{l.estimated_value!==null?money(Number(l.estimated_value)):''}</strong></div>
 {l.service_address&&<p>Service address: {l.service_address}</p>}{l.follow_up_at&&<p>Follow up: {new Date(l.follow_up_at).toLocaleString('en-US')}{new Date(l.follow_up_at)<new Date()&&!['won','lost'].includes(l.status)?' · OVERDUE':''}</p>}
 <EditLead lead={l}/></section>)}
 </main>;
}
