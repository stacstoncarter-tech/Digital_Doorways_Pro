'use client';
import {useState,useTransition} from 'react';
import {prepareSigningLink} from './signing-actions';
export default function SigningLink({id}:{id:string}){
 const [pending,start]=useTransition();
 const [link,setLink]=useState('');
 const [message,setMessage]=useState('');
 return <div style={{marginTop:8}}><button type="button" disabled={pending} onClick={()=>start(async()=>{const result=await prepareSigningLink(id);if(result.token){setLink(window.location.origin+'/sign/'+result.token);setMessage('Link prepared. Share it privately with the intended customer.');}else setMessage(result.error||'Could not create link.');})}>{pending?'Preparing…':'Prepare signing link'}</button>{link&&<div><input readOnly aria-label="Customer signing link" value={link} style={{width:'100%',maxWidth:650,padding:8,marginTop:8}}/><button type="button" onClick={()=>navigator.clipboard.writeText(link)}>Copy link</button></div>}{message&&<p role="status">{message}</p>}</div>;
}
