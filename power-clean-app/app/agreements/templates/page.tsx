import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {SERVICE_TEMPLATE,LIABILITY_TEMPLATE} from '../templates';
export default async function AgreementTemplateLibrary(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)redirect('/agreements');
 const docs=[{title:'Pressure & Soft Washing Service Agreement',type:'service_contract',body:SERVICE_TEMPLATE},{title:'Property Protection & Liability Acknowledgment',type:'liability_release',body:LIABILITY_TEMPLATE}];
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / DOCUMENT LIBRARY</span><h1>Master Agreement Templates</h1><p>Reusable starting documents for service contracts and property-risk acknowledgments.</p></div><Link href="/agreements">Back to customer agreements</Link></header>
 <section className="panel"><h2>Before customer use</h2><p>These are editable master drafts, not executed customer agreements or attorney-approved legal forms. Replace every bracketed field, confirm the accepted estimate and scope, and obtain Florida legal review. Loading a master template does not send or sign it.</p></section>
 {docs.map(d=><section className="panel" key={d.type}><h2>{d.title}</h2><p><Link href={'/agreements?template='+d.type}>Create customer draft from this template</Link></p><details><summary>Read full master template</summary><div style={{whiteSpace:'pre-wrap',lineHeight:1.8,marginTop:16}}>{d.body}</div></details></section>)}
 </main>;
}
