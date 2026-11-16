'use client';
import {useActionState} from 'react';
import {addLead,updateLead} from './actions';
const initial={error:'',success:''};
const sources=['google','website','referral','door_hanger','yard_sign','social','repeat','other'];
const statuses=['new','contacted','estimate_needed','estimate_sent','won','lost'];
export function NewLead(){const [s,action,p]=useActionState(addLead,initial);return <details><summary>Add new lead</summary><form action={action} style={{display:'grid',gap:10,maxWidth:560,marginTop:12}}>
 <label>Name<input name="name" required maxLength={150}/></label><label>Email<input type="email" name="email" maxLength={200}/></label><label>Phone<input name="phone" maxLength={50}/></label><label>Service address<input name="service_address" maxLength={250}/></label>
 <label>Source<select name="source">{sources.map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>
 <label>Estimated opportunity ($)<input name="estimated_value" type="number" min="0" step=".01"/></label><label>Follow-up date and time<input name="follow_up_at" type="datetime-local"/></label><label>Notes<textarea name="notes" rows={3}/></label>
 <button disabled={p}>Save lead</button>{s.error&&<p role="alert">{s.error}</p>}{s.success&&<p role="status">{s.success}</p>}</form></details>}
export function EditLead({lead}:{lead:{id:string;status:string;notes:string;follow_up_at:string|null}}){const [s,action,p]=useActionState(updateLead,initial);return <details><summary>Update lead / follow-up</summary><form action={action} style={{display:'grid',gap:10,maxWidth:560,marginTop:12}}><input type="hidden" name="id" value={lead.id}/><label>Stage<select name="status" defaultValue={lead.status}>{statuses.map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label><label>Follow-up<input name="follow_up_at" type="datetime-local" defaultValue={lead.follow_up_at?new Date(lead.follow_up_at).toLocaleString('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).replace(' ','T'):''}/></label><label>Notes<textarea name="notes" rows={3} defaultValue={lead.notes}/></label><button disabled={p}>Save changes</button>{s.error&&<p role="alert">{s.error}</p>}{s.success&&<p role="status">{s.success}</p>}</form></details>}
