import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import ActivityForm from './activity-form';
const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
export default async function CustomerTimeline({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();if(!member)notFound();
 const {data:customer}=await supabase.from('customers').select('id,name').eq('id',id).eq('business_id',member.business_id).maybeSingle();if(!customer)notFound();
 const [{data:activity},{data:jobs},{data:estimates},{data:invoices},{data:agreements}]=await Promise.all([
 supabase.from('customer_activity').select('id,activity_type,summary,occurred_at').eq('customer_id',id).eq('business_id',member.business_id).order('occurred_at',{ascending:false}).limit(200),
 supabase.from('jobs').select('id,status,scheduled_start,created_at').is('deleted_at',null).eq('customer_id',id).eq('business_id',member.business_id).limit(200),
 supabase.from('estimates').select('id,status,created_at').is('deleted_at',null).eq('customer_id',id).eq('business_id',member.business_id).limit(200),
 supabase.from('invoices').select('id,invoice_number,status,total,created_at').is('deleted_at',null).eq('customer_id',id).eq('business_id',member.business_id).limit(200),
 supabase.from('customer_agreements').select('id,title,status,created_at').is('deleted_at',null).eq('customer_id',id).eq('business_id',member.business_id).limit(200)
 ]);
 const events=[
 ...(activity||[]).map(x=>({id:'a'+x.id,date:x.occurred_at,label:x.activity_type.replace('_',' '),description:x.summary})),
 ...(jobs||[]).map(x=>({id:'j'+x.id,date:x.scheduled_start||x.created_at,label:'Job',description:x.status.replaceAll('_',' ')})),
 ...(estimates||[]).map(x=>({id:'e'+x.id,date:x.created_at,label:'Estimate',description:x.status})),
 ...(invoices||[]).map(x=>({id:'i'+x.id,date:x.created_at,label:'Invoice '+x.invoice_number,description:x.status+' · '+money(Number(x.total))})),
 ...(agreements||[]).map(x=>({id:'g'+x.id,date:x.created_at,label:'Agreement',description:x.title+' · '+x.status}))
 ].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / CUSTOMERS</span><h1>{customer.name} — History</h1><p>Unified activity, estimates, agreements, jobs, and invoices.</p></div><Link href={'/customers/'+id}>Customer profile</Link></header>
 <section className="panel"><ActivityForm customerId={id}/></section>
 <section className="panel"><h2>Activity timeline</h2>{events.length?events.map(e=><div key={e.id} style={{borderBottom:'1px solid #ddd',padding:'12px 0'}}><strong>{e.label}</strong><p>{new Date(e.date).toLocaleString('en-US')} · {e.description}</p></div>):<p>No activity yet.</p>}</section>
 </main>;
}
