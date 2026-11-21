"use client";
import {useState} from "react";
export default function ShareDocument({id,email}:{id:string;email?:string}){
  const [file,setFile]=useState<File|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const url="/api/agreements/"+id+"/pdf";
  async function prepare(){
    setBusy(true);
    try{
      const r=await fetch(url);
      if(!r.ok)throw Error(await r.text());
      setFile(new File([await r.blob()],"Power-Clean-Agreement.pdf",{type:"application/pdf"}));
      setMessage("Document ready. Choose how to send your copy.");
    }catch(e){setMessage(e instanceof Error?e.message:"Document unavailable.");}
    finally{setBusy(false);}
  }
  return <div className="print-hide"><button type="button" disabled={busy} onClick={prepare}>Prepare customer copy</button>
    {file&&<p>{navigator.canShare?.({files:[file]})&&<button type="button" onClick={async()=>{try{await navigator.share({files:[file],title:"Power Clean agreement"});}catch{setMessage("Sharing closed.");}}}>Send PDF</button>}
    <a href={url} download>Download PDF</a> · <a href={"mailto:"+encodeURIComponent(email??"")+"?subject=Power%20Clean%20agreement&body=Please%20find%20your%20agreement%20attached."}>Open email to attach PDF</a></p>}
    <p role="status">{message}</p></div>;
}
