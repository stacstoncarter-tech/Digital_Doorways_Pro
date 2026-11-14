import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import PrintButton from './print-button';
import InvoiceShare from './invoice-share';
import {POWER_CLEAN_LOGO} from '@/lib/branding';
const money=(n:number)=>Number(n).toLocaleString('en-US',{style:'currency',currency:'USD'});
export default async function InvoiceDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();if(!member)notFound();
 const {data:invoice}=await supabase.from('invoices').select('id,invoice_number,customer_id,job_id,status,subtotal,discount,tax_rate,total,due_at,notes,created_at,invoice_items(description,quantity,unit_price,position),invoice_payments(amount,method,reference,received_at)').is('deleted_at',null).eq('id',id).eq('business_id',member.business_id).maybeSingle();if(!invoice)notFound();
 const {data:customer}=await supabase.from('customers').select('name,email,phone').eq('id',invoice.customer_id).eq('business_id',member.business_id).maybeSingle();
 const paid=(invoice.invoice_payments||[]).reduce((s,p)=>s+Number(p.amount),0),balance=Math.max(0,Number(invoice.total)-paid);
 const items=[...(invoice.invoice_items||[])].sort((a,b)=>a.position-b.position);
 return <main className="workspace"><div className="invoice-no-print" style={{display:'flex',gap:18,alignItems:'center',marginBottom:18}}><Link href="/invoices">Back to invoices</Link><PrintButton/></div>
 <article className="panel" style={{maxWidth:850,margin:'0 auto',padding:32}}>
 <header style={{display:'flex',justifyContent:'space-between',gap:20,flexWrap:'wrap',borderBottom:'2px solid #168bd3',paddingBottom:22}}><div><img src={POWER_CLEAN_LOGO} alt="Power Clean logo" style={{display:"block",width:"100%",maxWidth:300,height:"auto",marginBottom:8}}/><p>Pressure Washing & Soft Washing</p></div><div style={{textAlign:'right'}}><h2 style={{margin:0}}>INVOICE</h2><p>{invoice.invoice_number}</p><p>{invoice.status.toUpperCase().replace('_',' ')}</p></div></header>
 <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:20,margin:'24px 0'}}><div><strong>Bill to</strong><p>{customer?.name||'Customer'}</p>{customer?.email&&<p>{customer.email}</p>}{customer?.phone&&<p>{customer.phone}</p>}</div><div><p>Issued: {new Date(invoice.created_at).toLocaleDateString('en-US')}</p>{invoice.due_at&&<p>Due: {invoice.due_at}</p>}</div></div>
 <table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr style={{borderBottom:'2px solid #ccc'}}><th style={{textAlign:'left',padding:10}}>Service</th><th style={{textAlign:'right',padding:10}}>Qty</th><th style={{textAlign:'right',padding:10}}>Rate</th><th style={{textAlign:'right',padding:10}}>Amount</th></tr></thead><tbody>{items.map((x,i)=><tr key={i} style={{borderBottom:'1px solid #ddd'}}><td style={{padding:10}}>{x.description}</td><td style={{textAlign:'right',padding:10}}>{x.quantity}</td><td style={{textAlign:'right',padding:10}}>{money(x.unit_price)}</td><td style={{textAlign:'right',padding:10}}>{money(Number(x.quantity)*Number(x.unit_price))}</td></tr>)}</tbody></table>
 <div style={{maxWidth:330,marginLeft:'auto',marginTop:25}}><p>Subtotal: {money(invoice.subtotal)}</p><p>Discount: {money(invoice.discount)}</p><p>Tax rate: {invoice.tax_rate}%</p><h2>Total: {money(invoice.total)}</h2><p>Payments recorded: {money(paid)}</p><h2>Balance due: {money(balance)}</h2></div>
 {invoice.notes&&<section><h3>Notes</h3><p style={{whiteSpace:'pre-wrap'}}>{invoice.notes}</p></section>}
 <footer style={{marginTop:40,borderTop:'1px solid #ddd',paddingTop:15}}><p>Thank you for choosing Power Clean.</p><small>Recorded payments are not proof of bank settlement. This document does not automatically collect payment.</small></footer>
 </article><InvoiceShare id={invoice.id} number={invoice.invoice_number} email={customer?.email||''} total={Number(invoice.total)} balance={balance} test={invoice.notes?.startsWith('[TEST ONLY')||false}/><style>{'@media print { .invoice-no-print {display:none!important} body {background:white!important} main.workspace {padding:0!important;max-width:none!important} article.panel {border:0!important;box-shadow:none!important;margin:0!important;max-width:none!important} }'}</style></main>;
}
