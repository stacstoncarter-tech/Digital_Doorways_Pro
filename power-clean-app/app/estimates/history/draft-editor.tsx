'use client';
import {useState,useTransition} from 'react';
import {updateDraftDetails} from './edit-actions';
export default function DraftEditor({id,notes:initialNotes,discount:initialDiscount,taxRate:initialTaxRate}:{id:string;notes:string;discount:number;taxRate:number}){
 const [notes,setNotes]=useState(initialNotes);
 const [discount,setDiscount]=useState(String(initialDiscount));
 const [taxRate,setTaxRate]=useState(String(initialTaxRate));
 const [pending,start]=useTransition();
 const [message,setMessage]=useState('');
 return <details style={{marginTop:12}}><summary>Edit draft details</summary><div style={{display:'grid',gap:12,maxWidth:420,marginTop:12}}>
 <label>Discount ($)<input type="number" min="0" step="0.01" value={discount} onChange={e=>setDiscount(e.target.value)} style={{display:'block',padding:8}}/></label>
 <label>Tax rate (%)<input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={e=>setTaxRate(e.target.value)} style={{display:'block',padding:8}}/></label>
 <label>Notes<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} style={{display:'block',padding:8,width:'100%'}}/></label>
 <button type="button" disabled={pending} onClick={()=>start(async()=>{const result=await updateDraftDetails(id,notes,Number(discount),Number(taxRate));setMessage(result.success?'Draft updated.':result.error||'Could not save');})}>{pending?'Saving…':'Save draft changes'}</button>
 {message&&<p role="status">{message}</p>}</div></details>;
}
