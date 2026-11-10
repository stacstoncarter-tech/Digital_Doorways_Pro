'use client';
import {useState} from 'react';
import {extractMeasurements,type ImageMeasurement} from '@/lib/smart-estimate/image-measurements';
export default function ImageMeasurements({onApply}:{onApply:(m:ImageMeasurement)=>void}){
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[text,setText]=useState(''),[reviewed,setReviewed]=useState(false),[selected,setSelected]=useState(-1);
 const candidates=extractMeasurements(text);
 async function read(file?:File){
  if(!file)return;
  setText('');setReviewed(false);setSelected(-1);
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){setStatus('Choose a JPEG, PNG or WebP image up to 10 MB.');return;}
  setBusy(true);setStatus('Loading image reader…');
  let worker:Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>|undefined;
  try{
   const {createWorker}=await import('tesseract.js');
   worker=await createWorker('eng',1,{logger:m=>setStatus(m.status+(m.progress?` ${Math.round(m.progress*100)}%`:''))});
   const result=await worker.recognize(file);
   setText(result.data.text.slice(0,20000));
   setStatus(`Image read (${Math.round(result.data.confidence)}% OCR confidence). Verify every measurement against the original image.`);
  }catch{setStatus('Image reading failed. Try a clearer crop, or type the labels below.');}
  finally{if(worker)await worker.terminate();setBusy(false);}
 }
 return <details className="panel"><summary>Read square footage from an image</summary>
 <p>Choose a screenshot, plan or photo containing written square-footage numbers or dimensions. Reading happens on this device; the image is not uploaded or saved. A surface photo without measurement labels cannot establish its size.</p>
 <label>Measurement image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>void read(e.target.files?.[0])}/></label>
 {status&&<p role="status">{status}</p>}
 <label>Review or correct image text<textarea value={text} maxLength={20000} disabled={busy} placeholder={'Example: Driveway 1,250 sq ft or 20 ft 6 in × 30 ft'} onChange={e=>{setText(e.target.value);setSelected(-1);setReviewed(false);}}/></label>
 {text&&!candidates.length&&<p>No explicit square-footage labels or feet-and-inches dimensions found. Correct the text or measure the surface manually.</p>}
 <label>Measurement to use<select value={selected} onChange={e=>{setSelected(Number(e.target.value));setReviewed(false);}} disabled={busy}><option value={-1}>Choose one measurement</option>{candidates.map((m,i)=><option key={i} value={i}>{m.text} — {m.squareFeet.toFixed(2)} sq ft</option>)}</select></label>
 <label><input type="checkbox" checked={reviewed} disabled={selected<0||busy} onChange={e=>setReviewed(e.target.checked)}/> I checked this measurement against the image and confirmed it describes this treatment area.</label>
 <button type="button" disabled={busy||!reviewed||!candidates[selected]} onClick={()=>{onApply(candidates[selected]);setReviewed(false);setStatus('Confirmed measurement applied to this area. Save the draft to retain it.');}}>Apply confirmed measurement</button>
 </details>;
}
