"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
type Notice={id:string;title:string;signed_at:string;customers:{name:string}|null};
export default function DocumentAlerts({business,user}:{business:string;user:string}) {
  const [items,setItems]=useState<Notice[]>([]),[error,setError]=useState(""),[seen,setSeen]=useState("");
  const key="reviewed-agreements-"+business+"-"+user;
  useEffect(()=>{
    let active=true;
    setSeen(localStorage.getItem(key)??"");
    const db=createClient();
    async function check() {
      const {data,error}=await db.from("customer_agreements").select("id,title,signed_at,customers(name)")
        .eq("business_id",business).eq("status","signed").is("deleted_at",null).order("signed_at",{ascending:false}).limit(50);
      if(active){setError(error?"Could not refresh document alerts.":"");if(data)setItems(data as unknown as Notice[]);}
    }
    void check();const timer=setInterval(check,30000);
    return ()=>{active=false;clearInterval(timer);};
  },[business,key]);
  const unread=items.filter(x=>x.signed_at>seen);
  return <section className="panel"><h2>Returned customer documents</h2><p role="status">{error || (unread.length?unread.length+" signed documents to review":"No new signed documents")}</p>
  {unread.map(item=><p key={item.id}><Link href={"/agreements/view?id="+item.id}>{item.customers?.name} · {item.title}</Link> · {new Date(item.signed_at).toLocaleString()}</p>)}
  {!!unread.length&&<button type="button" onClick={()=>{setSeen(unread[0].signed_at);localStorage.setItem(key,unread[0].signed_at);}}>Mark displayed documents reviewed</button>}</section>;
}
