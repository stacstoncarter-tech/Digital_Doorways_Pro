'use client';
import {useState,useTransition} from 'react';
import Link from 'next/link';
import {invoiceCompletedJob} from '@/app/invoices/actions';
export default function CreateInvoiceButton({jobId}:{jobId:string}){
 const [pending,start]=useTransition(),[error,setError]=useState(''),[done,setDone]=useState(false);
 return <div style={{marginTop:12}}>{done?<p role="status">Invoice created. <Link href="/invoices">Open Invoices</Link></p>:<><button disabled={pending} onClick={()=>start(async()=>{const r=await invoiceCompletedJob(jobId);setError(r.error||'');setDone(!!r.success);})}>{pending?'Creating…':'Create invoice from completed job'}</button>{error&&<p role="alert">{error}</p>}</>}</div>;
}
