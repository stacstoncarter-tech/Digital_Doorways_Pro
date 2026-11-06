'use client';
import {useActionState} from 'react';
import {addAddress,addNote,type CustomerActionState} from './actions';
const initial:CustomerActionState={error:'',success:''};
export default function CustomerEditors({customerId,canEdit}:{customerId:string;canEdit:boolean}){
 const [addressState,addressAction,addressPending]=useActionState(addAddress,initial);
 const [noteState,noteAction,notePending]=useActionState(addNote,initial);
 if(!canEdit)return <p className="muted">Read-only customer access.</p>;
 return <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20}}>
 <section className="panel"><h2>Add service property</h2><form action={addressAction}>
 <input type="hidden" name="customerId" value={customerId}/>
 <label>Property label<input name="label" maxLength={80} required placeholder="Home, rental, storefront"/></label>
 <label>Service address<input name="address" maxLength={240} required placeholder="Street, city, state, ZIP"/></label>
 <button className="primary" disabled={addressPending}>Save property</button>
 {addressState.error&&<p role="alert">{addressState.error}</p>}{addressState.success&&<p role="status">{addressState.success}</p>}
 </form></section>
 <section className="panel"><h2>Add customer note</h2><form action={noteAction}>
 <input type="hidden" name="customerId" value={customerId}/>
 <label>Internal note<textarea name="body" maxLength={4000} required rows={4} placeholder="Access instructions, preferences, follow-up details..." style={{width:'100%',padding:12,border:'1px solid #cfdfe7',borderRadius:9}}/></label>
 <button className="primary" disabled={notePending}>Save note</button>
 {noteState.error&&<p role="alert">{noteState.error}</p>}{noteState.success&&<p role="status">{noteState.success}</p>}
 </form></section></div>;
}
