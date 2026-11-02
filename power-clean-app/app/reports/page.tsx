import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
export default async function ReportsPage({searchParams}:{searchParams:Promise<{from?:string;to?:string}>}){
 const query=await searchParams;
 const today=new Date(),year=today.getFullYear(),month=String(today.getMonth()+1).padStart(2,'0');
 const from=/^\d{4}-\d{2}-\d{2}$/.test(query.from||'')?query.from!:year+'-'+month+'-01';
 const to=/^\d{4}-\d{2}-\d{2}$/.test(query.to||'')?query.to!:today.toISOString().slice(0,10);
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();if(!member)return <main className="workspace"><h1>Access pending</h1></main>;
 const business=member.business_id;
 const [{data:payments,payError},{data:expenses,expenseError},{data:jobs,jobError},{data:leads,leadError},{data:invoices,invoiceError}]=await Promise.all([
 supabase.from('invoice_payments').select('amount,received_at').eq('business_id',business).gte('received_at',from+'T00:00:00').lt('received_at',to+'T23:59:59.999').limit(1000),
 supabase.from('business_expenses').select('amount,category,incurred_at').eq('business_id',business).gte('incurred_at',from).lte('incurred_at',to).limit(1000),
 supabase.from('jobs').select('status,completed_at,created_at').eq('business_id',business).limit(1000),
 supabase.from('sales_leads').select('status,source,created_at').eq('business_id',business).gte('created_at',from+'T00:00:00').lt('created_at',to+'T23:59:59.999').limit(1000),
 supabase.from('invoices').select('total,status,created_at').eq('business_id',business).limit(1000)
 ]);
 const received=(payments||[]).reduce((s,p)=>s+Number(p.amount),0),spent=(expenses||[]).reduce((s,e)=>s+Number(e.amount),0);
 const completed=(jobs||[]).filter(j=>j.status==='completed'&&j.completed_at&&j.completed_at.slice(0,10)>=from&&j.completed_at.slice(0,10)<=to).length;
 const issued=(invoices||[]).filter(i=>i.status!=='void'&&i.created_at.slice(0,10)>=from&&i.created_at.slice(0,10)<=to).reduce((s,i)=>s+Number(i.total),0);
 const categories=Object.entries((expenses||[]).reduce<Record<string,number>>((a,e)=>{a[e.category]=(a[e.category]||0)+Number(e.amount);return a;},{})).sort((a,b)=>b[1]-a[1]);
 const sources=Object.entries((leads||[]).reduce<Record<string,number>>((a,l)=>{a[l.source]=(a[l.source]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]);
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / ANALYTICS</span><h1>Business Reports</h1><p>Cash receipts, operating expenses, and sales activity.</p></div><Link href="/dashboard">Dashboard</Link></header>
 <section className="panel"><form method="get" style={{display:'flex',flexWrap:'wrap',alignItems:'end',gap:12}}><label>From<input name="from" type="date" defaultValue={from} required/></label><label>Through<input name="to" type="date" defaultValue={to} required/></label><button>Update report</button></form></section>
 {(payError||expenseError||jobError||leadError||invoiceError)&&<section className="panel"><p role="alert">Some report data could not be loaded; totals may be incomplete.</p></section>}
 <section className="panel"><h2>Financial overview</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:18}}>
 <div><strong style={{fontSize:27}}>{money(received)}</strong><p>Payments recorded</p></div>
 <div><strong style={{fontSize:27}}>{money(spent)}</strong><p>Expenses recorded</p></div>
 <div><strong style={{fontSize:27}}>{money(received-spent)}</strong><p>Cash movement (before other costs)</p></div>
 <div><strong style={{fontSize:27}}>{money(issued)}</strong><p>Invoiced in period</p></div>
 <div><strong style={{fontSize:27}}>{completed}</strong><p>Jobs completed</p></div>
 <div><strong style={{fontSize:27}}>{(leads||[]).length}</strong><p>New leads</p></div>
 </div></section>
 <section className="panel"><h2>Expenses by category</h2>{categories.length?<ul>{categories.map(([c,n])=><li key={c}>{c}: {money(n)}</li>)}</ul>:<p>No expenses recorded in this period.</p>}</section>
 <section className="panel"><h2>Lead sources</h2>{sources.length?<ul>{sources.map(([c,n])=><li key={c}>{c.replaceAll('_',' ')}: {n}</li>)}</ul>:<p>No leads recorded in this period.</p>}</section>
 <p className="muted">Reports use up to 1,000 rows per category, and the reporting window uses UTC date boundaries. Figures are operational estimates, not audited financial statements or tax reports. Payments recorded here may not be settled by a payment processor.</p></main>;
}
