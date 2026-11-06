import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {POWER_CLEAN_LOGO} from '@/lib/branding';
import PrintButton from '@/app/invoices/[id]/print-button';
export default async function PhotoReport({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();if(!member)notFound();
 const {data:job}=await supabase.from('jobs').select('id,customer_id,status,scheduled_start,completed_at,notes,service_address_id').eq('id',id).eq('business_id',member.business_id).maybeSingle();if(!job)notFound();
 const [{data:customer},{data:photos},{data:items}]=await Promise.all([
 supabase.from('customers').select('name,service_address').eq('id',job.customer_id).eq('business_id',member.business_id).maybeSingle(),
 supabase.from('job_photos').select('id,phase,caption,storage_path,created_at').eq('job_id',id).eq('business_id',member.business_id).order('created_at',{ascending:true}).limit(100),
 supabase.from('job_checklist_items').select('title,is_complete').eq('job_id',id).eq('business_id',member.business_id).order('created_at',{ascending:true})
 ]);
 const {data:address}=job.service_address_id?await supabase.from('customer_addresses').select('address').eq('id',job.service_address_id).eq('business_id',member.business_id).maybeSingle():{data:null};
 const {data:links}=photos?.length?await supabase.storage.from('power-clean-job-photos').createSignedUrls(photos.map(p=>p.storage_path),3600):{data:[]};
 const grouped=['before','during','after'].map(phase=>({phase,photos:(photos||[]).map((p,i)=>({...p,url:links?.[i]?.signedUrl||null})).filter(p=>p.phase===phase)}));
 const test=(job.notes||'').startsWith('[TEST ONLY — NOT AUTHORIZED FOR CUSTOMER WORK]');
 return <main className="workspace"><div className="invoice-no-print" style={{display:'flex',gap:16,marginBottom:18}}><Link href={'/jobs/'+id}>Back to field report</Link><PrintButton/></div>
 <article className="panel" style={{maxWidth:900,margin:'auto',padding:28}}>
 <header style={{borderBottom:'3px solid #168bd3',paddingBottom:16}}><img src={POWER_CLEAN_LOGO} alt="Power Clean" style={{maxWidth:260,width:'100%',height:'auto'}}/><h1>Service & Photo Report</h1>{test&&<h2>TEST ONLY — NOT A REAL SERVICE RECORD</h2>}</header>
 <p><strong>Customer:</strong> {customer?.name||'Customer'}</p><p><strong>Property:</strong> {address?.address||customer?.service_address||'Address not recorded'}</p>
 <p><strong>Job status:</strong> {job.status.replaceAll('_',' ')} · <strong>Scheduled:</strong> {job.scheduled_start?new Date(job.scheduled_start).toLocaleDateString('en-US'):'Not set'} · <strong>Completed:</strong> {job.completed_at?new Date(job.completed_at).toLocaleDateString('en-US'):'Not recorded'}</p>
 <section><h2>Service checklist</h2>{items?.length?<ul>{items.map((item,i)=><li key={i}>{item.is_complete?'✓':'○'} {item.title}</li>)}</ul>:<p>No checklist entries recorded.</p>}</section>
 {grouped.map(g=><section key={g.phase}><h2>{g.phase.toUpperCase()} photos</h2>{g.photos.length?<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:16}}>{g.photos.map(p=><figure key={p.id} style={{margin:0,breakInside:'avoid'}}>{p.url?<img src={p.url} alt={p.caption||g.phase+' photo'} style={{width:'100%',height:'auto',maxHeight:350,objectFit:'contain'}}/>:<p>Photo unavailable</p>}<figcaption>{p.caption||g.phase+' service photo'}</figcaption></figure>)}</div>:<p>No {g.phase} photos recorded.</p>}</section>)}
 <footer style={{marginTop:30,borderTop:'1px solid #aaa',paddingTop:14}}>Power Clean · (352) 665-4527 · pwr.wash.clean2026@gmail.com<p><small>Generated from recorded job information. Photos are not independent proof of work quality. Save as PDF while images are visible; temporary image links expire.</small></p></footer>
 </article><style>{'@media print {.invoice-no-print{display:none!important}body{background:white!important}main.workspace{padding:0!important;max-width:none!important}article.panel{border:0!important;box-shadow:none!important;max-width:none!important}section{break-inside:auto}figure{break-inside:avoid}}'}</style></main>;
}
