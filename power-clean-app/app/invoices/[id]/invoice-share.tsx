'use client';
export default function InvoiceShare({number,email,total,balance,test}:{number:string;email:string;total:number;balance:number;test:boolean}){
 const fmt=(v:number)=>v.toLocaleString('en-US',{style:'currency',currency:'USD'});
 const subject=(test?'TEST ONLY — ':'')+'Power Clean Invoice '+number;
 const message=(test?'TEST ONLY — demonstration invoice; no payment is due.\n\n':'')+'Hello,\n\nYour Power Clean invoice '+number+' is ready.\nTotal: '+fmt(total)+'\nBalance recorded: '+fmt(balance)+'\n\nPlease find the attached invoice PDF. Contact Power Clean at (352) 665-4527 with questions.\n\nThank you,\nPower Clean';
 return <section className="invoice-no-print" style={{marginTop:20,padding:16,border:'1px solid #ddd',borderRadius:8}}><h3>Send invoice to customer</h3><p>First select Print / Save PDF above, save the invoice, then attach that PDF to your email draft. Opening the draft does not send it or collect payment.</p><div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{email?<a href={'mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message)}>Open customer email draft</a>:<span>Add customer email to enable sending</span>}<button type="button" onClick={()=>navigator.clipboard.writeText(subject+'\n\n'+message)}>Copy invoice message</button></div></section>;
}
