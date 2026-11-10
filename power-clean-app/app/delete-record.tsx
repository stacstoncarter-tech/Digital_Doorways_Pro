'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {setRecordDeleted} from './record-actions';

export default function DeleteRecord({kind,id,label,restore=false,returnTo}:{kind:string;id:string;label:string;restore?:boolean;returnTo?:string}){
 const [confirming,setConfirming]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const router=useRouter();
 async function submit(){
  setBusy(true);setError('');
  try{
   const result=await setRecordDeleted(kind,id,!restore);
   if(result.error){setError(result.error);return;}
   setMessage(result.success||'Saved.');setConfirming(false);
   if(returnTo)router.push(returnTo);else router.refresh();
  }catch{setError('Could not save the change. Try again.');}finally{setBusy(false);}
 }
 return <div style={{marginTop:12,overflowWrap:'anywhere'}}>
  {!confirming?<button type="button" className="secondary" onClick={()=>setConfirming(true)} disabled={busy}>{restore?'Restore':`Delete ${kind}`}</button>:<div role="group" aria-label={`${restore?'Restore':'Delete'} ${label}`}>
   <p>{restore?'Restore':'Move to Trash:'} <strong>{label}</strong>{!restore&&<>? This removes it from active lists. Linked records, files, payments and signature history are kept. <Link href="/trash">Restore from Trash</Link>.</>}</p>
   <button type="button" disabled={busy} onClick={submit}>{busy?'Saving…':restore?'Confirm restore':'Move to Trash'}</button>{' '}
   <button type="button" disabled={busy} onClick={()=>setConfirming(false)}>Cancel</button>
  </div>}
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 </div>;
}
