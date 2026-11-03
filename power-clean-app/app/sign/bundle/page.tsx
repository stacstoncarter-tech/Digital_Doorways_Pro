import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {POWER_CLEAN_LOGO} from '@/lib/branding';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Power Clean | Customer Agreements',description:'Review and electronically sign your Power Clean customer agreements.',openGraph:{title:'Power Clean | Customer Agreements',description:'Secure customer agreement signing for Power Clean.',type:'website',images:[{url:'https://power-clean-operations.vercel.app/og-image?v=2',width:110,height:112,alt:'Power Clean company emblem'}]},twitter:{card:'summary_large_image',title:'Power Clean | Customer Agreements',images:['https://power-clean-operations.vercel.app/og-image?v=2']},robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function BundlePage({searchParams}:{searchParams:Promise<{service?:string;liability?:string}>}){
 const {service='',liability=''}=await searchParams;
 if(!/^[0-9a-f]{64}$/.test(service)||!/^[0-9a-f]{64}$/.test(liability))return <main className="workspace"><h1>Invalid signing link</h1></main>;
 const supabase=await createClient();
 const [a,b]=await Promise.all([supabase.rpc('read_agreement_for_signing',{p_token:service}),supabase.rpc('read_agreement_for_signing',{p_token:liability})]);
 const docA=Array.isArray(a.data)?a.data[0]:null;
 const docB=Array.isArray(b.data)?b.data[0]:null;
 return <main className="workspace"><header className="workspace-header"><div><img src={POWER_CLEAN_LOGO} alt="Power Clean" style={{maxWidth:280,width:'100%',height:'auto'}}/><h1>Power Clean — Your two agreements</h1><p>Review and sign each document individually. You may return to this page between signatures.</p></div></header>
 <section className="panel"><h2>1. Service Agreement</h2><p>{docA?'Ready for your review and signature.':'Already signed or link expired.'}</p>{docA&&<Link href={'/sign/'+service}>Review and sign Service Agreement</Link>}</section>
 <section className="panel"><h2>2. Property Condition & Liability Acknowledgment</h2><p>{docB?'Ready for your review and signature.':'Already signed or link expired.'}</p>{docB&&<Link href={'/sign/'+liability}>Review and sign Liability Acknowledgment</Link>}</section>
 <p>Both signatures are required to complete your paperwork. If either link has expired, contact Power Clean for a new signing link.</p></main>;
}
