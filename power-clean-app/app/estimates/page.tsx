'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';

type Line = { id: number; service: string; squareFeet: string; rate: string; manualPrice: string; mode: 'area' | 'fixed' };
const money = (n: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const initial: Line = { id: 1, service: 'Driveway cleaning', squareFeet: '1000', rate: '0.20', manualPrice: '200', mode: 'area' };
export default function EstimatesPage() {
  const [lines, setLines] = useState<Line[]>([initial]);
  const [customer, setCustomer] = useState('');
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
    <header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / OPERATIONS</span><h1>Estimate Builder</h1><p className="muted">Calculate by square foot or enter a fixed service price.</p></div><Link href="/customers">Customers</Link></header>
    <section className="panel"><h2>Estimate details</h2><p className="muted">This is a calculator preview. Estimates are not saved or sent yet. Rates shown are editable examples, not approved Power Clean pricing.</p>
      <label>Customer name<input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Customer name" style={{display:'block',padding:12,width:'100%',maxWidth:460}} /></label>
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
      <button type="button" onClick={()=>window.print()}>Print estimate preview</button>
    </section>
  </main>;
}
