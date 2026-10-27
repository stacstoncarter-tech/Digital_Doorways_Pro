import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import AgreementForm from './agreement-form';
export default async function AgreementsPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)return <main className="workspace"><h1>Business access pending</h1></main>;
 const [{data:customers},{data:agreements}]=await Promise.all([
 supabase.from('customers').select('id,name').eq('business_id',member.business_id).order('name').limit(500),
 supabase.from('customer_agreements').select('id,title,document_type,status,created_at,customers(name)').eq('business_id',member.business_id).order('created_at',{ascending:false}).limit(100)
 ]);
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / OPERATIONS</span><h1>Customer Agreements</h1><p className="muted">Service contracts and liability releases</p></div><Link href="/customers">Customers</Link></header>
 <AgreementForm customers={customers||[]}/>
 <section className="panel"><h2>Saved agreements</h2>{!agreements?.length?<p>No agreements created yet.</p>:<ul>{agreements.map(a=><li key={a.id}><strong>{a.title}</strong> — {(a.customers as unknown as {name:string}|null)?.name||'Customer'} — {a.status} — {new Date(a.created_at).toLocaleDateString('en-US')}</li>)}</ul>}</section>
 </main>;
}
