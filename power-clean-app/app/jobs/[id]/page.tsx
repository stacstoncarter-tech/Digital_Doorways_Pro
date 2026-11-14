import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {Checklist,PhotoUpload,HazardLog} from './field-controls';
import JobEditor from '../job-editor';
import PhotoDeleteButton from './photo-delete-button';
import CustomerShare from '../customer-share';
import CreateInvoiceButton from '../create-invoice-button';
export default async function JobDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();if(!member)notFound();
 const {data:job}=await supabase.from('jobs').select('id,status,customer_id,scheduled_start,scheduled_end,notes,estimate_id').is('deleted_at',null).eq('id',id).eq('business_id',member.business_id).maybeSingle();if(!job)notFound();
 const [{data:items},{data:photos},{data:customer}]=await Promise.all([
 supabase.from('job_checklist_items').select('id,title,is_complete').eq('job_id',id).eq('business_id',member.business_id).order('created_at',{ascending:true}),
 supabase.from('job_photos').select('id,phase,caption,storage_path,created_at').eq('job_id',id).eq('business_id',member.business_id).order('created_at',{ascending:false}),
 supabase.from('customers').select('name').eq('id',job.customer_id).eq('business_id',member.business_id).maybeSingle()
 ]);
 const photoUrls=await Promise.all((photos||[]).map(async p=>({...p,url:(await supabase.storage.from('power-clean-job-photos').createSignedUrl(p.storage_path,600)).data?.signedUrl||null})));
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / FIELD WORK</span><h1>{customer?.name||'Job'} — Field Report</h1><p>{job.status.replaceAll('_',' ')} · {job.scheduled_start?new Date(job.scheduled_start).toLocaleString('en-US',{timeZone:'America/New_York'}):'Unscheduled'}</p></div><Link href="/jobs">All jobs</Link></header>
 <nav className="job-step-nav print-hide" aria-label="Job workflow"><a href="#job-schedule">1. Schedule</a><a href="#job-field">2. Field work</a><a href="#job-hazards">3. Hazards</a><a href="#job-photos">4. Photos</a><a href="#job-deliver">5. Send report</a><a href="#job-payment">6. Invoice</a></nav>
 <section className="panel" id="job-schedule"><h2>1 · Schedule & confirm</h2><JobEditor job={job}/>{['scheduled','in_progress','completed'].includes(job.status)&&<CustomerShare jobId={id}/>}</section>
 <div id="job-field"><Checklist jobId={id} items={(items||[]).filter(i=>!i.title.startsWith('[HAZARD] '))}/></div><div id="job-hazards"><HazardLog jobId={id} items={items||[]}/></div><div id="job-photos"><PhotoUpload jobId={id}/>
 </div><section className="panel"><h2>Before / during / after gallery</h2>{photoUrls.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16}}>{photoUrls.map(p=><figure key={p.id} style={{margin:0}}>{p.url?<a href={p.url} target="_blank" rel="noopener noreferrer"><img src={p.url} alt={p.caption||p.phase+' job photo'} style={{width:'100%',height:200,objectFit:'cover',borderRadius:8}}/></a>:<p>Photo unavailable</p>}<figcaption>{p.phase.toUpperCase()} · {p.caption}</figcaption><PhotoDeleteButton jobId={id} photoId={p.id}/></figure>)}</div>:<p>No photos uploaded yet.</p>}</section>
 <section className="panel" id="job-deliver"><h2>5 · Customer service report</h2><p>Generate a branded before-and-after photo report with checklist details. Use Print / Save as PDF to send the completed document to the customer.</p><Link href={"/jobs/"+id+"/report"}>Open printable photo report</Link></section><section className="panel" id="job-payment"><h2>6 · Invoice & payment</h2>{job.status==='completed'&&job.estimate_id?<CreateInvoiceButton jobId={id}/>:<p>Mark this job completed in Schedule & confirm to create an invoice from its accepted estimate.</p>}<p><Link href="/invoices">Open invoices & payments</Link></p></section></main>;
}
