import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CustomerForm from './customer-form';
export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: membership } = await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
  if (!membership) return <main style={{padding:32}}><h1>Access pending</h1><p>Your account has not been assigned to a Power Clean business. Contact the administrator.</p></main>;
  const { data: customers, error } = await supabase.from('customers').select('id,name,email,phone,service_address').eq('business_id',membership.business_id).order('created_at',{ascending:false}).limit(100);
  return <main style={{padding:'30px',maxWidth:1100,margin:'auto'}}><a href="/">← Dashboard</a><h1>Customers</h1><p>Secure customer directory · {membership.role}</p>
    {['owner','admin','staff'].includes(membership.role) && <section className="panel"><h2>Add customer</h2><CustomerForm/></section>}
    <section className="panel"><h2>Customer records</h2>{error?<p role="alert">Unable to load customer records.</p>:!customers?.length?<p>No customers yet.</p>:<div className="customer-list">{customers.map(c=><div className="customer" key={c.id}><div><strong>{c.name}</strong><small>{c.service_address||'No address'}</small></div><div className="contact"><span>{c.email||'No email'}</span><small>{c.phone||'No phone'}</small></div></div>)}</div>}</section>
  </main>;
}
