'use client';
import {useActionState,useState,useTransition} from 'react';
import {recordPayment,setInvoiceStatus} from './actions';
export default function InvoiceControls({id,status,balance}:{id:string;status:string;balance:number}){
 const [pending,start]=useTransition(),[message,setMessage]=useState('');
 const [state,action,paying]=useActionState(recordPayment,{error:'',success:''});
 return <div style={{marginTop:12}}>{['draft','sent'].includes(status)&&<div style={{display:'flex',gap:8}}>{status==='draft'&&<button disabled={pending} onClick={()=>start(async()=>{const r=await setInvoiceStatus(id,'sent');setMessage(r.error||'Marked sent.');})}>Mark sent</button>}<button disabled={pending} onClick={()=>start(async()=>{const r=await setInvoiceStatus(id,'void');setMessage(r.error||'Invoice voided.');})}>Void invoice</button></div>}
 {message&&<p role="status">{message}</p>}
 {['sent','partially_paid'].includes(status)&&balance>0&&<details><summary>Record payment</summary><form action={action} style={{display:'grid',gap:10,maxWidth:420,paddingTop:12}}><input type="hidden" name="invoiceId" value={id}/><label>Amount received<input name="amount" type="number" min=".01" step=".01" max={balance.toFixed(2)} required/></label><label>Payment method<select name="method" defaultValue="cash">{['cash','check','card','bank_transfer','other'].map(x=><option key={x} value={x}>{x.replace('_',' ')}</option>)}</select></label><label>Reference / memo<input name="reference" maxLength={200}/></label><button className="primary" disabled={paying}>Record payment</button>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}</form></details>}
 </div>;
}
