import {createClient} from '@/lib/supabase/server';
import {textPdf} from '@/lib/simple-pdf';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return new Response('Invalid invoice',{status:400});
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)return new Response('Sign in required',{status:401});
 const {data:member}=await supabase.from('business_members').select('business_id').eq('user_id',user.id).limit(1).maybeSingle();if(!member)return new Response('Forbidden',{status:403});
 const {data:invoice}=await supabase.from('invoices').select('id,invoice_number,customer_id,status,total,subtotal,discount,tax_rate,due_at,notes,invoice_items(description,quantity,unit_price),invoice_payments(amount)').is('deleted_at',null).eq('id',id).eq('business_id',member.business_id).maybeSingle();
 if(!invoice)return new Response('Invoice not found',{status:404});
 const {data:customer}=await supabase.from('customers').select('name,email').eq('id',invoice.customer_id).eq('business_id',member.business_id).maybeSingle();
 const money=(n:number)=>Number(n).toLocaleString('en-US',{style:'currency',currency:'USD'});
 const paid=(invoice.invoice_payments||[]).reduce((n,p)=>n+Number(p.amount),0);
 const lines=['POWER CLEAN','Pressure Washing & Soft Washing','Phone: (352) 665-4527','Email: pwr.wash.clean2026@gmail.com','', 'INVOICE '+invoice.invoice_number,'Customer: '+(customer?.name||'Customer'),'Email: '+(customer?.email||'Not provided'),'Status: '+invoice.status.toUpperCase(),'Due: '+(invoice.due_at||'As agreed'),'','SERVICES',...invoice.invoice_items.map(i=>i.description+' | '+i.quantity+' x '+money(Number(i.unit_price))+' = '+money(Number(i.quantity)*Number(i.unit_price))),'','Subtotal: '+money(Number(invoice.subtotal)),'Discount: '+money(Number(invoice.discount)),'Tax rate: '+invoice.tax_rate+'%','Total: '+money(Number(invoice.total)),'Payments recorded: '+money(paid),'Balance: '+money(Math.max(0,Number(invoice.total)-paid)),'',...(invoice.notes?['Notes: '+invoice.notes]:[]),'Thank you for choosing Power Clean.','Recorded payments are not proof of bank settlement.'];
 const pdf=textPdf(lines);return new Response(new Blob([new Uint8Array(pdf)],{type:'application/pdf'}),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="power-clean-invoice-'+invoice.invoice_number.replace(/[^a-zA-Z0-9-]/g,'')+'.pdf"','Cache-Control':'private, no-store'}});
}
