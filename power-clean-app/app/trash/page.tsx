import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import DeleteRecord from '../delete-record';

export default async function TrashPage(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin'].includes(member.role))return <main className="workspace"><h1>Owner or admin access required</h1></main>;
 const sources=[['lead','sales_leads','name','/leads'],['job','jobs','id','/jobs'],['invoice','invoices','invoice_number','/invoices'],['agreement','customer_agreements','title','/agreements'],['estimate','estimates','id','/estimates/history']] as const;
 const results=await Promise.all(sources.map(async([kind,table,label,path])=>{
  const {data,error}=await supabase.from(table).select(label==='id'?'id,deleted_at':`id,deleted_at,${label}`).eq('business_id',member.business_id).not('deleted_at','is',null).order('deleted_at',{ascending:false}).limit(200);
  return {kind,path,error,rows:(data||[]) as unknown as {id:string;deleted_at:string;name?:string;title?:string;invoice_number?:string}[]};
 }));
 return <main className="workspace"><header className="workspace-header"><div><h1>Trash</h1><p>The latest 200 deleted records in each category appear here. Related files, payment records and signed documents are preserved. Restoring does not reactivate old signing or approval links.</p></div><Link href="/dashboard">Dashboard</Link></header>
 {results.map(({kind,path,error,rows})=><section className="panel" key={kind}><h2>{kind.charAt(0).toUpperCase()+kind.slice(1)}s</h2><Link href={path}>Active {kind}s</Link>{error?<p role="alert">Could not load deleted {kind}s.</p>:!rows.length?<p>No deleted {kind}s.</p>:rows.map(row=><div key={row.id}><h3>{row.name||row.title||row.invoice_number||row.id}</h3><p>Deleted {new Date(row.deleted_at).toLocaleString('en-US')}</p><DeleteRecord kind={kind} id={row.id} label={row.name||row.title||row.invoice_number||row.id} restore/></div>)}</section>)}
 </main>;
}
