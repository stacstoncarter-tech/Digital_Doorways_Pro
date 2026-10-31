import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import CustomerEditors from './customer-editors';
export default async function CustomerDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)return <main className="workspace"><h1>Business access pending</h1></main>;
 const {data:customer}=await supabase.from('customers').select('id,name,email,phone,service_address,created_at').eq('id',id).eq('business_id',member.business_id).maybeSingle();
 if(!customer)notFound();
 const [addressesResult,notesResult,agreementsResult,estimatesResult]=await Promise.all([
 supabase.from('customer_addresses').select('id,label,address,is_primary,created_at').eq('customer_id',id).eq('business_id',member.business_id).order('created_at'),
 supabase.from('customer_notes').select('id,body,created_at').eq('customer_id',id).eq('business_id',member.business_id).order('created_at',{ascending:false}).limit(100),
 supabase.from('customer_agreements').select('id,title,status,created_at').eq('customer_id',id).eq('business_id',member.business_id).order('created_at',{ascending:false}).limit(100),
 supabase.from('estimates').select('id,status,created_at').eq('customer_id',id).eq('business_id',member.business_id).order('created_at',{ascending:false}).limit(100)
 ]);
 const history=[
 ...(agreementsResult.data||[]).map(a=>({id:a.id,title:a.title,status:a.status,date:a.created_at,href:'/agreements/view?id='+encodeURIComponent(a.id)})),
 ...(estimatesResult.data||[]).map(e=>({id:e.id,title:'Estimate',status:e.status,date:e.created_at,href:'/estimates'}))
 ].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
 return <main className="workspace">
 <header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / CUSTOMERS</span><h1>{customer.name}</h1><p className="muted">Customer since {new Date(customer.created_at).toLocaleDateString('en-US')}</p></div><Link href="/customers">All customers</Link></header>
 <section className="panel"><h2>Customer details</h2><p>Email: {customer.email||'Not provided'}</p><p>Phone: {customer.phone||'Not provided'}</p><p>Original service address: {customer.service_address||'Not provided'}</p><Link href={'/agreements?customer='+encodeURIComponent(id)}>Create agreement</Link></section>
 <CustomerEditors customerId={id} canEdit={['owner','admin','staff'].includes(member.role)}/>
 <section className="panel"><h2>Service properties</h2>{addressesResult.error?<p role="alert">Could not load properties.</p>:(addressesResult.data||[]).length?<ul>{(addressesResult.data||[]).map(a=><li key={a.id}><strong>{a.label}</strong>{a.is_primary?' (Original)':''} — {a.address}</li>)}</ul>:<p>No service properties saved yet.</p>}</section>
 <section className="panel"><h2>Customer notes</h2>{notesResult.error?<p role="alert">Could not load notes.</p>:(notesResult.data||[]).length?<ul>{(notesResult.data||[]).map(n=><li key={n.id}><small>{new Date(n.created_at).toLocaleString('en-US')}</small><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{n.body}</p></li>)}</ul>:<p>No notes yet.</p>}</section>
 <section className="panel"><h2>Customer history</h2>{agreementsResult.error||estimatesResult.error?<p role="alert">Could not load complete customer history.</p>:history.length?<ul>{history.map(h=><li key={h.id}><Link href={h.href}>{h.title}</Link> — {h.status} — {new Date(h.date).toLocaleDateString('en-US')}</li>)}</ul>:<p>No agreements or estimates yet.</p>}</section>
 </main>;
}
