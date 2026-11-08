'use client';
import {useActionState} from 'react';
import {updateJob} from './actions';
import {serviceLocalTime} from '@/lib/schedule-time';
type Job={id:string;status:string;notes:string;scheduled_start:string|null;scheduled_end:string|null};

export default function JobEditor({job}:{job:Job}){
 const [state,action,pending]=useActionState(updateJob,{error:'',success:''});
 return <details><summary>Edit schedule and status</summary><form action={action} style={{display:'grid',gap:12,maxWidth:600,marginTop:12}}>
 <input type="hidden" name="id" value={job.id}/>
 <label>Status<select key={job.status} name="status" defaultValue={job.status}>{['unscheduled','scheduled','in_progress','completed','canceled'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></label>
 <p>All service times are Eastern (America/New_York). Before agreements are signed, leave status Unscheduled and save the proposed service dates below. This supplies the date for both agreements without authorizing work.</p>
 <label>Service start<input type="datetime-local" name="start" defaultValue={serviceLocalTime(job.scheduled_start)}/></label>
 <label>Service end / arrival window<input type="datetime-local" name="end" defaultValue={serviceLocalTime(job.scheduled_end)}/></label>
 <label>Internal job notes<textarea name="notes" maxLength={4000} defaultValue={job.notes} rows={3}/></label>
 <label style={{display:"flex",gap:8,alignItems:"start"}}><input type="checkbox" name="testScheduling" style={{width:"auto"}}/> TEST ONLY: schedule using signed test agreements (owner only; never authorizes customer work)</label>
 <button className="primary" disabled={pending}>Save job</button>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}
 </form></details>;
}
