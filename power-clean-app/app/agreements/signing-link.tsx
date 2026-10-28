'use client';
import {useState,useTransition} from 'react';
import {prepareSigningLink} from './signing-actions';
export default function SigningLink({id,email,phone,customerName,reissue=false}:{id:string;email?:string|null;phone?:string|null;customerName?:string;reissue?:boolean}){
 const [pending,start]=useTransition();
 const [link,setLink]=useState('');
 const [message,setMessage]=useState('');
 const [copied,setCopied]=useState(false);
 const body=customerName?`Hello ${customerName}, please review and electronically sign your Power Clean agreement: ${link}`:`Please review and electronically sign your Power Clean agreement: ${link}`;
 const emailUrl=email?`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Power Clean agreement for signature')}&body=${encodeURIComponent(body)}`:'';
 const smsUrl=phone?`sms:${encodeURIComponent(phone)}?body=${encodeURIComponent(body)}`:'';
 return <div style={{marginTop:8}}>
 <button type="button" disabled={pending} onClick={()=>start(async()=>{
 const result=await prepareSigningLink(id,reissue);
 if(result.token){setCopied(false);setLink(window.location.origin+'/sign/'+result.token);setMessage('Signing link ready. Choose how to share it. Sending is manual.');}
 else setMessage(result.error||'Could not create link.');
 })}>{pending?'Preparing…':reissue?'Replace signing link':'Prepare signing link'}</button>
 {link&&<div style={{display:'grid',gap:8,marginTop:8,maxWidth:650}}>
 <input readOnly aria-label="Customer signing link" value={link} style={{width:'100%',padding:8}}/>
 <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
 <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(link);setCopied(true);}catch{setMessage('Clipboard unavailable. Select and copy the link manually.');}}}>{copied?'Copied!':'Copy link'}</button>
 {emailUrl&&<a href={emailUrl}>Compose email</a>}
 {smsUrl&&<a href={smsUrl}>Compose text</a>}
 </div><small>Verify the recipient and link before sending. This page will not send messages automatically.</small>
 </div>}
 {message&&<p role="status">{message}</p>}
 </div>;
}
