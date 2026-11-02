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
export function PhotoUpload({jobId}:{jobId:string}){const [state,action,pending]=useActionState(uploadJobPhoto,{error:'',success:''});return <section className="panel"><h2>Job photos</h2><form action={action} style={{display:'grid',gap:12,maxWidth:550}}><input type="hidden" name="job_id" value={jobId}/><label>Stage<select name="phase"><option value="before">Before</option><option value="during">During</option><option value="after">After</option></select></label><label>Photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required/></label><label>Caption<input name="caption" maxLength={300}/></label><button disabled={pending}>Upload photo</button>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}</form></section>}
