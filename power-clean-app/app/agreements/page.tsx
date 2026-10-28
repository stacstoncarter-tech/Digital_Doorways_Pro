import SigningLink from './signing-link';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import AgreementForm from './agreement-form';
export default async function AgreementsPage({searchParams}:{searchParams:Promise<{customer?:string;status?:string}>}){
 const {customer:requestedCustomer,status:requestedStatus}=await searchParams;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)return <main className="workspace"><h1>Business access pending</h1></main>;
 const [{data:customers,error:customerError},{data:agreements}]=await Promise.all([
 supabase.from('customers').select('id,name').eq('business_id',member.business_id).order('name').limit(500),
 supabase.from('customer_agreements').select('id,title,document_type,status,created_at,signing_expires_at,customers(name,email,phone)').eq('business_id',member.business_id).order('created_at',{ascending:false}).limit(100)
 ]);
 const counts={all:(agreements||[]).length,draft:(agreements||[]).filter(a=>a.status==='draft').length,sent:(agreements||[]).filter(a=>a.status==='sent').length,signed:(agreements||[]).filter(a=>a.status==='signed').length,void:(agreements||[]).filter(a=>a.status==='void').length};
 const selectedStatus=['draft','sent','signed','void'].includes(requestedStatus||'')?requestedStatus:'all';
 const visibleAgreements=(agreements||[]).filter(a=>selectedStatus==='all'||a.status===selectedStatus);
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / OPERATIONS</span><h1>Customer Agreements</h1><p className="muted">Service contracts and liability releases</p></div><Link href="/customers">Customers</Link></header>
 {customerError&&<p role="alert">Customer list could not load: {customerError.message}</p>}
 <AgreementForm customers={customers||[]} initialCustomerId={(customers||[]).some(c=>c.id===requestedCustomer)?requestedCustomer:''}/>
 <section className="panel"><h2>Saved agreements</h2><nav aria-label="Agreement status filters" style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:16}}>{(['all','draft','sent','signed','void'] as const).map(s=><Link key={s} href={`/agreements?status=${s}`} aria-current={selectedStatus===s?'page':undefined} style={{fontWeight:selectedStatus===s?700:400}}>{s==='sent'?'Awaiting signature':s.charAt(0).toUpperCase()+s.slice(1)} ({counts[s]})</Link>)}</nav>{!visibleAgreements.length?<p>No agreements in this category.</p>:<ul>{visibleAgreements.map(a=><li key={a.id}><Link href={`/agreements/view?id=${a.id}`}><strong>{a.title}</strong></Link> — {(a.customers as unknown as {name:string}|null)?.name||'Customer'} — {a.status==='sent'?'Awaiting signature':a.status} — {new Date(a.created_at).toLocaleDateString('en-US')}{a.status==='sent'&&a.signing_expires_at&&<span> — {new Date(a.signing_expires_at).getTime()<=Date.now()?'Signing link expired — replace it':`Link expires ${new Date(a.signing_expires_at).toLocaleDateString('en-US')}`}</span>}{(a.status==='draft'||a.status==='sent')&&<SigningLink reissue={a.status==='sent'} id={a.id} customerName={(a.customers as unknown as {name:string}|null)?.name} email={(a.customers as unknown as {email:string|null}|null)?.email} phone={(a.customers as unknown as {phone:string|null}|null)?.phone}/>}</li>)}</ul>}</section>
 </main>;
}
