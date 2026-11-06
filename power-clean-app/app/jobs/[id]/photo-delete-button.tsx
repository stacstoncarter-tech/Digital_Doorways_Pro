'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {deleteJobPhoto} from './actions';
export default function PhotoDeleteButton({jobId,photoId}:{jobId:string;photoId:string}){
 const [pending,start]=useTransition();
 const [error,setError]=useState('');
 const router=useRouter();
 return <div><button type="button" disabled={pending} onClick={()=>{
  if(!window.confirm('Permanently delete this job photo? This cannot be undone.'))return;
  setError('');
  start(async()=>{try{const result=await deleteJobPhoto(jobId,photoId);if(result.error)setError(result.error);else router.refresh();}catch{setError('Deletion failed. Try again.');}});
 }}>{pending?'Deleting…':'Delete photo'}</button>{error&&<p role="alert">{error}</p>}</div>;
}
