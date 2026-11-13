'use client';

import Link from 'next/link';
import {useState,useTransition} from 'react';
import {createJobFromEstimate} from '@/app/jobs/actions';

export default function CreateJobButton({estimateId}:{estimateId:string}){
 const [jobId,setJobId]=useState('');
 const [message,setMessage]=useState('');
 const [pending,start]=useTransition();

 function createJob(){
  setMessage('');
  start(async()=>{
   try{
    const result=await createJobFromEstimate(estimateId);
    if(result.jobId)setJobId(result.jobId);
    else setMessage(result.error||'Could not open the job. Try again.');
   }catch{
    setMessage('Could not reach the server. Try again.');
   }
  });
 }

 return <div style={{margin:'12px 0'}}>
  {jobId?<p role="status">Job ready. <Link href={'/jobs/'+jobId+'#job-schedule'}>Open job and set service dates</Link></p>:
   <button disabled={pending} type="button" onClick={createJob}>{pending?'Opening job…':'Create or open job'}</button>}
  {message&&<p role="alert">{message}</p>}
 </div>;
}
