'use client';
import { useState } from 'react';
import { LayoutDashboard, Users, FileText, CalendarDays, ClipboardCheck, Receipt, Camera, Settings, Droplets, Plus, Search, X, ShieldCheck } from 'lucide-react';

type Customer = { id: number; name: string; email: string; phone: string; address: string };
type Section = 'Dashboard' | 'Customers' | 'Estimates' | 'Schedule' | 'Jobs' | 'Contracts' | 'Invoices' | 'Photos' | 'Settings';
const menu: { name: Section; icon: typeof Users }[] = [
  { name: 'Dashboard', icon: LayoutDashboard }, { name: 'Customers', icon: Users },
  { name: 'Estimates', icon: FileText }, { name: 'Schedule', icon: CalendarDays },
  { name: 'Jobs', icon: ClipboardCheck }, { name: 'Contracts', icon: ShieldCheck },
  { name: 'Invoices', icon: Receipt }, { name: 'Photos', icon: Camera }, { name: 'Settings', icon: Settings }
];
const empty = { name: '', email: '', phone: '', address: '' };
export default function Home() {
  const [section, setSection] = useState<Section>('Dashboard');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = customers.filter(c => [c.name, c.email, c.phone, c.address].join(' ').toLowerCase().includes(search.toLowerCase()));
  function addCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setCustomers(current => [...current, { ...form, name: form.name.trim(), email: form.email.trim(), id: Date.now() }]);
    setForm(empty); setShowForm(false);
  }
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Droplets size={24}/></div><div><strong>POWER CLEAN</strong><small>OPERATIONS</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav aria-label="Main navigation">{menu.map(({name,icon:Icon}) => <button key={name} className={'nav-item ' + (section === name ? 'selected' : '')} onClick={() => { setSection(name); setShowForm(false); }}><Icon size={19}/><span>{name}</span></button>)}</nav>
      <div className="sidebar-footer"><span className="status-dot"/> Prototype workspace <small>Not connected to a database</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">POWER CLEAN / WORKSPACE</span><h1>{section}</h1></div><span className="prototype">DEVELOPMENT PREVIEW</span></header>
      {section === 'Dashboard' ? <>
        <section className="hero"><div><span className="eyebrow light">BUSINESS OVERVIEW</span><h2>Keep every job flowing.</h2><p>Manage customers, estimates, contracts, and field work in one place.</p><button className="hero-button" onClick={() => { setSection('Customers'); setShowForm(true); }}><Plus size={17}/> Add customer</button></div><div className="hero-art"><Droplets size={108} strokeWidth={1}/></div></section>
        <section className="stats" aria-label="Business overview"><div className="stat"><small>Total customers</small><strong>{customers.length}</strong><span>Current preview session</span></div><div className="stat"><small>Open estimates</small><strong>—</strong><span>Coming in Phase 1</span></div><div className="stat"><small>Scheduled jobs</small><strong>—</strong><span>Coming in Phase 1</span></div><div className="stat"><small>Revenue collected</small><strong>—</strong><span>Payments not connected</span></div></section>
        <section className="panel"><div className="panel-head"><h3>Quick actions</h3></div><div className="actions"><button onClick={() => { setSection('Customers'); setShowForm(true); }}><Users size={20}/> Add a customer</button><button onClick={() => setSection('Estimates')}><FileText size={20}/> Create estimate <span>Planned</span></button><button onClick={() => setSection('Contracts')}><ShieldCheck size={20}/> Send contract <span>Planned</span></button></div></section>
      </> : section === 'Customers' ? <>
        <div className="section-heading"><div><h2>Customer directory</h2><p>Manage contacts and property information.</p></div><button className="primary" onClick={() => setShowForm(true)}><Plus size={18}/> New customer</button></div>
        <div className="panel"><label className="search"><Search size={18}/><input aria-label="Search customers" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)}/></label>
          {filtered.length ? <div className="customer-list">{filtered.map(c => <div className="customer" key={c.id}><div className="avatar">{c.name.charAt(0).toUpperCase()}</div><div><strong>{c.name}</strong><small>{c.address || 'No property address'}</small></div><div className="contact"><span>{c.email}</span><small>{c.phone || 'No phone'}</small></div></div>)}</div> : <div className="empty"><Users size={35}/><h3>{search ? 'No matching customers' : 'Your customer list starts here'}</h3><p>{search ? 'Try another search.' : 'Add your first customer to begin organizing your business.'}</p></div>}
        </div>
      </> : <div className="panel placeholder"><div className="placeholder-icon">{section === 'Contracts' ? <ShieldCheck size={30}/> : <ClipboardCheck size={30}/>}</div><h2>{section} module</h2><p>This feature is planned for Phase 1. It is not active yet.</p>{section === 'Contracts' && <p>Planned: reusable agreements, releases, email/SMS signing links, electronic signatures, and audit history.</p>}<button className="secondary" onClick={() => setSection('Dashboard')}>Back to dashboard</button></div>}
      <footer className="footer">Power Clean · Development preview · No customer data is saved or transmitted</footer>
    </main>
    {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-customer-title"><div className="modal-title"><div><h2 id="new-customer-title">New customer</h2><p>Preview only — data resets when you refresh.</p></div><button className="icon-button" aria-label="Close" onClick={() => setShowForm(false)}><X size={20}/></button></div><form onSubmit={addCustomer}><label>Full name <input required maxLength={120} value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Customer name"/></label><label>Email address <input required type="email" maxLength={200} value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="name@example.com"/></label><label>Phone <input type="tel" maxLength={40} value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} placeholder="(555) 000-0000"/></label><label>Service address <input maxLength={240} value={form.address} onChange={e => setForm({...form,address:e.target.value})} placeholder="Street address"/></label><div className="form-actions"><button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="primary">Add customer</button></div></form></div></div>}
  </div>;
}
