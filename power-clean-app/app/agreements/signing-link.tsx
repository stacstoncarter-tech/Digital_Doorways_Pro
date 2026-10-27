'use client';
import {useState,useTransition} from 'react';
import {prepareSigningLink} from './signing-actions';
export default function SigningLink({id,email,phone,customerName}:{id:string;email?:string|null;phone?:string|null;customerName?:string}){
 const [pending,start]=useTransition();
 const [link,setLink]=useState('');
 const [message,setMessage]=useState('');
 const body=customerName?`Hello ${customerName}, please review and electronically sign your Power Clean agreement: ${link}`:`Please review and electronically sign your Power Clean agreement: ${link}`;
 const emailUrl=email?`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Power Clean agreement for signature')}&body=${encodeURIComponent(body)}`:'';
 const smsUrl=phone?`sms:${encodeURIComponent(phone)}?body=${encodeURIComponent(body)}`:'';
 return <div style={{marginTop:8}}>
 <button type="button" disabled={pending} onClick={()=>start(async()=>{
 const result=await prepareSigningLink(id);
 if(result.token){setLink(window.location.origin+'/sign/'+result.token);setMessage('Signing link ready. Choose how to share it. Sending is manual.');}
 else setMessage(result.error||'Could not create link.');
 })}>{pending?'Preparing…':'Prepare signing link'}</button>
 {link&&<div style={{display:'grid',gap:8,marginTop:8,maxWidth:650}}>
 <input readOnly aria-label="Customer signing link" value={link} style={{width:'100%',padding:8}}/>
 <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
 <button type="button" onClick={()=>navigator.clipboard.writeText(link)}>Copy link</button>
 {emailUrl&&<a href={emailUrl}>Compose email</a>}
 {smsUrl&&<a href={smsUrl}>Compose text</a>}
 </div><small>Verify the recipient and link before sending. This page will not send messages automatically.</small>
 </div>}
 {message&&<p role="status">{message}</p>}
 </div>;
}
