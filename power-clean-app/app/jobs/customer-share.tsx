'use client';
import {useState,useTransition} from 'react';
import {prepareCustomerShare} from './share-actions';
type Share={subject:string;message:string;email:string;phone:string;photoCount:number;isTest:boolean};
export default function CustomerShare({jobId}:{jobId:string}){
 const [photos,setPhotos]=useState(false),[share,setShare]=useState<Share|null>(null),[error,setError]=useState(''),[pending,start]=useTransition();
 const generate=()=>start(async()=>{setError('');setShare(null);const result=await prepareCustomerShare(jobId,photos);if('error'in result){setError(result.error||'Could not prepare message.');return;}setShare(result as Share);});
 const mail=share?'mailto:'+encodeURIComponent(share.email)+'?subject='+encodeURIComponent(share.subject)+'&body='+encodeURIComponent(share.message):'';
 const sms=share?'sms:'+share.phone.replace(/[^\d+]/g,'')+'?body='+encodeURIComponent(share.subject+'\n'+share.message):'';
 return <details><summary>Send appointment confirmation & job photos</summary><div style={{display:'grid',gap:12,maxWidth:650,marginTop:12}}>
 <p>Prepare a customer-ready appointment message. Email and text open your device's messaging app for review and sending; they are not sent automatically.</p>
 <label><input type="checkbox" checked={photos} onChange={e=>{setPhotos(e.target.checked);setShare(null);}}/> Include up to 20 uploaded job photos as secure 24-hour links</label>
 <button type="button" onClick={generate} disabled={pending}>{pending?'Preparing…':'Prepare customer message'}</button>
 {error&&<p role="alert">{error}</p>}
 {share&&<><p><strong>{share.isTest?'TEST ONLY — demonstration appointment':'Appointment confirmation'}</strong>{share.photoCount?' · '+share.photoCount+' photo links':''}</p>
 <textarea readOnly rows={11} value={share.subject+'\n\n'+share.message} aria-label="Customer message"/>
 <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
 {share.email?<a href={mail}>Open email draft</a>:<span>Add customer email to enable email</span>}
 {share.phone?<a href={sms}>Open text draft</a>:<span>Add customer phone to enable text</span>}
 <button type="button" onClick={()=>navigator.clipboard.writeText(share.subject+'\n\n'+share.message)}>Copy message & links</button>
 </div><small>Photo links expire 24 hours after preparation. Only share with the intended customer. No message is sent until you confirm it in your email or SMS app.</small></>}
 </div></details>;
}
