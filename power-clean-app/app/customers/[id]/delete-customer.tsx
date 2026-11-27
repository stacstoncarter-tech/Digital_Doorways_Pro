'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {deleteCustomer} from './delete-action';
export default function DeleteCustomer({customerId,name}:{customerId:string;name:string}){
 const [override,setOverride]=useState(false),[open,setOpen]=useState(false),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[pending,start]=useTransition(),router=useRouter();
 return <section className="panel"><h2>Customer record management</h2><p>Delete an unused record, or override linked records to remove the customer from the active directory. The override retains their documents, payments and photos.</p>
 {!open?<button type="button" onClick={()=>setOpen(true)}>Delete customer…</button>:<div style={{display:'grid',gap:10,maxWidth:450}}><label><input type="checkbox" checked={override} onChange={e=>setOverride(e.target.checked)}/> Override linked records and remove from directory</label><p><strong>Delete {name}?</strong> This cannot be undone. Type DELETE to confirm.</p><input aria-label="Type DELETE to confirm" value={confirm} onChange={e=>setConfirm(e.target.value)}/><div style={{display:'flex',gap:10}}><button type="button" disabled={pending||confirm!=='DELETE'} onClick={()=>start(async()=>{const result=await deleteCustomer(customerId,confirm,override);if(result.error)setError(result.error);else router.replace('/customers');})}>Confirm deletion</button><button type="button" onClick={()=>{setOpen(false);setConfirm('');setError('');}}>Cancel</button></div>{error&&<p role="alert">{error}</p>}</div>}
 </section>;
}
