'use client';
export default function ExportExpenses({rows}:{rows:{incurred_at:string;category:string;description:string;vendor:string|null;amount:number;equipment_id:string|null}[]}){
 function exportCsv(){const headers=['Date','Category','Description','Vendor','Amount','Equipment ID'];const escape=(x:unknown)=>{const s=String(x??'');return '"'+( /^[=+@\-\t\r]/.test(s)?'\''+s:s).replaceAll('"','""')+'"'};const csv=[headers,...rows.map(x=>[x.incurred_at,x.category,x.description,x.vendor,x.amount,x.equipment_id])].map(r=>r.map(escape).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='power-clean-expenses.csv';a.click();URL.revokeObjectURL(url);}
 return <button type="button" onClick={exportCsv} disabled={!rows.length}>Export shown expenses (CSV)</button>;
}
