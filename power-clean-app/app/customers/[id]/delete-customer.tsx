'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {deleteCustomer} from './delete-action';
export default function DeleteCustomer({customerId,name}:{customerId:string;name:string}){
 const [open,setOpen]=useState(false),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[pending,start]=useTransition(),router=useRouter();
 return <section className="panel"><h2>Customer record management</h2><p>Delete an unused customer record. Customers with agreements, estimates, jobs, invoices, or stored photos cannot be deleted through this action.</p>
 {!open?<button type="button" onClick={()=>setOpen(true)}>Delete customer…</button>:<div style={{display:'grid',gap:10,maxWidth:450}}><p><strong>Delete {name}?</strong> This cannot be undone. Type DELETE to confirm.</p><input aria-label="Type DELETE to confirm" value={confirm} onChange={e=>setConfirm(e.target.value)}/><div style={{display:'flex',gap:10}}><button type="button" disabled={pending||confirm!=='DELETE'} onClick={()=>start(async()=>{const result=await deleteCustomer(customerId,confirm);if(result.error)setError(result.error);else router.replace('/customers');})}>Confirm deletion</button><button type="button" onClick={()=>{setOpen(false);setConfirm('');setError('');}}>Cancel</button></div>{error&&<p role="alert">{error}</p>}</div>}
 </section>;
}
