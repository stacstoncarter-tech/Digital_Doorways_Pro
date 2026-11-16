import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CustomerForm from './customer-form';
import CustomerSearch from './customer-search';
import SignOut from './sign-out';
export default async function CustomersPage({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}) {
  const params=await searchParams;
  const q=(params.q||'').trim().slice(0,100);
  const page=Math.max(1,Math.min(10000,Number.parseInt(params.page||'1',10)||1));
  const pageSize=25;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  const { data: membership, error: memberError } = await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
  if (memberError) return <main className="workspace"><h1>Workspace unavailable</h1><p role="alert">Could not verify your business access. Please try again.</p><SignOut/></main>;
  if (!membership) return <main className="workspace"><h1>Access pending</h1><p>Your account has not been assigned to a Power Clean business. Contact the administrator.</p><SignOut/></main>;
  let query=supabase.from('customers').select('id,name,email,phone,service_address',{count:'exact'}).eq('business_id',membership.business_id);
  if(q){
    const safe=q.replace(/[%_,().]/g,' ').trim();
    if(safe){
      const {data:matchedProperties}=await supabase.from('customer_addresses').select('customer_id').eq('business_id',membership.business_id).ilike('address','%'+safe+'%').limit(500);
      const ids=[...new Set((matchedProperties||[]).map(p=>p.customer_id))].filter(id=>/^[0-9a-f-]{36}$/i.test(id));
      const clauses=['name.ilike.%'+safe+'%','email.ilike.%'+safe+'%','phone.ilike.%'+safe+'%','service_address.ilike.%'+safe+'%'];
      if(ids.length)clauses.push('id.in.('+ids.join(',')+')');
      query=query.or(clauses.join(','));
    }
  }
  const {data:customers,error,count}=await query.order('created_at',{ascending:false}).range((page-1)*pageSize,page*pageSize-1);
  const totalPages=Math.max(1,Math.ceil((count||0)/pageSize));
  return <main className="workspace">
    <header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / OPERATIONS</span><h1>Customers</h1><p className="muted">Secure customer directory · {membership.role}</p></div><SignOut/></header>
    <section className="panel"><h2>Agreements</h2><p className="muted">Create service contracts, liability releases, and signing links.</p><Link href="/agreements">Open Customer Agreements</Link></section>
    <section className="panel"><h2>Estimates</h2><p className="muted">Build a quote with square-foot or fixed pricing.</p><Link href="/estimates">Open Estimate Builder</Link></section>
    <section className="panel"><h2>Add customer</h2><p className="muted">New records are stored in your Power Clean database.</p>
      {['owner','admin','staff'].includes(membership.role) ? <CustomerForm/> : <p>You have read-only access.</p>}
    </section>
    <section className="panel"><div className="section-heading"><div><h2>Customer records</h2><p className="muted">Search all customers, including additional service properties</p></div><strong>{count??0} customers</strong></div>
      {error ? <p role="alert">Unable to load customer records. Please try again.</p> : <><CustomerSearch customers={customers??[]} initialQuery={q}/><nav aria-label="Customer pages" style={{display:'flex',gap:16,marginTop:18}}>{page>1&&<Link href={'/customers?'+new URLSearchParams({q,page:String(page-1)})}>Previous</Link>}<span>Page {page} of {totalPages}</span>{page<totalPages&&<Link href={'/customers?'+new URLSearchParams({q,page:String(page+1)})}>Next</Link>}</nav></>}
    </section>
    <footer className="footer">Power Clean · Secure CRM foundation · Estimates, jobs, contracts and invoices are in development</footer>
  </main>;
}
