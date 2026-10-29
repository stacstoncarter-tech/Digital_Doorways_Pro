'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { saveEstimate } from './actions';
import { useEffect } from 'react';

type Line = { id: number; service: string; squareFeet: string; rate: string; manualPrice: string; mode: 'area' | 'fixed' };
const money = (n: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const initial: Line = { id: 1, service: 'Driveway cleaning', squareFeet: '1000', rate: '0.20', manualPrice: '200', mode: 'area' };
export default function EstimatesPage() {
  const [lines, setLines] = useState<Line[]>([initial]);
  const [logo,setLogo]=useState('');
  useEffect(()=>{try{setLogo(localStorage.getItem('power-clean-logo')||'')}catch{}},[]);
  function setLogoFile(file?:File){if(!file||file.size>2000000)return;const reader=new FileReader();reader.onload=()=>{const data=String(reader.result||'');setLogo(data);try{localStorage.setItem('power-clean-logo',data)}catch{}};reader.readAsDataURL(file);}

  const [customer, setCustomer] = useState('');
  const [customers, setCustomers] = useState<{id:string;name:string}[]>([]);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState('');
  useEffect(()=>{let active=true;(async()=>{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();if(!member)return;const {data}=await supabase.from('customers').select('id,name').eq('business_id',member.business_id).order('name').limit(500);if(active)setCustomers(data??[]);})();return()=>{active=false};},[]);
  async function save(){setMessage('');setSaving(true);try{const result=await saveEstimate({customerId:customer,notes,discount,taxRate,lines});setMessage(result.id?'Estimate saved successfully.':result.error||'Save failed.');}catch{setMessage('Unable to save estimate.')}finally{setSaving(false)}}
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [discount, setDiscount] = useState('0');
  const update = (id: number, change: Partial<Line>) => setLines(old => old.map(line => line.id === id ? {...line,...change} : line));
  const subtotal = useMemo(() => lines.reduce((sum,line) => {
    const qty = Number(line.squareFeet), rate = Number(line.rate), fixed = Number(line.manualPrice);
    return sum + (line.mode === 'area' ? (Number.isFinite(qty*rate) ? Math.max(0,qty*rate) : 0) : (Number.isFinite(fixed) ? Math.max(0,fixed) : 0));
  },0),[lines]);
  const safeDiscount = Math.min(subtotal,Math.max(0,Number(discount)||0));
  const taxable = subtotal-safeDiscount;
  const tax = taxable*Math.max(0,Number(taxRate)||0)/100;
  const total = taxable+tax;
  const add = () => setLines(old => [...old,{id:Math.max(0,...old.map(l=>l.id))+1,service:'',squareFeet:'',rate:'',manualPrice:'',mode:'area'}]);
  return <main className="workspace">
    <style>{`@media screen {.print-estimate{display:none}} @media print {@page{size:letter;margin:16mm}.workspace-header,.workspace>.panel{display:none!important}.print-estimate{display:block!important}.print-estimate table{width:100%;border-collapse:collapse}.print-estimate td,.print-estimate th{padding:10px;border-bottom:1px solid #ddd}.print-estimate th{background:#0069b4!important;color:white!important;print-color-adjust:exact}}`}</style>
    <article className="print-estimate">
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'3px solid #0871bd',paddingBottom:16}}><div>{logo?<img src={logo} alt="Power Clean" style={{maxWidth:330,maxHeight:120}}/>:<h1>POWER CLEAN</h1>}</div><h1>ESTIMATE</h1></header>
      <p>Date: {new Date().toLocaleDateString('en-US')}</p>
      <p>Prepared for: <strong>{customers.find(c=>c.id===customer)?.name||'Customer not selected'}</strong></p>
      <table><thead><tr><th>Service</th><th>Quantity</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{lines.map(l=><tr key={l.id}><td>{l.service}</td><td>{l.mode==='area'?l.squareFeet+' sq ft':'Fixed'}</td><td>{l.mode==='area'?money(Number(l.rate)||0):'—'}</td><td>{money(l.mode==='area'?(Number(l.squareFeet)||0)*(Number(l.rate)||0):Number(l.manualPrice)||0)}</td></tr>)}</tbody></table>
      <div style={{textAlign:'right',marginTop:24}}><p>Subtotal: {money(subtotal)}</p><p>Discount: -{money(safeDiscount)}</p><p>Tax: {money(tax)}</p><h2 style={{color:'#0871bd'}}>Total: {money(total)}</h2></div>
      {notes&&<section><h3>Notes</h3><p>{notes}</p></section>}
      <footer style={{borderTop:'2px solid #0871bd',marginTop:45,paddingTop:12,textAlign:'center'}}>POWER CLEAN · Cleaner Properties. Brighter Communities.</footer>
    </article>
    <header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / OPERATIONS</span><h1>Estimate Builder</h1><p className="muted">Calculate by square foot or enter a fixed service price.</p></div><div style={{display:"flex",gap:16}}><Link href="/estimates/history">Saved estimates</Link><Link href="/customers">Customers</Link></div></header>
    <section className="panel"><h2>Company logo for printing</h2><p className="muted">Select the transparent Power Clean logo. Your browser remembers it for future prints on this device.</p><input type="file" accept="image/png,image/jpeg" onChange={e=>setLogoFile(e.target.files?.[0])}/>{logo&&<img src={logo} alt="Power Clean logo" style={{maxWidth:300,display:'block',marginTop:12}}/>}</section><section className="panel"><h2>Estimate details</h2><p className="muted">Choose a customer and save a draft estimate. Sending estimates is not available yet. Rates shown are editable examples, not approved Power Clean pricing.</p>
      <label>Customer<select value={customer} onChange={e=>setCustomer(e.target.value)} style={{display:'block',padding:12,width:'100%',maxWidth:460}}><option value="">Select a customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {lines.map((line,i)=><div key={line.id} style={{borderTop:'1px solid #d9e3e9',padding:'20px 0',display:'grid',gap:12}}>
        <strong>Service {i+1}</strong>
        <label>Service description<input value={line.service} onChange={e=>update(line.id,{service:e.target.value})} style={{display:'block',padding:12,width:'100%'}} /></label>
        <label>Pricing method<select value={line.mode} onChange={e=>update(line.id,{mode:e.target.value as Line['mode']})} style={{display:'block',padding:12}}><option value="area">Square feet × rate</option><option value="fixed">Fixed price</option></select></label>
        {line.mode==='area' ? <div style={{display:'flex',gap:12,flexWrap:'wrap'}}><label>Square feet<input type="number" min="0" step="0.01" value={line.squareFeet} onChange={e=>update(line.id,{squareFeet:e.target.value})} style={{display:'block',padding:12}} /></label><label>Rate ($/sq ft)<input type="number" min="0" step="0.001" value={line.rate} onChange={e=>update(line.id,{rate:e.target.value})} style={{display:'block',padding:12}} /></label></div> : <label>Fixed price ($)<input type="number" min="0" step="0.01" value={line.manualPrice} onChange={e=>update(line.id,{manualPrice:e.target.value})} style={{display:'block',padding:12}} /></label>}
        <div><strong>Line total: {money(line.mode==='area' ? Math.max(0,(Number(line.squareFeet)||0)*(Number(line.rate)||0)) : Math.max(0,Number(line.manualPrice)||0))}</strong> {lines.length>1 && <button type="button" onClick={()=>setLines(old=>old.filter(x=>x.id!==line.id))} style={{marginLeft:20}}>Remove</button>}</div>
      </div>)}
      <button type="button" onClick={add}>+ Add service</button>
    </section>
    <section className="panel"><h2>Totals</h2><div style={{display:'grid',gap:12,maxWidth:440}}><label>Discount ($)<input type="number" min="0" step="0.01" value={discount} onChange={e=>setDiscount(e.target.value)} style={{display:'block',padding:12,width:'100%'}} /></label><label>Tax rate (%) — only if applicable<input type="number" min="0" step="0.01" value={taxRate} onChange={e=>setTaxRate(e.target.value)} style={{display:'block',padding:12,width:'100%'}} /></label><label>Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} style={{display:'block',padding:12,width:'100%'}} /></label></div>
      <p>Subtotal: {money(subtotal)}</p><p>Discount: -{money(safeDiscount)}</p><p>Tax: {money(tax)}</p><h2>Total: {money(total)}</h2>
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button type="button" disabled={saving||!customer} onClick={save}>{saving?'Saving…':'Save Estimate'}</button><button type="button" onClick={()=>window.print()}>Print estimate preview</button></div>{message&&<p role="status">{message}</p>}
    </section>
  </main>;
}
