import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import ExpenseForm from './expense-form';
const money=(n:number)=>Number(n).toLocaleString('en-US',{style:'currency',currency:'USD'});
export default async function ExpensesPage(){
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)return <main className="workspace"><h1>Access pending</h1></main>;
 const [{data:expenses,error},{data:equipment}]=await Promise.all([
 supabase.from('business_expenses').select('id,category,description,vendor,amount,incurred_at,equipment_id').eq('business_id',member.business_id).order('incurred_at',{ascending:false}).limit(500),
 supabase.from('equipment').select('id,name').eq('business_id',member.business_id).limit(200)
 ]);
 const total=(expenses||[]).reduce((s,e)=>s+Number(e.amount),0);
 const categories=Object.entries((expenses||[]).reduce<Record<string,number>>((a,e)=>{a[e.category]=(a[e.category]||0)+Number(e.amount);return a;},{})).sort((a,b)=>b[1]-a[1]);
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / FINANCE</span><h1>Business Expenses</h1><p>Recorded expenses: <strong>{money(total)}</strong></p></div><div><Link href="/dashboard">Dashboard</Link> · <Link href="/equipment">Equipment</Link></div></header>
 <section className="panel"><ExpenseForm equipment={equipment||[]}/></section>
 <section className="panel"><h2>Expense categories</h2>{categories.length?<ul>{categories.map(([category,amount])=><li key={category}>{category}: {money(amount)}</li>)}</ul>:<p>No expenses recorded.</p>}</section>
 {error?<section className="panel"><p role="alert">Unable to load expenses.</p></section>:(expenses||[]).map(e=><section className="panel" key={e.id}><div className="section-heading"><div><h2>{e.description}</h2><p>{e.incurred_at} · {e.category} {e.vendor?'· '+e.vendor:''}</p></div><strong>{money(e.amount)}</strong></div></section>)}
 <p className="muted">Summary covers the 500 most recent expense entries. Equipment purchase prices and maintenance costs are not automatically included here; record them as expenses to include them in the expense total.</p></main>;
}
