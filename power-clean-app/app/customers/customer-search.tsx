'use client';
import { useState } from 'react';
import Link from 'next/link';
type Customer = { id:string; name:string; email:string|null; phone:string|null; service_address:string|null };
export default function CustomerSearch({customers,initialQuery=''}:{customers:Customer[];initialQuery?:string}) {
  const [query,setQuery] = useState(initialQuery);
  const filtered = customers;
  return <div>
    <form action="/customers" method="get" style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",maxWidth:"none"}}><label className="search"><span className="sr-only">Search customers</span><input name="q" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, phone, email, any service address" aria-label="Search customers"/></label><button className="primary" type="submit">Search</button><Link href="/customers">Clear</Link></form>
    {filtered.length ? <div className="customer-list">{filtered.map(c=><div className="customer" key={c.id}>
      <div className="avatar">{c.name.charAt(0).toUpperCase()}</div>
      <div><strong><Link href={`/customers/${encodeURIComponent(c.id)}`}>{c.name}</Link></strong><small>{c.service_address||'No service address'}</small></div>
      <div className="contact"><Link href={`/customers/${encodeURIComponent(c.id)}`}>View profile</Link> · <Link href={`/agreements?customer=${encodeURIComponent(c.id)}`}>Create agreement</Link><span>{c.email||'No email'}</span><small>{c.phone||'No phone'}</small></div>
    </div>)}</div> : <div className="empty"><h3>{query?'No matching customers':'No customers yet'}</h3><p>{query?'Try another search term.':'Use the form above to add your first customer.'}</p></div>}
    
  </div>;
}
