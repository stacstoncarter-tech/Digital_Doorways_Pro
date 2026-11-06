'use client';
import {useState,useTransition} from 'react';
import {updateEstimateItem} from './item-actions';
type Item={id:string;description:string;pricing_mode:string;square_feet:number|null;rate:number|null;fixed_price:number|null};
export default function ServiceEditor({estimateId,item}:{estimateId:string;item:Item}){
 const [description,setDescription]=useState(item.description);
 const [mode,setMode]=useState<'area'|'fixed'>(item.pricing_mode==='fixed'?'fixed':'area');
 const [squareFeet,setSquareFeet]=useState(String(item.square_feet??0));
 const [rate,setRate]=useState(String(item.rate??0));
 const [fixedPrice,setFixedPrice]=useState(String(item.fixed_price??0));
 const [pending,start]=useTransition();
 const [message,setMessage]=useState('');
 return <details style={{marginTop:10}}><summary>Edit service: {item.description}</summary><div style={{display:'grid',gap:10,maxWidth:460,marginTop:12}}>
 <label>Description<input value={description} onChange={e=>setDescription(e.target.value)} style={{display:'block',padding:8,width:'100%'}}/></label>
 <label>Pricing method<select value={mode} onChange={e=>setMode(e.target.value as 'area'|'fixed')} style={{display:'block',padding:8}}><option value="area">Square feet × rate</option><option value="fixed">Fixed price</option></select></label>
 {mode==='area'?<><label>Square feet<input type="number" min="0" step="0.01" value={squareFeet} onChange={e=>setSquareFeet(e.target.value)} style={{display:'block',padding:8}}/></label><label>Rate ($/sq ft)<input type="number" min="0" step="0.0001" value={rate} onChange={e=>setRate(e.target.value)} style={{display:'block',padding:8}}/></label></>:<label>Fixed price ($)<input type="number" min="0" step="0.01" value={fixedPrice} onChange={e=>setFixedPrice(e.target.value)} style={{display:'block',padding:8}}/></label>}
 <button type="button" disabled={pending} onClick={()=>start(async()=>{const result=await updateEstimateItem({id:item.id,estimateId,description,mode,squareFeet:Number(squareFeet),rate:Number(rate),fixedPrice:Number(fixedPrice)});setMessage(result.success?'Service updated.':result.error||'Update failed.');})}>{pending?'Saving…':'Save service'}</button>
 {message&&<p role="status">{message}</p>}</div></details>;
}
