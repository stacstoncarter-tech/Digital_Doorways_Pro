'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {POWER_CLEAN_LOGO} from '@/lib/branding';
const sections=[
 {name:'Customers & sales',links:[['Customers','/customers'],['Leads & follow-ups','/leads'],['New estimate','/estimates'],['Saved estimates','/estimates/history'],['Contracts & signatures','/agreements']]},
 {name:'Service delivery',links:[['All jobs','/jobs'],['Scheduling calendar','/jobs/calendar'],['Job checklists, hazards & photos','/jobs'],['Customer photo reports','/jobs']]},
 {name:'Money & operations',links:[['Invoices & payments','/invoices'],['Expenses','/expenses'],['Equipment','/equipment'],['Business reports','/reports'],['Operations command center','/operations']]}
];
export default function GlobalNavigation(){
 const pathname=usePathname(),[expanded,setExpanded]=useState(false);
 if(pathname==='/login'||pathname.startsWith('/sign/')||pathname==='/sign'||pathname.startsWith('/auth/'))return null;
 return <div className="global-navigation print-hide"><div className="global-nav-bar"><Link href="/dashboard" className="global-nav-brand" aria-label="Power Clean dashboard"><img src={POWER_CLEAN_LOGO} alt="Power Clean full logo" className="global-header-logo"/></Link><Link href="/dashboard" className="global-app-button" aria-label="Open Power Clean app dashboard" title="Power Clean app"><img src="/power-clean-emblem.webp" alt="" className="global-app-emblem"/></Link><Link href="/dashboard">Dashboard</Link><Link href="/customers">Customers</Link><Link href="/jobs">Jobs</Link><Link href="/invoices">Payments</Link><button type="button" aria-expanded={expanded} aria-controls="power-clean-navigation-directory" onClick={()=>setExpanded(!expanded)}>{expanded?'Close menu':'All pages & tools ☰'}</button></div>
 {expanded&&<nav id="power-clean-navigation-directory" aria-label="Power Clean all pages and tools" className="global-nav-directory">{sections.map(section=><section key={section.name}><h2>{section.name}</h2>{section.links.map(([label,url])=><Link key={label} href={url} onClick={()=>setExpanded(false)}>{label}</Link>)}</section>)}</nav>}
 </div>;
}
