import {createClient} from '@/lib/supabase/server';
import SignatureForm from '../signature-form';
import {POWER_CLEAN_LOGO} from '@/lib/branding';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Power Clean | Customer Agreements',description:'Review and electronically sign your Power Clean customer agreements.',openGraph:{title:'Power Clean | Customer Agreements',description:'Secure customer agreement signing for Power Clean.',type:'website',images:[{url:'https://power-clean-operations.vercel.app/og-image?v=2',width:110,height:112,alt:'Power Clean company emblem'}]},twitter:{card:'summary_large_image',title:'Power Clean | Customer Agreements',images:['https://power-clean-operations.vercel.app/og-image?v=2']},robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function SigningPage({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[0-9a-f]{64}$/.test(token))return <main className="workspace"><h1>Invalid signing link</h1></main>;
 const supabase=await createClient();
 const {data,error}=await supabase.rpc('read_agreement_for_signing',{p_token:token});
 const doc=Array.isArray(data)?data[0]:null;
 const {data:ownerData}=doc?await supabase.rpc('read_owner_signature_for_signing',{p_token:token}):{data:null};
 const owner=Array.isArray(ownerData)?ownerData[0]:null;
 if(error||!doc)return <main className="workspace"><h1>Signing link unavailable</h1><p>This agreement may have expired or already been signed. Contact Power Clean for assistance.</p></main>;
 return <main className="workspace"><header className="workspace-header"><div><img src={POWER_CLEAN_LOGO} alt="Power Clean logo" style={{display:"block",maxWidth:350,width:"100%",height:"auto",marginBottom:16}}/><span className="eyebrow">POWER CLEAN / CUSTOMER DOCUMENTS</span><h1>{doc.agreement_title}</h1><p>Prepared for {doc.customer_name}</p></div></header>
 <section className="panel"><h2>Agreement</h2><div style={{whiteSpace:'pre-wrap',lineHeight:1.8}}>{doc.agreement_body}</div></section>
 {owner&&<section className="panel"><h2>Power Clean signature</h2>{owner.signature_image_data&&<img src={owner.signature_image_data} alt="Power Clean owner handwritten signature" style={{width:'100%',maxWidth:360,height:'auto'}}/>}<p><strong>{owner.signer_name}</strong> — {owner.signer_title}</p><p>Electronically signed: {new Date(owner.signed_at).toLocaleString('en-US')}</p></section>}
 <SignatureForm token={token}/></main>;
}
