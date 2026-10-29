'use client';
import {useState,useTransition} from 'react';
import {updateEstimateStatus} from './status-actions';
export default function EstimateStatus({id,initial}:{id:string;initial:string}){
 const [status,setStatus]=useState(initial);
 const [message,setMessage]=useState('');
 const [pending,start]=useTransition();
 function change(next:string){setMessage('');start(async()=>{const result=await updateEstimateStatus(id,next);if(result.success){setStatus(next);setMessage('Status updated.')}else setMessage(result.error||'Update failed.');});}
 return <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}><label htmlFor={'status-'+id}>Status</label><select id={'status-'+id} value={status} disabled={pending} onChange={e=>change(e.target.value)} style={{padding:8}}><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select>{pending&&<small>Saving…</small>}{message&&<small role="status">{message}</small>}</div>;
}
