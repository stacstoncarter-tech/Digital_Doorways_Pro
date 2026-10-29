import {createClient} from '@/lib/supabase/server';
import SignatureForm from '../signature-form';
import type {Metadata} from 'next';
export const metadata:Metadata={robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function SigningPage({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[0-9a-f]{64}$/.test(token))return <main className="workspace"><h1>Invalid signing link</h1></main>;
 const supabase=await createClient();
 const {data,error}=await supabase.rpc('read_agreement_for_signing',{p_token:token});
 const doc=Array.isArray(data)?data[0]:null;
 if(error||!doc)return <main className="workspace"><h1>Signing link unavailable</h1><p>This agreement may have expired or already been signed. Contact Power Clean for assistance.</p></main>;
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / CUSTOMER DOCUMENTS</span><h1>{doc.agreement_title}</h1><p>Prepared for {doc.customer_name}</p></div></header>
 <section className="panel"><h2>Agreement</h2><div style={{whiteSpace:'pre-wrap',lineHeight:1.8}}>{doc.agreement_body}</div></section>
 <SignatureForm token={token}/></main>;
}
