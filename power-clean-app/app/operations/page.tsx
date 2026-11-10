import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {POWER_CLEAN_LOGO} from '@/lib/branding';

export default async function OperationsPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)return <main className="workspace"><h1>Access pending</h1></main>;
 const bid=member.business_id;
 const [leads,estimates,jobs,invoices,agreements]=await Promise.all([
  supabase.from('sales_leads').select('id,status,name,follow_up_at').is('deleted_at',null).eq('business_id',bid).limit(500),
  supabase.from('estimates').select('id,status,customer_id,customers(name)').is('deleted_at',null).eq('business_id',bid).limit(500),
  supabase.from('jobs').select('id,status,customer_id,estimate_id,scheduled_start').is('deleted_at',null).eq('business_id',bid).limit(500),
  supabase.from('invoices').select('id,status,job_id,total,invoice_payments(amount)').is('deleted_at',null).eq('business_id',bid).limit(500),
  supabase.from('customer_agreements').select('id,customer_id,status,document_type').is('deleted_at',null).eq('business_id',bid).limit(500)
 ]);
 const errors=[leads,estimates,jobs,invoices,agreements].filter(r=>r.error).length;
 const j=jobs.data||[], e=estimates.data||[], i=invoices.data||[], a=agreements.data||[],l=leads.data||[];
 const jobEstimateIds=new Set(j.map(x=>x.estimate_id));
 const invoiceJobIds=new Set(i.map(x=>x.job_id));
 const signed=new Set(a.filter(x=>x.status==='signed').map(x=>x.customer_id+':'+x.document_type));
 const accepted=e.filter(x=>x.status==='accepted'&&!jobEstimateIds.has(x.id));
 const missingDocs=j.filter(x=>['unscheduled','scheduled','in_progress'].includes(x.status)&&(!signed.has(x.customer_id+':service_contract')||!signed.has(x.customer_id+':liability_release')));
 const billable=j.filter(x=>x.status==='completed'&&!invoiceJobIds.has(x.id));
 const outstanding=i.filter(x=>x.status!=='void').reduce((s,x)=>s+Math.max(0,Number(x.total||0)-(x.invoice_payments||[]).reduce((p,y)=>p+Number(y.amount||0),0)),0);
 const overdue=l.filter(x=>x.follow_up_at&&new Date(x.follow_up_at).getTime()<Date.now()&&!['won','lost'].includes(x.status));
 return <main className="workspace">
 <header className="workspace-header"><div><img src={POWER_CLEAN_LOGO} alt="Power Clean" style={{maxWidth:280,width:'100%',height:'auto'}}/><h1>Operations Command Center</h1><p>Phase 10: customer workflow, financial readiness and launch checks</p></div><Link href="/dashboard">Dashboard</Link></header>
 {errors>0&&<section className="panel"><p role="alert">Some operational data could not load. Counts may be incomplete. Refresh or contact your administrator.</p></section>}
 <section className="panel"><h2>Work requiring attention</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16}}>
 <div><strong>{overdue.length}</strong><p>Overdue lead follow-ups</p><Link href="/leads">Review leads</Link></div>
 <div><strong>{accepted.length}</strong><p>Accepted estimates without jobs</p><Link href="/estimates/history">Create jobs</Link></div>
 <div><strong>{missingDocs.length}</strong><p>Active jobs with missing signed documents</p><Link href="/agreements">Review agreements</Link></div>
 <div><strong>{billable.length}</strong><p>Completed jobs without invoices</p><Link href="/jobs">Create invoices</Link></div>
 </div></section>
 <section className="panel"><h2>Billing overview</h2><p><strong>{outstanding.toLocaleString('en-US',{style:'currency',currency:'USD'})}</strong> outstanding across loaded invoices. Payments entered in the app are records, not bank settlement confirmations.</p><Link href="/invoices">Invoices & payments</Link></section>
 <section className="panel"><h2>Customer journey</h2><ol><li><Link href="/leads">Capture and follow up on leads</Link></li><li><Link href="/estimates">Build and share estimate</Link></li><li><Link href="/estimates/history">Customer accepts estimate, then create job</Link></li><li><Link href="/agreements">Obtain service contract and liability release signatures</Link></li><li><Link href="/jobs">Schedule and complete field work</Link></li><li><Link href="/invoices">Invoice completed job and record payments</Link></li></ol><p className="muted">Customer notifications are not automatically sent from this command center. Share approval and signing links using the existing controls.</p></section>
 <section className="panel"><h2>Launch verification checklist</h2><ul><li>Verify a real customer can review and accept an estimate</li><li>Verify both signing links and signature audit records</li><li>Confirm signed documents before performing work</li><li>Test job scheduling and mobile field photo uploads</li><li>Test completed job to invoice conversion and payment recording</li><li>Verify team roles, database permissions and business isolation</li><li>Confirm email and SMS delivery separately before enabling automatic messages</li><li>Verify print layouts and reconcile financial reports with source records</li></ul><p className="muted">This is an operational checklist, not a claim that the listed tests have passed.</p></section>
 </main>;
}
