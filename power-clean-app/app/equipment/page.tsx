import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {EquipmentForm,EquipmentStatus,MaintenanceForm} from './forms';
const money=(n:number)=>Number(n).toLocaleString('en-US',{style:'currency',currency:'USD'});
export default async function EquipmentPage(){
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)return <main className="workspace"><h1>Access pending</h1></main>;
 const [{data:equipment,error},{data:maintenance}]=await Promise.all([
 supabase.from('equipment').select('id,name,category,manufacturer,model,serial_number,status,purchased_at,purchase_price,notes').eq('business_id',member.business_id).order('created_at',{ascending:false}).limit(200),
 supabase.from('equipment_maintenance').select('id,equipment_id,performed_at,description,cost,next_due').eq('business_id',member.business_id).order('performed_at',{ascending:false}).limit(500)
 ]);
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / OPERATIONS</span><h1>Equipment & Maintenance</h1><p>Track pressure washers, hoses, pumps, tools, and service history.</p></div><div><Link href="/dashboard">Dashboard</Link> · <Link href="/expenses">Expenses</Link></div></header>
 <section className="panel"><EquipmentForm/></section>
 {error?<section className="panel"><p role="alert">Unable to load equipment.</p></section>:!equipment?.length?<section className="panel"><p>No equipment recorded yet.</p></section>:equipment.map(e=><section className="panel" key={e.id}><div className="section-heading"><div><h2>{e.name}</h2><p>{e.manufacturer} {e.model} · {e.category.replaceAll('_',' ')}</p></div>{e.purchase_price!==null&&<strong>{money(e.purchase_price)}</strong>}</div>
 {e.serial_number&&<p>Serial: {e.serial_number}</p>}{e.notes&&<p>{e.notes}</p>}
 <EquipmentStatus id={e.id} status={e.status}/><MaintenanceForm equipmentId={e.id}/>
 {(maintenance||[]).filter(m=>m.equipment_id===e.id).slice(0,10).map(m=><p key={m.id} className="muted">{m.performed_at}: {m.description} · {money(m.cost)} {m.next_due?'· Next due '+m.next_due:''}</p>)}
 </section>)}</main>;
}
