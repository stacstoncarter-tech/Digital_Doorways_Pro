import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CustomerForm from './customer-form';
import CustomerSearch from './customer-search';
import SignOut from './sign-out';
export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  const { data: membership, error: memberError } = await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
  if (memberError) return <main className="workspace"><h1>Workspace unavailable</h1><p role="alert">Could not verify your business access. Please try again.</p><SignOut/></main>;
  if (!membership) return <main className="workspace"><h1>Access pending</h1><p>Your account has not been assigned to a Power Clean business. Contact the administrator.</p><SignOut/></main>;
  const { data: customers, error } = await supabase.from('customers').select('id,name,email,phone,service_address').eq('business_id',membership.business_id).order('created_at',{ascending:false}).limit(100);
  return <main className="workspace">
    <header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / OPERATIONS</span><h1>Customers</h1><p className="muted">Secure customer directory · {membership.role}</p></div><SignOut/></header>
    <section className="panel"><h2>Estimates</h2><p className="muted">Build a quote with square-foot or fixed pricing.</p><Link href="/estimates">Open Estimate Builder</Link></section>
    <section className="panel"><h2>Add customer</h2><p className="muted">New records are stored in your Power Clean database.</p>
      {['owner','admin','staff'].includes(membership.role) ? <CustomerForm/> : <p>You have read-only access.</p>}
    </section>
    <section className="panel"><div className="section-heading"><div><h2>Customer records</h2><p className="muted">Your 100 most recently added customers</p></div><strong>{customers?.length??0} shown</strong></div>
      {error ? <p role="alert">Unable to load customer records. Please try again.</p> : <CustomerSearch customers={customers??[]}/>}
    </section>
    <footer className="footer">Power Clean · Secure CRM foundation · Estimates, jobs, contracts and invoices are in development</footer>
  </main>;
}
