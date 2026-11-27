'use client';
import {useState,useTransition} from 'react';
import {saveAgreementDraft} from './draft-actions';
export default function DraftEditor({id,initialBody}:{id:string;initialBody:string}){
 const [body,setBody]=useState(initialBody);
 const [message,setMessage]=useState('');
 const [pending,start]=useTransition();
 const unresolved=[...new Set(body.match(/\[[A-Z][A-Z0-9 /-]+\]/g)||[])].filter(x=>x!=='[PHOTO CONSENT]');
 return <section className="panel print-hide"><h2>Complete contract fields</h2><p>Owner-only draft editor. Enter actual property conditions, whether each area was photographed, attachment details, and the legally reviewed cancellation deadline. Never claim no known defects without confirming with the customer. Do not remove applicable cancellation notices.</p>
 <p><strong>Fields still to complete:</strong> {unresolved.length?unresolved.join(', '):'None (subject to contract review)'}</p>
 <label>Agreement draft text<textarea rows={18} value={body} onChange={e=>setBody(e.target.value)} style={{display:'block',width:'100%',padding:12,fontFamily:'monospace',fontSize:13}}/></label>
 <button type="button" disabled={pending||!body.trim()} onClick={()=>start(async()=>{const r=await saveAgreementDraft(id,body);setMessage(r.success?'Draft saved. Review all legal and customer details before sending.':r.error||'Unable to save.');})}>{pending?'Saving…':'Save reviewed draft'}</button>
 {message&&<p role="status">{message}</p>}
 </section>;
}
