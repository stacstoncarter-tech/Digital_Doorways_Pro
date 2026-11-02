import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import JobEditor from './job-editor';
export default async function JobsPage(){
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)return <main className="workspace"><h1>Access pending</h1></main>;
 const {data:jobs,error}=await supabase.from('jobs').select('id,customer_id,estimate_id,service_address_id,status,scheduled_start,scheduled_end,completed_at,notes,created_at').eq('business_id',member.business_id).order('created_at',{ascending:false}).limit(200);
 const customerIds=[...new Set((jobs||[]).map(j=>j.customer_id))],propertyIds=[...new Set((jobs||[]).map(j=>j.service_address_id).filter((x):x is string=>!!x))];
 const [{data:customers},{data:properties}]=await Promise.all([
 customerIds.length?supabase.from('customers').select('id,name,phone').eq('business_id',member.business_id).in('id',customerIds):Promise.resolve({data:[]}),
 propertyIds.length?supabase.from('customer_addresses').select('id,address,label').eq('business_id',member.business_id).in('id',propertyIds):Promise.resolve({data:[]})
 ]);
 const names=new Map((customers||[]).map(c=>[c.id,c])),addresses=new Map((properties||[]).map(p=>[p.id,p]));
 const sorted=[...(jobs||[])].sort((a,b)=>{if(a.status==='completed'&&b.status!=='completed')return 1;if(b.status==='completed'&&a.status!=='completed')return -1;return (a.scheduled_start||'9999').localeCompare(b.scheduled_start||'9999')});
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / OPERATIONS</span><h1>Jobs & Scheduling</h1><p>Schedule accepted estimates and track field work.</p></div><Link href="/estimates/history">Saved estimates</Link></header>
 {error?<section className="panel"><p role="alert">Unable to load jobs.</p></section>:!sorted.length?<section className="panel"><h2>No jobs yet</h2><p>Accept an estimate, then select Create job in Saved Estimates.</p><Link href="/estimates/history">View estimates</Link></section>:sorted.map(j=><section className="panel" key={j.id}><div className="section-heading"><div><h2>{names.get(j.customer_id)?.name||'Customer'}</h2><p className="muted">Status: {j.status.replace('_',' ')} · {j.scheduled_start?new Date(j.scheduled_start).toLocaleString('en-US'):'Not scheduled'}</p></div><strong>{j.scheduled_end?'Until '+new Date(j.scheduled_end).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):''}</strong></div>
 {j.service_address_id&&addresses.get(j.service_address_id)&&<p>Property: {addresses.get(j.service_address_id)?.address}</p>}
 {names.get(j.customer_id)?.phone&&<p>Phone: {names.get(j.customer_id)?.phone}</p>}
 <p><Link href={'/customers/'+j.customer_id}>Customer profile</Link>{j.estimate_id&&<> · <Link href={'/estimates/view?id='+j.estimate_id}>Estimate</Link></>} · <Link href={'/agreements?customer='+j.customer_id}>Agreements</Link></p>
 <JobEditor job={j}/><small>Job ID: {j.id}</small></section>)}
 </main>;
}
