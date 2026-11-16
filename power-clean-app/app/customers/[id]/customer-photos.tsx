'use client';
import {useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {deleteCustomerPhoto} from './photo-delete';
type Photo={name:string;url:string};
export default function CustomerPhotos({businessId,customerId,initialPhotos,canUpload}:{businessId:string;customerId:string;initialPhotos:Photo[];canUpload:boolean}){
 const [photos,setPhotos]=useState(initialPhotos);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [category,setCategory]=useState('before');
 async function upload(files:FileList|null){
  if(!files?.length)return;
  setBusy(true);setMessage('');
  const supabase=createClient();
  const added:Photo[]=[];
  for(const file of Array.from(files).slice(0,10)){
   if(!['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.type)||file.size>10*1024*1024){setMessage('Only JPEG, PNG, WebP or HEIC images up to 10 MB are allowed.');continue;}
   const extension=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif'} as Record<string,string>)[file.type];
   const name=businessId+'/'+customerId+'/'+category+'-'+crypto.randomUUID()+'.'+extension;
   const {error}=await supabase.storage.from('power-clean-customer-photos').upload(name,file,{contentType:file.type,upsert:false});
   if(error){setMessage('Upload failed: '+error.message);continue;}
   const {data}=await supabase.storage.from('power-clean-customer-photos').createSignedUrl(name,3600);
   if(data?.signedUrl)added.push({name,url:data.signedUrl});
  }
  setPhotos(prev=>[...added,...prev]);if(added.length)setMessage(added.length+' photo(s) uploaded.');setBusy(false);
 }
 async function removePhoto(path:string){if(!window.confirm('Permanently delete this customer photo? This cannot be undone.'))return;setBusy(true);setMessage('');const result=await deleteCustomerPhoto(customerId,path);if(result.error)setMessage(result.error);else{setPhotos(prev=>prev.filter(p=>p.name!==path));setMessage('Photo deleted.');}setBusy(false);}
 return <section className="panel"><h2>Customer property photos</h2><p className="muted">Private before, after, and condition documentation. Photos are visible only to authorized Power Clean staff. Uploading does not grant marketing permission.</p>
 {canUpload&&<div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',marginBottom:18}}><label>Photo type <select value={category} onChange={e=>setCategory(e.target.value)}><option value="before">Before</option><option value="after">After</option><option value="condition">Property condition</option><option value="other">Other</option></select></label><label>Upload customer photos <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple disabled={busy} onChange={e=>{void upload(e.target.files);e.target.value='';}}/></label></div>}
 {message&&<p role="status">{message}</p>}
 {photos.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12}}>{photos.map(p=><figure key={p.name} style={{margin:0}}><a href={p.url} target="_blank" rel="noopener noreferrer"><img src={p.url} alt="Customer property documentation" style={{width:'100%',height:140,objectFit:'cover',borderRadius:8}}/></a><figcaption style={{fontSize:12,overflowWrap:'anywhere'}}>{p.name.split('/').pop()?.split('-')[0]}</figcaption>{canUpload&&<button type="button" disabled={busy} onClick={()=>void removePhoto(p.name)} style={{marginTop:6}}>Delete photo</button>}</figure>)}</div>:<p>No customer photos uploaded yet.</p>}
 </section>;
}
