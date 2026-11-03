'use client';
import {useState,useTransition} from 'react';
import {setSignatureAuthorization} from './actions';
export default function AuthorizationForm({active}:{active:boolean}){
 const [consent,setConsent]=useState(false);
 const [pending,start]=useTransition();
 const [message,setMessage]=useState('');
 const [enabled,setEnabled]=useState(active);
 return <section className="panel"><h2>Business signature authorization</h2><p><strong>Stacston Carter</strong> — Owner, Power Clean</p><p>Status: <strong>{enabled?'Authorized':'Not authorized'}</strong></p>
 <p>Authorization permits use of your signature only when you approve an individual customer document for sending. It does not approve documents automatically.</p>
 {!enabled&&<label style={{display:'flex',gap:10,alignItems:'start'}}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I am the owner of Power Clean and authorize electronic signing of individual documents that I expressly approve.</label>}
 <button type="button" disabled={pending||(!enabled&&!consent)} onClick={()=>start(async()=>{const r=await setSignatureAuthorization(!enabled);if(r.success){setEnabled(!enabled);setConsent(false);setMessage(enabled?'Authorization revoked.':'Authorization saved.');}else setMessage(r.error||'Unable to update authorization.');})}>{pending?'Saving…':enabled?'Revoke authorization':'Authorize signature'}</button>
 {message&&<p role="status">{message}</p>}
 </section>;
}
