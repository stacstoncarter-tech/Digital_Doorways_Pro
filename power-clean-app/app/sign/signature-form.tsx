'use client';
import {useState,useTransition} from 'react';
import Link from 'next/link';
import {submitSignature} from './sign-actions';
export default function SignatureForm({token,nextToken='',returnToken=''}:{token:string;nextToken?:string;returnToken?:string}){
 const [name,setName]=useState('');
 const [ack,setAck]=useState(false);
 const [pending,start]=useTransition();
 const [message,setMessage]=useState('');
 const [signed,setSigned]=useState(false);
 if(signed)return <section className="panel"><h2>{returnToken?'Both agreements completed':'Signature recorded'}</h2><p>{returnToken?'Thank you. You have completed the two-agreement signing process. No further signatures are needed.':'Your electronic signature has been submitted successfully.'}</p>{nextToken&&!returnToken?<><p><strong>One more document to sign.</strong> Continue to the second agreement to finish your paperwork.</p><Link className="primary" href={'/sign/'+nextToken+'?returnTo='+token}>Continue to Agreement 2 →</Link></>:<p>Please retain a copy of your agreements for your records. Contact Power Clean if you need copies of your signed documents.</p>}</section>;
 return <section className="panel"><h2>Electronic signature</h2><p>By checking the box and typing your name, you agree to sign this document electronically.</p>
 <label>Full legal name<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" style={{display:'block',padding:12,width:'100%',maxWidth:440}}/></label>
 <label style={{display:'flex',gap:10,margin:'18px 0'}}><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>I have read the agreement, agree to its terms, and consent to use an electronic signature.</label>
 <button type="button" disabled={pending||name.trim().length<2||!ack} onClick={()=>start(async()=>{const result=await submitSignature(token,name,ack);if(result.success)setSigned(true);else setMessage(result.error||'Unable to sign.');})}>{pending?'Signing…':'Sign agreement'}</button>
 {message&&<p role="alert">{message}</p>}</section>;
}
