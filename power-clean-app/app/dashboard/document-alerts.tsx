"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

type Notice={key:string;title:string;when:string;href:string};
type Agreement={id:string;title:string;signed_at:string;customers:{name:string}|null};
type Decision={id:string;estimate_id:string;responded_at:string;response:string;estimates:{customers:{name:string}|null}|null};

export default function DocumentAlerts({business,user}:{business:string;user:string}) {
  const [items,setItems]=useState<Notice[]>([]),[error,setError]=useState(""),[seen,setSeen]=useState(0);
  const key="reviewed-customer-documents-"+business+"-"+user;
  useEffect(()=>{
    let active=true;
    try {setSeen(Number(localStorage.getItem(key))||0);} catch {setSeen(0);}
    const db=createClient();
    async function check() {
      const [agreements,decisions]=await Promise.all([
        db.from("customer_agreements").select("id,title,signed_at,customers(name)")
          .eq("business_id",business).eq("status","signed").is("deleted_at",null).order("signed_at",{ascending:false}).limit(50),
        db.from("estimate_approval_links").select("id,estimate_id,response,responded_at,estimates!inner(customers(name))")
          .eq("business_id",business).not("responded_at","is",null).is("estimates.deleted_at",null).order("responded_at",{ascending:false}).limit(50)
      ]);
      if(!active)return;
      setError([agreements.error&&"Agreement alerts unavailable.",decisions.error&&"Estimate alerts unavailable."].filter(Boolean).join(" "));
      const signed=((agreements.data??[]) as unknown as Agreement[]).map(a=>({
        key:a.id,title:(a.customers?.name??"Customer")+" · "+a.title+" signed",when:a.signed_at,href:"/agreements/view?id="+a.id
      }));
      const answered=((decisions.data??[]) as unknown as Decision[]).map(d=>({
        key:d.id,title:(d.estimates?.customers?.name??"Customer")+" · Estimate "+d.response,when:d.responded_at,href:"/estimates/view?id="+d.estimate_id
      }));
      setItems([...signed,...answered].sort((a,b)=>Date.parse(b.when)-Date.parse(a.when)));
    }
    void check();
    const timer=setInterval(check,30000);
    return ()=>{active=false;clearInterval(timer);};
  },[business,key]);
  const unread=items.filter(x=>Date.parse(x.when)>seen);
  return <section className="panel"><h2>Returned customer documents</h2>
    {error&&<p role="alert">{error}</p>}
    <p role="status">{unread.length?unread.length+" documents to review":error?"":"No new customer responses"}</p>
    {unread.map(n=><p key={n.key}><Link href={n.href}>{n.title}</Link> · {new Date(n.when).toLocaleString()}</p>)}
    {!!unread.length&&<button type="button" onClick={()=>{
      const last=Date.parse(unread[0].when);setSeen(last);
      try{localStorage.setItem(key,String(last));}catch{/* Keep the current session's review state. */}
    }}>Mark displayed documents reviewed</button>}
  </section>;
}
