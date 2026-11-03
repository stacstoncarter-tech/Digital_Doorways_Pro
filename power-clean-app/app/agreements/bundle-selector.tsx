'use client';
import {useState} from 'react';
import BundleButton from './bundle-button';
type Customer={id:string;name:string;email?:string|null;phone?:string|null};
export default function BundleSelector({customers}:{customers:Customer[]}){
 const [selected,setSelected]=useState('');
 const customer=customers.find(c=>c.id===selected);
 return <div style={{display:'grid',gap:12,maxWidth:650}}>
 <label htmlFor="bundle-customer">Customer for both agreements</label>
 <select id="bundle-customer" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose a customer…</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
 {customer&&<BundleButton key={customer.id} customerId={customer.id} name={customer.name} email={customer.email} phone={customer.phone}/>}
 {!customers.length&&<p>No customers found. Add a customer before preparing agreements.</p>}
 </div>;
}
