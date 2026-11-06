'use client';
import {useState} from 'react';
export default function SendReport({customerEmail,customerPhone,test}:{customerEmail:string;customerPhone:string;test:boolean}){
 const [file,setFile]=useState<File|null>(null),[error,setError]=useState('');
 const subject=(test?'TEST ONLY — ':'')+'Power Clean Service & Photo Report';
 const message=(test?'TEST ONLY — demonstration report, not a record of real work.\n\n':'')+'Hello,\n\nAttached is your Power Clean service report with job photos, observations, and checklist details.\n\nQuestions? (352) 665-4527\nPower Clean';
 const share=async()=>{if(!file)return;setError('');try{if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:subject,text:message,files:[file]});}else setError('File sharing is unavailable in this browser. Use the email draft below and attach the saved PDF manually.');}catch(e){if((e as Error).name!=='AbortError')setError('Unable to share the PDF. Attach it to the email draft instead.');}};
 return <section className="invoice-no-print panel" style={{marginTop:16}}><h2>Send this report to the customer</h2><p>Save the report using Print / Save PDF, then select the saved PDF below. On supported devices, Share PDF opens the system sharing menu with the file attached. Otherwise open the email draft and attach the PDF yourself.</p>
 <label>Choose saved report PDF <input type="file" accept="application/pdf,.pdf" onChange={e=>{const f=e.target.files?.[0]||null;setFile(f?.type==='application/pdf'||f?.name.toLowerCase().endsWith('.pdf')?f:null);setError(f&&!(f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf'))?'Choose a PDF file.':'');}}/></label>
 <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}><button type="button" disabled={!file} onClick={share}>Share PDF file</button>
 {customerEmail?<a href={'mailto:'+encodeURIComponent(customerEmail)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message)}>Open customer email draft</a>:<span>Add customer email to enable email draft</span>}
 {customerPhone?<a href={'sms:'+customerPhone.replace(/[^\d+]/g,'')+'?body='+encodeURIComponent(subject+'\n'+message)}>Open text draft</a>:null}
 <button type="button" onClick={()=>navigator.clipboard.writeText(subject+'\n\n'+message)}>Copy message</button></div>
 {error&&<p role="alert">{error}</p>}<small>Email and text drafts do not attach the PDF automatically. Do not send customer information to an unintended recipient.</small></section>;
}
