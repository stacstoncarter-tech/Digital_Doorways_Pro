import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import CustomerEditors from './customer-editors';
import DeleteCustomer from './delete-customer';
import {CustomerProfileEditor,PropertyEditor} from './profile-editors';
export default async function CustomerDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member)return <main className="workspace"><h1>Business access pending</h1></main>;
 const {data:customer}=await supabase.from('customers').select('id,name,email,phone,service_address,created_at').eq('id',id).eq('business_id',member.business_id).maybeSingle();
 if(!customer)notFound();
 const [addressesResult,notesResult]=await Promise.all([
 supabase.from('customer_addresses').select('id,label,address,is_primary,created_at').eq('customer_id',id).eq('business_id',member.business_id).order('created_at'),
 supabase.from('customer_notes').select('id,body,created_at').eq('customer_id',id).eq('business_id',member.business_id).order('created_at',{ascending:false}).limit(100)
 ]);
 const addresses=addressesResult.data||[];
 const primaryAddress=addresses.find(a=>a.is_primary)||addresses[0];
 const displayedAddress=primaryAddress?.address||customer.service_address||null;
 return <main className="workspace">
 <header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / CUSTOMERS</span><h1>{customer.name}</h1><p className="muted">Customer since {new Date(customer.created_at).toLocaleDateString('en-US')}</p></div><Link href="/customers">All customers</Link></header>
 <section className="panel"><h2>Customer details</h2><p>Email: {customer.email||'Not provided'}</p><p>Phone: {customer.phone||'Not provided'}</p><p><strong>Primary service address:</strong> {displayedAddress||'No address saved'}</p><Link href={'/agreements?customer='+encodeURIComponent(id)}>Create agreement</Link> · <Link href={'/estimates?customer='+encodeURIComponent(id)}>Create estimate</Link></section>
 {['owner','admin','staff'].includes(member.role)&&<CustomerProfileEditor customer={customer}/>}
 <CustomerEditors customerId={id} canEdit={['owner','admin','staff'].includes(member.role)}/>
 <section className="panel"><h2>Customer photos</h2><p>Property condition, before, and after photos have their own management page.</p><Link href={"/customers/"+id+"/photos"}>Manage customer photos and delete images</Link></section>\n <section className="panel"><h2>Service properties</h2><p>Addresses saved here are available to estimates and agreements. Choose a primary address to display at the top of this customer profile.</p>{addressesResult.error?<p role="alert">Could not load properties.</p>:(addressesResult.data||[]).length?<ul>{(addressesResult.data||[]).map(a=><li key={a.id}><strong>{a.label}</strong>{a.is_primary?' (Original)':''} — {a.address}{['owner','admin','staff'].includes(member.role)&&<PropertyEditor customerId={id} property={a}/>}</li>)}</ul>:<p>No service properties saved yet.</p>}</section>
 <section className="panel"><h2>Customer notes</h2>{notesResult.error?<p role="alert">Could not load notes.</p>:(notesResult.data||[]).length?<ul>{(notesResult.data||[]).map(n=><li key={n.id}><small>{new Date(n.created_at).toLocaleString('en-US')}</small><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{n.body}</p></li>)}</ul>:<p>No notes yet.</p>}</section>
 <section className="panel"><h2>Customer activity</h2><p><Link href={"/customers/"+id+"/timeline"}>View customer timeline</Link></p><p><Link href={"/agreements?customer="+id}>View customer agreements</Link> · <Link href={"/estimates?customer="+id}>View customer estimates</Link></p></section>\n {["owner","admin"].includes(member.role)&&<DeleteCustomer customerId={id} name={customer.name}/>}</main>;
}
