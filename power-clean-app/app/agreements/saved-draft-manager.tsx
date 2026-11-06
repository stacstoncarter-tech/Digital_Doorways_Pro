'use client';
import {useState,useTransition} from 'react';
import {deleteSelectedDrafts} from './delete-drafts';
type Draft={id:string;title:string;customerName:string;createdAt:string};
export default function SavedDraftManager({drafts}:{drafts:Draft[]}){
 const [selected,setSelected]=useState<string[]>([]);
 const [pending,start]=useTransition();
 const [message,setMessage]=useState('');
 const [deleted,setDeleted]=useState<string[]>([]);
 const available=drafts.filter(d=>!deleted.includes(d.id));
 const allSelected=available.length>0&&available.every(d=>selected.includes(d.id));
 return <section className="panel"><h2>Saved drafts — delete selected</h2><p className="muted">Select unwanted unsigned drafts and delete them together. Sent and signed agreements cannot be deleted here.</p>
 {!available.length?<p>No unsigned saved drafts available for deletion.</p>:<>
 <label style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={allSelected} onChange={e=>setSelected(e.target.checked?available.map(d=>d.id):[])}/> Select all {available.length} drafts</label>
 <ul style={{listStyle:'none',padding:0}}>{available.map(d=><li key={d.id} style={{padding:'10px 0',borderBottom:'1px solid #ddd'}}><label style={{display:'flex',gap:10,alignItems:'flex-start'}}><input type="checkbox" checked={selected.includes(d.id)} onChange={e=>setSelected(old=>e.target.checked?[...old,d.id]:old.filter(id=>id!==d.id))}/><span><strong>{d.title}</strong> — {d.customerName} — {new Date(d.createdAt).toLocaleDateString('en-US')}</span></label></li>)}</ul>
 <button type="button" disabled={pending||!selected.length} onClick={()=>{
  if(!window.confirm('Permanently delete '+selected.length+' selected unsigned agreement draft(s)? This cannot be undone.'))return;
  setMessage('');
  start(async()=>{try{const result=await deleteSelectedDrafts(selected);if(result.error)setMessage(result.error);else{setDeleted(old=>[...old,...selected]);setSelected([]);setMessage(result.deleted+' draft(s) permanently deleted.');}}catch(e){setMessage('Deletion failed: '+(e instanceof Error?e.message:'Unexpected error'));}});
 }}>{pending?'Deleting…':'Delete selected drafts ('+selected.length+')'}</button>
 </>}
 {message&&<p role="status">{message}</p>}
 </section>;
}
