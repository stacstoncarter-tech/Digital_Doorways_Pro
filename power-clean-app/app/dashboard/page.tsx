import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
const money=(n:number)=>Number(n).toLocaleString('en-US',{style:'currency',currency:'USD'});
export default async function Dashboard(){
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)return <main className="workspace"><h1>Access pending</h1></main>;
 const business=member.business_id;
 const [{count:customers},{data:jobs},{data:invoices},{data:estimates}]=await Promise.all([
 supabase.from('customers').select('id',{count:'exact',head:true}).eq('business_id',business),
 supabase.from('jobs').select('id,status,scheduled_start,customer_id').eq('business_id',business).limit(1000),
 supabase.from('invoices').select('id,status,total,invoice_payments(amount)').eq('business_id',business).limit(1000),
 supabase.from('estimates').select('id,status').eq('business_id',business).limit(1000)
 ]);
 const active=(jobs||[]).filter(j=>['scheduled','in_progress'].includes(j.status));
 const today=new Date(),upcoming=active.filter(j=>j.scheduled_start&&new Date(j.scheduled_start)>=today).sort((a,b)=>String(a.scheduled_start).localeCompare(String(b.scheduled_start))).slice(0,8);
 const unpaid=(invoices||[]).filter(i=>i.status!=='void').reduce((s,i)=>s+Math.max(0,Number(i.total)-(i.invoice_payments||[]).reduce((t,p)=>t+Number(p.amount),0)),0);
 const received=(invoices||[]).reduce((s,i)=>s+(i.invoice_payments||[]).reduce((t,p)=>t+Number(p.amount),0),0);
 const accepted=(estimates||[]).filter(e=>e.status==='accepted').length;
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / OPERATIONS</span><h1>Business Dashboard</h1><p>Customers, scheduling, estimates and finances in one place.</p></div><Link href="/customers">Customers</Link></header>
 <section className="panel"><h2>Business snapshot</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:18}}>
 <div><strong style={{fontSize:28}}>{customers||0}</strong><p>Customers</p></div><div><strong style={{fontSize:28}}>{active.length}</strong><p>Active jobs</p></div><div><strong style={{fontSize:28}}>{accepted}</strong><p>Accepted estimates</p></div><div><strong style={{fontSize:28}}>{money(unpaid)}</strong><p>Outstanding invoices</p></div><div><strong style={{fontSize:28}}>{money(received)}</strong><p>Payments recorded</p></div></div></section>
 <section className="panel"><h2>Quick access</h2><div style={{display:'flex',flexWrap:'wrap',gap:16}}><Link href="/customers">Customers</Link><Link href="/estimates">New estimate</Link><Link href="/estimates/history">Saved estimates</Link><Link href="/jobs">Jobs & Scheduling</Link><Link href="/invoices">Invoices & Payments</Link><Link href="/agreements">Agreements</Link><Link href="/equipment">Equipment</Link><Link href="/expenses">Expenses</Link><Link href="/leads">Leads & Follow-ups</Link><Link href="/reports">Business Reports</Link></div></section>
 <section className="panel"><h2>Upcoming scheduled jobs</h2>{upcoming.length?<ul>{upcoming.map(j=><li key={j.id}>{new Date(j.scheduled_start!).toLocaleString('en-US')} · {j.status.replace('_',' ')} · <Link href="/jobs">Open job</Link></li>)}</ul>:<p>No upcoming scheduled jobs.</p>}</section>
 <p className="muted">Snapshot covers up to 1,000 records per operational category. Recorded payments are not bank-verified deposits.</p>
 </main>;
}
