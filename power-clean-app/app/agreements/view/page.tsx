import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
export default async function AgreementView({searchParams}:{searchParams:Promise<{id?:string}>}){
 const {id}=await searchParams;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)redirect('/agreements');
 const {data:a}=await supabase.from('customer_agreements').select('id,title,body,status,signer_name,signed_at,signer_acknowledged,signed_document_sha256,signer_user_agent').eq('id',id||'00000000-0000-0000-0000-000000000000').eq('business_id',member.business_id).maybeSingle();
 const {data:audit}=a?await supabase.from('agreement_signature_events').select('event_type,signed_at,document_sha256').eq('agreement_id',a.id).maybeSingle():{data:null};
 if(!a)return <main className="workspace"><h1>Agreement not found</h1></main>;
 return <main className="workspace"><header><Link href="/agreements">Back to agreements</Link></header><section className="panel">
 <h1>{a.title}</h1><p>Power Clean · {a.status}</p><div style={{whiteSpace:'pre-wrap',lineHeight:1.8}}>{a.body}</div><hr/>
 {a.status==='signed'?<><h2>Signature record</h2><p>Signed by: {a.signer_name}</p><p>Signed: {a.signed_at?new Date(a.signed_at).toLocaleString('en-US'):'Unavailable'}</p><p>Consent: {a.signer_acknowledged?'Acknowledged':'Not recorded'}</p><p>Document SHA-256: {a.signed_document_sha256}</p><p>Signing browser: {a.signer_user_agent||'Not recorded'}</p></>:<p>Not signed</p>}
 <p>Reference: {a.id}</p>{audit&&<p>Audit event: {audit.event_type} · {new Date(audit.signed_at).toLocaleString('en-US')}</p>}<p>Use browser Print to save a PDF.</p></section></main>;
}
