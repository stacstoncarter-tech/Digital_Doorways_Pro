import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {Checklist,PhotoUpload} from './field-controls';
export default async function JobDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();if(!member)notFound();
 const {data:job}=await supabase.from('jobs').select('id,status,customer_id,scheduled_start,notes').eq('id',id).eq('business_id',member.business_id).maybeSingle();if(!job)notFound();
 const [{data:items},{data:photos},{data:customer}]=await Promise.all([
 supabase.from('job_checklist_items').select('id,title,is_complete').eq('job_id',id).eq('business_id',member.business_id).order('created_at',{ascending:true}),
 supabase.from('job_photos').select('id,phase,caption,storage_path,created_at').eq('job_id',id).eq('business_id',member.business_id).order('created_at',{ascending:false}),
 supabase.from('customers').select('name').eq('id',job.customer_id).eq('business_id',member.business_id).maybeSingle()
 ]);
 const photoUrls=await Promise.all((photos||[]).map(async p=>({...p,url:(await supabase.storage.from('power-clean-job-photos').createSignedUrl(p.storage_path,600)).data?.signedUrl||null})));
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / FIELD WORK</span><h1>{customer?.name||'Job'} — Field Report</h1><p>{job.status.replaceAll('_',' ')} · {job.scheduled_start?new Date(job.scheduled_start).toLocaleString('en-US'):'Unscheduled'}</p></div><Link href="/jobs">All jobs</Link></header>
 <section className="panel"><h2>Customer service report</h2><p>Generate a branded before-and-after photo report with checklist details. Use Print / Save as PDF to send the completed document to the customer.</p><Link href={"/jobs/"+id+"/report"}>Open printable photo report</Link></section><Checklist jobId={id} items={items||[]}/><PhotoUpload jobId={id}/>
 <section className="panel"><h2>Before / during / after gallery</h2>{photoUrls.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16}}>{photoUrls.map(p=><figure key={p.id} style={{margin:0}}>{p.url?<a href={p.url} target="_blank" rel="noopener noreferrer"><img src={p.url} alt={p.caption||p.phase+' job photo'} style={{width:'100%',height:200,objectFit:'cover',borderRadius:8}}/></a>:<p>Photo unavailable</p>}<figcaption>{p.phase.toUpperCase()} · {p.caption}</figcaption></figure>)}</div>:<p>No photos uploaded yet.</p>}</section>
 </main>;
}
