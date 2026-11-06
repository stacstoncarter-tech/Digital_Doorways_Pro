'use client';
import {useState,useTransition} from 'react';
import {createEstimateApprovalLink} from './approval-actions';
export default function EstimateApprovalLink({id}:{id:string}){
 const [pending,start]=useTransition();
 const [url,setUrl]=useState('');
 const [error,setError]=useState('');
 const [copied,setCopied]=useState(false);
 const body=url?`Please review your Power Clean estimate and approve or decline it here: ${url}`:'';
 return <div style={{margin:'14px 0'}}>
 <button type="button" disabled={pending} onClick={()=>start(async()=>{setError('');const r=await createEstimateApprovalLink(id);if(r.url){setUrl(new URL(r.url,window.location.origin).href);setCopied(false);}else setError(r.error||'Unable to create link.');})}>{pending?'Creating…':'Create customer approval link'}</button>
 {url&&<div><p><strong>Customer approval link (expires in 14 days):</strong></p><input readOnly aria-label="Customer approval link" value={url} style={{width:'100%',padding:10}} onFocus={e=>e.target.select()}/><div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",marginTop:8}}><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setError("Clipboard unavailable. Select and copy the link manually.");}}}>{copied?"Copied!":"Copy link"}</button><a href={`mailto:?subject=${encodeURIComponent("Power Clean estimate for review")}&body=${encodeURIComponent(body)}`}>Compose email</a><a href={`sms:?body=${encodeURIComponent(body)}`}>Compose text</a></div><p className="muted">Share this private link by text or email. Anyone with the link can approve or decline this estimate.</p></div>}
 {error&&<p role="alert">{error}</p>}
 </div>;
}
