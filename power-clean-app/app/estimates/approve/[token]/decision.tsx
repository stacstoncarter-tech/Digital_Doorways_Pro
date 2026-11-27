'use client';
import {useState,useTransition} from 'react';
import {respondToEstimate} from './actions';
export default function Decision({token}:{token:string}){
 const [pending,start]=useTransition(),[result,setResult]=useState(''),[error,setError]=useState('');
 function respond(response:'accepted'|'declined'){start(async()=>{setError('');const r=await respondToEstimate(token,response);if(r.success)setResult(response==='accepted'?'Estimate accepted. Thank you!':'Estimate declined. Thank you for responding.');else setError(r.error||'Unable to submit response.');});}
 return <section className="panel">{result?<p role="status"><strong>{result}</strong></p>:<><p>Review the services and total above, then choose your response. This decision does not replace a service agreement or liability waiver.</p><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button className="primary" type="button" disabled={pending} onClick={()=>respond('accepted')}>Accept estimate</button><button type="button" disabled={pending} onClick={()=>respond('declined')}>Decline estimate</button></div>{error&&<p role="alert">{error}</p>}</>}</section>;
}
