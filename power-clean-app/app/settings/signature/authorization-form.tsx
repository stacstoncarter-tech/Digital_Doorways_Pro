'use client';
import {useState,useTransition} from 'react';
import {setSignatureAuthorization,saveSignatureArtwork} from './actions';
export default function AuthorizationForm({active,hasArtwork}:{active:boolean;hasArtwork:boolean}){
 const [consent,setConsent]=useState(false);
 const [pending,start]=useTransition();
 const [message,setMessage]=useState('');
 const [enabled,setEnabled]=useState(active);
 const [artworkSaved,setArtworkSaved]=useState(hasArtwork);
 return <section className="panel"><h2>Business signature authorization</h2><p><strong>Stacston Carter</strong> — Owner, Power Clean</p><p>Status: <strong>{enabled?'Authorized':'Not authorized'}</strong></p>
 <p>Authorization permits use of your signature only when you approve an individual customer document for sending. It does not approve documents automatically.</p>
 {!enabled&&<label style={{display:'flex',gap:10,alignItems:'start'}}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I am the owner of Power Clean and authorize electronic signing of individual documents that I expressly approve.</label>}
 <button type="button" disabled={pending||(!enabled&&!consent)} onClick={()=>start(async()=>{const r=await setSignatureAuthorization(!enabled);if(r.success){setEnabled(!enabled);setConsent(false);setMessage(enabled?'Authorization revoked.':'Authorization saved.');}else setMessage(r.error||'Unable to update authorization.');})}>{pending?'Saving…':enabled?'Revoke authorization':'Authorize signature'}</button>
 {enabled&&<div style={{marginTop:20}}><h3>Handwritten signature artwork</h3><p>{artworkSaved?'Signature artwork saved.':'Upload your signature image once. It will be attached only to agreements you individually approve for sending.'}</p><input type="file" accept="image/png,image/webp,image/jpeg" aria-label="Upload owner signature image" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setMessage('Preparing signature image…');try{const img=new Image();const url=URL.createObjectURL(file);img.onload=async()=>{try{const canvas=document.createElement('canvas');const scale=Math.min(1,1000/img.width);canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d')?.drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/webp',0.68);const result=await saveSignatureArtwork(data);setMessage(result.success?'Signature artwork saved.':result.error||'Upload failed.');if(result.success)setArtworkSaved(true);}finally{URL.revokeObjectURL(url);}};img.onerror=()=>{URL.revokeObjectURL(url);setMessage('Could not read image.');};img.src=url;}catch{setMessage('Unable to process image.');}}}/><p className="muted">Use the signature image without the printed name or copyright symbols.</p></div>}
 {message&&<p role="status">{message}</p>}
 </section>;
}
