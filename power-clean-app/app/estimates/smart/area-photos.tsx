"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PhotoStrip({folder, names}: {folder:string; names:string[]}) {
  const [urls,setUrls]=useState<string[]>([]);
  const key=names.join(",");
  useEffect(()=>{
    let active=true;
    async function refresh(){
      if(!key) {setUrls([]); return;}
      const {data}=await createClient().storage.from("power-clean-customer-photos")
        .createSignedUrls(key.split(",").map(name=>folder+"/"+name),3600);
      if(active) setUrls((data??[]).map(photo=>photo.signedUrl??""));
    }
    void refresh();
    const timer=setInterval(refresh,50*60000);
    return ()=>{active=false;clearInterval(timer);};
  },[folder,key]);
  return <div>{names.map((name,i)=>urls[i] && <img key={name} src={urls[i]} alt={name.split("-")[0]+" treatment area"} width={150} style={{maxWidth:"30%",height:"auto",marginRight:6}}/>)}</div>;
}
export function AreaPhotos({folder,names,change,setBusy}: {folder:string;names:string[];change:(names:string[])=>void;setBusy:(busy:boolean)=>void}) {
  const [phase,setPhase]=useState("before"),[message,setMessage]=useState("");
  async function upload(files: File[]) {
    if(!files.length)return;
    if(files.length+names.length>3){setMessage("Choose up to three photos per area.");return;}
    setBusy(true);
    const added:string[]=[];
    try {
      for(const file of files){
        if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>10*1024*1024)throw Error("Choose JPEG, PNG or WebP images up to 10 MB.");
        const bitmap=await createImageBitmap(file);
        const scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
        const canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
        const ctx=canvas.getContext("2d");
        if(!ctx)throw Error("Image conversion unavailable.");
        ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
        const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",0.85));
        if(!blob)throw Error("Image conversion failed.");
        const name=phase+"-"+crypto.randomUUID()+".jpg";
        const {error}=await createClient().storage.from("power-clean-customer-photos").upload(folder+"/"+name,blob,{contentType:"image/jpeg"});
        if(error)throw Error(error.message);
        const preview=document.createElement("canvas");
        const shrink=Math.min(1,400/Math.max(canvas.width,canvas.height));
        preview.width=Math.max(1,Math.round(canvas.width*shrink));preview.height=Math.max(1,Math.round(canvas.height*shrink));
        preview.getContext("2d")!.drawImage(canvas,0,0,preview.width,preview.height);
        const [business_id,customer_id]=folder.split("/");
        const {error:copyError}=await createClient().from("estimate_photo_copies").insert({
          business_id,customer_id,name,jpeg:preview.toDataURL("image/jpeg",0.67).split(",")[1]
        });
        if(copyError)throw Error("Photo saved in customer gallery, but estimate copy failed: "+copyError.message);
        added.push(name);
      }
      setMessage("Photos added to this area and the customer gallery.");
    }catch(e){setMessage(e instanceof Error?e.message:"Upload failed.");}
    finally {if(added.length)change([...names,...added]);setBusy(false);}
  }
  return <fieldset><legend>Estimate and portfolio photos ({names.length}/3)</legend>
    <PhotoStrip folder={folder} names={names}/>
    {names.map((name,i)=><button type="button" key={name} onClick={()=>change(names.filter(n=>n!==name))}>Detach {name.split("-")[0]} photo {i+1}</button>)}
    <label>Photo type<select value={phase} onChange={e=>setPhase(e.target.value)}><option value="before">Before</option><option value="after">After</option><option value="condition">Condition</option></select></label>
    <input aria-label="Upload treatment photos" type="file" multiple disabled={names.length>=3} accept="image/jpeg,image/png,image/webp" onChange={e=>{void upload(Array.from(e.target.files??[]));e.target.value="";}}/>
    <p role="status">{message}</p></fieldset>;
}
