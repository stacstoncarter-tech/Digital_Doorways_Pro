'use client';
import {useActionState,useState,useTransition} from 'react';
import {addChecklistItem,toggleChecklistItem,uploadJobPhoto} from './actions';
type Item={id:string;title:string;is_complete:boolean};
export function Checklist({jobId,items}:{jobId:string;items:Item[]}){
 const [state,action,pending]=useActionState(addChecklistItem,{error:'',success:''});
 return <section className="panel"><h2>Field checklist</h2>{items.map(i=><ChecklistRow key={i.id} item={i} jobId={jobId}/>)}
 <form action={action} style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:12}}><input type="hidden" name="job_id" value={jobId}/><input name="title" placeholder="Add safety or service task" required maxLength={200}/><button disabled={pending}>Add task</button></form>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}</section>;
}
function ChecklistRow({jobId,item}:{jobId:string;item:Item}){const [pending,start]=useTransition(),[error,setError]=useState('');return <div><label><input type="checkbox" checked={item.is_complete} disabled={pending} onChange={e=>start(async()=>{const r=await toggleChecklistItem(jobId,item.id,e.target.checked);setError(r.error||'');})}/>{item.title}</label>{error&&<p role="alert">{error}</p>}</div>}
const hazardTypes=['Electrical / exposed wiring','Slip, trip or fall','Fragile surface / property damage','Chemical / plant exposure','Access obstruction','Water / drainage / runoff','People, pets or vehicles','Equipment or weather','Other'];
export function HazardLog({jobId,items}:{jobId:string;items:Item[]}){
 const [state,action,pending]=useActionState(addChecklistItem,{error:'',success:''});
 const [category,setCategory]=useState(hazardTypes[0]),[description,setDescription]=useState('');
 const hazards=items.filter(i=>i.title.startsWith('[HAZARD] '));
 return <section className="panel"><h2>Potential hazards & obstacles</h2><p>Record hazards, restricted access, property conditions, and issues that could prevent safe completion. Checked items indicate the issue has been resolved or addressed; never check an unresolved safety hazard.</p>
 {hazards.length?<ul>{hazards.map(i=><li key={i.id}><ChecklistRow jobId={jobId} item={i}/></li>)}</ul>:<p>No hazards or obstacles recorded yet. This does not certify the site is hazard-free.</p>}
 <form action={action} style={{display:'grid',gap:10,maxWidth:620}}><input type="hidden" name="job_id" value={jobId}/><input type="hidden" name="title" value={'[HAZARD] '+category+': '+description.trim()}/>
 <label>Hazard / obstacle category<select value={category} onChange={e=>setCategory(e.target.value)}>{hazardTypes.map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Location, condition and required action<input value={description} onChange={e=>setDescription(e.target.value)} maxLength={130} required placeholder="e.g. loose outlet near rear patio — isolate area"/></label>
 <button disabled={pending||!description.trim()||('[HAZARD] '+category+': '+description.trim()).length>200}>Add hazard / obstacle</button>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}
 </form></section>;
}
export function PhotoUpload({jobId}:{jobId:string}){const [state,action,pending]=useActionState(uploadJobPhoto,{error:'',success:''});return <section className="panel"><h2>Job photos</h2><form action={action} style={{display:'grid',gap:12,maxWidth:550}}><input type="hidden" name="job_id" value={jobId}/><label>Stage<select name="phase"><option value="before">Before</option><option value="during">During</option><option value="after">After</option></select></label><label>Photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required/></label><label>Caption<input name="caption" maxLength={300}/></label><button disabled={pending}>Upload photo</button>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}</form></section>}
