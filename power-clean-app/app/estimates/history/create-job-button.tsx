'use client';
import {useState,useTransition} from 'react';
import Link from 'next/link';
import {createJobFromEstimate} from '@/app/jobs/actions';
export default function CreateJobButton({estimateId}:{estimateId:string}){
 const [pending,start]=useTransition(),[message,setMessage]=useState(''),[ok,setOk]=useState(false);
 return <div style={{margin:'12px 0'}}>{ok?<p role="status">Job created. <Link href="/jobs">Open Jobs & Scheduling</Link></p>:<><button disabled={pending} type="button" onClick={()=>start(async()=>{const r=await createJobFromEstimate(estimateId);setOk(!!r.success);setMessage(r.error||'');})}>{pending?'Creating…':'Create job from accepted estimate'}</button>{message&&<p role="alert">{message}</p>}</>}</div>;
}
