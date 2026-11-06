'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {addDraftService,removeDraftService} from './item-actions';
export default function ServiceControls({estimateId,itemId}:{estimateId:string;itemId?:string}){
 const [pending,start]=useTransition();
 const [message,setMessage]=useState('');
 const router=useRouter();
 return <span style={{display:'inline-flex',gap:8,alignItems:'center',marginTop:8}}>
 <button type="button" disabled={pending} onClick={()=>start(async()=>{
 const result=itemId?await removeDraftService(estimateId,itemId):await addDraftService(estimateId);
 if(result.success){setMessage('Saved.');router.refresh();}else setMessage(result.error||'Unable to save.');
 })}>{pending?'Saving…':itemId?'Remove service':'+ Add service'}</button>
 {message&&<small role="status">{message}</small>}
 </span>;
}
