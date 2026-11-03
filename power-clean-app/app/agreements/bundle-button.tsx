'use client';
import {useState,useTransition} from 'react';
import {prepareAgreementBundle} from './bundle-actions';
export default function BundleButton({customerId,name,email,phone}:{customerId:string;name:string;email?:string|null;phone?:string|null}){
 const [pending,start]=useTransition();
 const [link,setLink]=useState('');
 const [error,setError]=useState('');
 const message='Hello '+name+', please review and electronically sign both Power Clean agreements: '+link;
 return <div style={{display:'grid',gap:8,marginBottom:12,maxWidth:650}}>
 <button type="button" disabled={pending} onClick={()=>start(async()=>{
  if(!window.confirm('Prepare the two-document workflow for this customer? If a document is missing, Power Clean will create a draft for review. If both drafts exist, you are approving your electronic signature on both documents and preparing one customer link.'))return;
  setError('');
  try{const result=await prepareAgreementBundle(customerId);if(result.serviceToken&&result.liabilityToken){const p=new URLSearchParams({service:result.serviceToken,liability:result.liabilityToken});setLink(window.location.origin+'/sign/bundle?'+p.toString());}else setError(result.error||'Could not prepare both agreements.');}catch{setError('The signing bundle could not be prepared. Please try again.');}
 })}>{pending?'Preparing documents…':'Prepare both agreements'}</button>
 {error&&<p role="alert" style={{fontWeight:600}}>{error}</p>}
 {link&&<div style={{display:'grid',gap:8}}><p>Both agreements prepared. Share this one link:</p><input readOnly aria-label="Combined customer signing link" value={link}/><button type="button" onClick={()=>navigator.clipboard.writeText(link)}>Copy combined link</button>{email&&<a href={'mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent('Power Clean — two agreements for signature')+'&body='+encodeURIComponent(message)}>Compose email with both agreements</a>}{phone&&<a href={'sms:'+encodeURIComponent(phone)+'?body='+encodeURIComponent(message)}>Compose text with both agreements</a>}<small>Sending remains manual. Each document requires a separate customer signature.</small></div>}
 </div>;
}
