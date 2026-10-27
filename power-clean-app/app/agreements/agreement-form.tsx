'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {createAgreement} from './actions';
type Customer={id:string;name:string};
export default function AgreementForm({customers}:{customers:Customer[]}){
 const [customerId,setCustomerId]=useState('');
 const [type,setType]=useState('service_contract');
 const [title,setTitle]=useState('Power Clean Service Agreement — Draft');
 const [body,setBody]=useState('');
 const [pending,start]=useTransition();
 const [message,setMessage]=useState('');
 const router=useRouter();
 return <section className="panel"><h2>Create agreement draft</h2><p className="muted">Enter approved contract wording. These drafts are not yet sent for signature.</p>
 <div style={{display:'grid',gap:14,maxWidth:680}}>
 <label>Customer<select value={customerId} onChange={e=>setCustomerId(e.target.value)} style={{display:'block',padding:10,width:'100%'}}><option value="">Select customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label>Document type<select value={type} onChange={e=>{setType(e.target.value);setTitle(e.target.value==='liability_release'?'Power Clean Liability Release — Draft':'Power Clean Service Agreement — Draft');}} style={{display:'block',padding:10}}><option value="service_contract">Service contract</option><option value="liability_release">Liability release</option></select></label>
 <label>Title<input value={title} onChange={e=>setTitle(e.target.value)} style={{display:'block',padding:10,width:'100%'}}/></label>
 <label>Agreement text<textarea rows={10} value={body} onChange={e=>setBody(e.target.value)} placeholder="Paste your reviewed agreement wording here." style={{display:'block',padding:10,width:'100%'}}/></label>
 <button type="button" disabled={pending||!customerId||!body.trim()} onClick={()=>start(async()=>{const result=await createAgreement(customerId,type,title,body);setMessage(result.success?'Draft saved.':result.error||'Save failed.');if(result.success){setBody('');router.refresh();}})}>{pending?'Saving…':'Save agreement draft'}</button>
 {message&&<p role="status">{message}</p>}
 </div></section>;
}
