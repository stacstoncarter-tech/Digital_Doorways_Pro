'use client';
import {useState,useTransition} from 'react';
import {prepareAgreementBundle} from './bundle-actions';
export default function BundleButton({customerId,name,email,phone}:{customerId:string;name:string;email?:string|null;phone?:string|null}){
 const [pending,start]=useTransition();
 const [link,setLink]=useState('');
 const [testMode,setTestMode]=useState(false);
 const [error,setError]=useState('');
 const message='Hello '+name+', please review and electronically sign both Power Clean agreements: '+link;
 return <div style={{display:'grid',gap:8,marginBottom:12,maxWidth:650}}>
 <label style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={testMode} onChange={e=>setTestMode(e.target.checked)}/> Test signing only — create two clearly marked TEST ONLY documents (no legal approval required)</label>
 <button type="button" disabled={pending} onClick={()=>start(async()=>{
  if(!window.confirm(testMode?'Create and send two TEST ONLY signing documents for this customer? No services or payment are authorized.':'Confirm you have reviewed and approved BOTH customer agreements. If a document is missing, Power Clean will create it for review instead of sending. Continue?'))return;
  setError('');setLink('');
  try{const result=await prepareAgreementBundle(customerId,testMode);if(result.serviceToken&&result.liabilityToken){const p=new URLSearchParams({service:result.serviceToken,liability:result.liabilityToken});setLink(window.location.origin+'/sign/bundle?'+p.toString());}else setError(result.error||'Could not prepare both agreements.');}catch{setError('The signing bundle could not be prepared. Please try again.');}
 })}>{pending?'Preparing documents…':'Prepare both agreements'}</button>
 {error&&<p role="alert" style={{fontWeight:600}}>{error}</p>}
 {link&&<div style={{display:'grid',gap:8}}><p>Both agreements are ready. Send this single link to the customer to sign both documents:</p><input readOnly aria-label="Combined customer signing link" value={link}/><button type="button" onClick={()=>navigator.clipboard.writeText(link)}>Copy signing link</button>{email&&<a href={'mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent('Power Clean — two agreements for signature')+'&body='+encodeURIComponent(message)}>Open email draft</a>}{phone&&<a href={'sms:'+encodeURIComponent(phone)+'?body='+encodeURIComponent(message)}>Open text message draft</a>}<small>Copy signing link copies the URL only. Open email/text draft opens a message you must send yourself. The customer signs both documents in sequence.</small></div>}
 </div>;
}
