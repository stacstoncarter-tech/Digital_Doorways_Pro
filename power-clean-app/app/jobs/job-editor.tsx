'use client';
import {useActionState} from 'react';
import {updateJob} from './actions';
type Job={id:string;status:string;notes:string;scheduled_start:string|null;scheduled_end:string|null};
const local=(v:string|null)=>v?new Date(v).toLocaleString('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).replace(' ','T'):'';
export default function JobEditor({job}:{job:Job}){
 const [state,action,pending]=useActionState(updateJob,{error:'',success:''});
 return <details><summary>Edit schedule and status</summary><form action={action} style={{display:'grid',gap:12,maxWidth:600,marginTop:12}}>
 <input type="hidden" name="id" value={job.id}/>
 <label>Status<select name="status" defaultValue={job.status}>{['unscheduled','scheduled','in_progress','completed','canceled'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></label>
 <label>Service start<input type="datetime-local" name="start" defaultValue={local(job.scheduled_start)}/></label>
 <label>Service end / arrival window<input type="datetime-local" name="end" defaultValue={local(job.scheduled_end)}/></label>
 <label>Internal job notes<textarea name="notes" maxLength={4000} defaultValue={job.notes} rows={3}/></label>
 <button className="primary" disabled={pending}>Save job</button>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}
 </form></details>;
}
