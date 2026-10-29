'use client';
import { useState } from 'react';
import Link from 'next/link';
type Customer = { id:string; name:string; email:string|null; phone:string|null; service_address:string|null };
export default function CustomerSearch({customers}:{customers:Customer[]}) {
  const [query,setQuery] = useState('');
  const filtered = customers.filter(c => [c.name,c.email,c.phone,c.service_address].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase()));
  return <div>
    <label className="search"><span className="sr-only">Search customers</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, phone, email, address" aria-label="Search customers"/></label>
    {filtered.length ? <div className="customer-list">{filtered.map(c=><div className="customer" key={c.id}>
      <div className="avatar">{c.name.charAt(0).toUpperCase()}</div>
      <div><strong>{c.name}</strong><small>{c.service_address||'No service address'}</small></div>
      <div className="contact"><Link href={`/agreements?customer=${encodeURIComponent(c.id)}`}>Create agreement</Link><span>{c.email||'No email'}</span><small>{c.phone||'No phone'}</small></div>
    </div>)}</div> : <div className="empty"><h3>{query?'No matching customers':'No customers yet'}</h3><p>{query?'Try another search term.':'Use the form above to add your first customer.'}</p></div>}
    {customers.length===100 && <p className="muted">Showing the 100 newest records. Pagination is planned.</p>}
  </div>;
}
