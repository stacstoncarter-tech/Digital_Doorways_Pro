import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
export default async function CalendarPage({searchParams}:{searchParams:Promise<{month?:string}>}){
 const query=await searchParams;
 const now=new Date(),current=/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month||'')?query.month!:now.toISOString().slice(0,7);
 const [year,month]=current.split('-').map(Number),first=new Date(Date.UTC(year,month-1,1)),last=new Date(Date.UTC(year,month,0)),start=first.getUTCDay(),days=last.getUTCDate();
 const prev=new Date(Date.UTC(year,month-2,1)).toISOString().slice(0,7),next=new Date(Date.UTC(year,month,1)).toISOString().slice(0,7);
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();if(!member)return <main className="workspace"><h1>Access pending</h1></main>;
 const {data:jobs,error}=await supabase.from('jobs').select('id,customer_id,status,scheduled_start,scheduled_end').eq('business_id',member.business_id).gte('scheduled_start',current+'-01T00:00:00Z').lt('scheduled_start',next+'-01T00:00:00Z').order('scheduled_start').limit(500);
 const ids=[...new Set((jobs||[]).map(j=>j.customer_id))];
 const {data:customers}=ids.length?await supabase.from('customers').select('id,name').eq('business_id',member.business_id).in('id',ids):{data:[]};
 const names=new Map((customers||[]).map(c=>[c.id,c.name]));
 const grouped=new Map<number,typeof jobs>();
 for(const j of jobs||[]){if(!j.scheduled_start)continue;const d=Number(j.scheduled_start.slice(8,10));grouped.set(d,[...(grouped.get(d)||[]),j]);}
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / SCHEDULING</span><h1>Job Calendar</h1><p>{first.toLocaleDateString('en-US',{timeZone:'UTC',month:'long',year:'numeric'})}</p></div><Link href="/jobs">All jobs</Link></header>
 <section className="panel"><nav style={{display:'flex',justifyContent:'space-between',gap:16}}><Link href={'/jobs/calendar?month='+prev}>Previous month</Link><Link href={'/jobs/calendar?month='+next}>Next month</Link></nav>
 {error&&<p role="alert">Could not load scheduled jobs.</p>}
 <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:6,marginTop:16}}>
 {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><strong key={d} style={{textAlign:'center'}}>{d}</strong>)}
 {Array.from({length:start},(_,i)=><div key={'blank'+i}/>)}
 {Array.from({length:days},(_,i)=>{const day=i+1,dayJobs=grouped.get(day)||[];return <div key={day} style={{border:'1px solid #d9e1e9',borderRadius:8,padding:7,minHeight:105,minWidth:0}}><strong>{day}</strong>{dayJobs.map(j=><div key={j.id} style={{fontSize:12,overflowWrap:'anywhere',marginTop:6}}><Link href={'/jobs/'+j.id}>{new Date(j.scheduled_start!).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})} {names.get(j.customer_id)||'Customer'}</Link><div>{j.status.replaceAll('_',' ')}</div></div>)}</div>})}
 </div></section>
 <p className="muted">Calendar groups jobs by the UTC date of their scheduled start; verify local dates near midnight. Calendar displays up to 500 scheduled jobs per month.</p></main>;
}
