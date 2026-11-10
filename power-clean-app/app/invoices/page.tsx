import DeleteRecord from '@/app/delete-record';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import InvoiceControls from './invoice-controls';
const money=(n:number)=>Number(n).toLocaleString('en-US',{style:'currency',currency:'USD'});
export default async function InvoicesPage(){
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)return <main className="workspace"><h1>Access pending</h1></main>;
 const {data:invoices,error}=await supabase.from('invoices').select('id,invoice_number,customer_id,job_id,status,subtotal,discount,tax_rate,total,due_at,notes,created_at,invoice_items(description,quantity,unit_price,position),invoice_payments(amount,method,reference,received_at)').is('deleted_at',null).eq('business_id',member.business_id).order('created_at',{ascending:false}).limit(200);
 const ids=[...new Set((invoices||[]).map(i=>i.customer_id))];
 const {data:customers}=ids.length?await supabase.from('customers').select('id,name,email').eq('business_id',member.business_id).in('id',ids):{data:[]};
 const names=new Map((customers||[]).map(c=>[c.id,c]));
 const outstanding=(invoices||[]).filter(i=>i.status!=='void').reduce((sum,i)=>sum+Math.max(0,Number(i.total)-(i.invoice_payments||[]).reduce((s,p)=>s+Number(p.amount),0)),0);
 const canDelete=['owner','admin'].includes(member.role);
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / FINANCE</span><h1>Invoices & Payments</h1><p>Outstanding balance: <strong>{money(outstanding)}</strong></p></div><Link href="/jobs">Jobs</Link></header>{canDelete&&<p><Link href="/trash">Trash · restore deleted records</Link></p>}
 {error?<section className="panel"><p role="alert">Unable to load invoices.</p></section>:!invoices?.length?<section className="panel"><h2>No invoices yet</h2><p>Complete a job and select Create invoice.</p><Link href="/jobs">Go to Jobs</Link></section>:invoices.map(i=>{const paid=(i.invoice_payments||[]).reduce((s,p)=>s+Number(p.amount),0),balance=Math.max(0,Number(i.total)-paid);return <section className="panel" key={i.id}><div className="section-heading"><div><h2><Link href={"/invoices/"+i.id}>{i.invoice_number}</Link></h2><p>{names.get(i.customer_id)?.name||'Customer'} · {i.status.replace('_',' ')} · {new Date(i.created_at).toLocaleDateString('en-US')}</p></div><strong>{money(i.total)}</strong></div>
 <ul>{(i.invoice_items||[]).map((x,n)=><li key={n}>{x.description}: {x.quantity} × {money(x.unit_price)} = {money(Number(x.quantity)*Number(x.unit_price))}</li>)}</ul>
 <p>Subtotal {money(i.subtotal)} · Discount {money(i.discount)} · Tax {i.tax_rate}%</p><p>Paid: {money(paid)} · <strong>Balance: {money(balance)}</strong></p>
 <p><Link href={'/customers/'+i.customer_id}>Customer</Link> · <Link href={"/jobs/"+i.job_id}>Job</Link> · <Link href={"/invoices/"+i.id}>Print / Save PDF</Link></p>
 {canDelete&&<DeleteRecord kind="invoice" id={i.id} label={i.invoice_number}/>}<InvoiceControls id={i.id} status={i.status} balance={balance}/>
 {(i.invoice_payments||[]).length>0&&<details><summary>Payment history</summary><ul>{i.invoice_payments.map((p,n)=><li key={n}>{money(p.amount)} · {p.method} · {new Date(p.received_at).toLocaleDateString('en-US')} {p.reference}</li>)}</ul></details>}
 </section>})}</main>;
}
