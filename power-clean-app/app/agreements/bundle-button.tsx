'use client';
import Link from 'next/link';
import {useState,useTransition} from 'react';
import {prepareAgreementBundle,testRollbackSafeguard} from './bundle-actions';
import {getPublicAppUrl} from '@/lib/public-app-url';
export default function BundleButton({customerId,name,email,phone}:{customerId:string;name:string;email?:string|null;phone?:string|null}){
 const [pending,start]=useTransition();
 const [link,setLink]=useState('');
 const [preparedTest,setPreparedTest]=useState(false);
 const [error,setError]=useState('');
 const [rollbackResult,setRollbackResult]=useState('');
 const message='Hello '+name+', please review and electronically sign both Power Clean agreements: '+link;
 const prepare=(testing:boolean)=>start(async()=>{
  if(!window.confirm(testing?'Prepare two TEST ONLY signing documents for this disposable customer? No services or payment are authorized.':'Confirm you have reviewed and approved BOTH customer agreements. Missing documents will be created from the current templates. Nothing is emailed or texted automatically. Continue?'))return;
  setError('');setLink('');setPreparedTest(testing);
  try{const result=await prepareAgreementBundle(customerId,testing);if(result.serviceToken&&result.liabilityToken){const p=new URLSearchParams({service:result.serviceToken,liability:result.liabilityToken});setLink(getPublicAppUrl()+'/sign/bundle?'+p.toString());}else setError(result.error||'Could not prepare both agreements.');}catch{setError('The signing bundle could not be prepared. Please try again.');}
 });
 return <div style={{display:'grid',gap:8,marginBottom:12,maxWidth:650}}>
 <p><strong>Selected customer: {name}</strong></p>
 <p className="muted">The cancellation deadline is calculated from the actual signing date. The separate 72-hour scheduling notice policy remains in the Service Agreement.</p>
 <button type="button" disabled={pending} onClick={()=>prepare(false)}>{pending?'Preparing documents…':'Prepare both customer agreements'}</button>
 <button type="button" disabled={pending} onClick={()=>prepare(true)}>Prepare TEST ONLY pair</button>
 <small>For a signing test, select a disposable test customer and use TEST ONLY. No accepted estimate, price, or service date is needed. Nothing is sent.</small>
 <div style={{borderTop:'1px solid #dce8ee',paddingTop:12,marginTop:10}}><strong>Admin safety check</strong><p style={{fontSize:13}}>Creates a TEST ONLY document, deliberately simulates the second agreement failing, and checks that the first signing link is revoked. Does not modify real agreements.</p><button type="button" disabled={pending} onClick={()=>start(async()=>{setRollbackResult('');try{const r=await testRollbackSafeguard(customerId);setRollbackResult(r.passed?'PASS — First link prepared; second agreement failure simulated; first document reset to Draft; old signing token rejected. Test record: '+r.testAgreementId:'FAIL — '+(r.error||'Rollback verification incomplete')+(r.testAgreementId?' (test record '+r.testAgreementId+')':''));}catch{setRollbackResult('FAIL — Test could not complete.')}})}>Test rollback safeguard</button>{rollbackResult&&<p role="status" style={{fontWeight:700,color:rollbackResult.startsWith('PASS')?'#176b42':'#a12828'}}>{rollbackResult}</p>}</div>
 {error&&<div role="alert"><p style={{fontWeight:600}}>{error}</p><p><Link href={'/customers/'+customerId}>Review {name}’s record</Link> · <Link href="/estimates/history">Review estimates</Link> · <Link href="/jobs">Save proposed service date</Link></p><p>For real agreements: accept the correct priced estimate, create its job, and save the proposed dates with status Unscheduled before preparing agreements. For a signing test, use Prepare TEST ONLY pair above.</p></div>}
 {link&&<div style={{display:'grid',gap:8}}><p>{preparedTest?'TEST ONLY — Both test documents are prepared. No services, payment, or liability waiver is authorized.':'Both customer agreements are prepared.'} Included: Service Agreement and Property Condition & Liability Acknowledgment. Nothing has been sent. Review both documents using this single link:</p><input readOnly aria-label="Combined customer signing link" value={link}/><button type="button" onClick={()=>navigator.clipboard.writeText(link)}>Copy signing link</button>{!preparedTest&&email&&<a href={'mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent('Power Clean — two agreements for signature')+'&body='+encodeURIComponent(message)}>Open email draft</a>}{!preparedTest&&phone&&<a href={'sms:'+encodeURIComponent(phone)+'?body='+encodeURIComponent(message)}>Open text message draft</a>}<small>Copy signing link copies the URL only. Open email/text draft opens a message you must send yourself. The customer signs both documents in sequence.</small></div>}
 </div>;
}
