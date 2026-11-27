'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
type State={error:string;success:string};
async function context(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return null;const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();if(!member||!['owner','admin','staff'].includes(member.role))return null;return {supabase,user,member};}
const value=(f:FormData,k:string,max=240)=>String(f.get(k)||'').trim().slice(0,max);
export async function addEquipment(_state:State,f:FormData):Promise<State>{
 const ctx=await context();if(!ctx)return {error:'Access denied.',success:''};
 const name=value(f,'name',120),category=value(f,'category',40),manufacturer=value(f,'manufacturer',100),model=value(f,'model',100),serial_number=value(f,'serial_number',100),notes=value(f,'notes',2000),status=value(f,'status',40);
 const price=value(f,'purchase_price',20),purchased_at=value(f,'purchased_at',10);
 if(!name||!['pressure_washer','pump','hose','surface_cleaner','vehicle','safety','chemical_application','other'].includes(category)||!['active','needs_repair','out_of_service','retired'].includes(status)||price&&(isNaN(Number(price))||Number(price)<0)||purchased_at&&!/^\d{4}-\d{2}-\d{2}$/.test(purchased_at))return {error:'Check equipment details.',success:''};
 const {error}=await ctx.supabase.from('equipment').insert({business_id:ctx.member.business_id,created_by:ctx.user.id,name,category,manufacturer,model,serial_number,notes,status,purchase_price:price?Number(price):null,purchased_at:purchased_at||null});
 if(error)return {error:'Could not save equipment.',success:''};revalidatePath('/equipment');return {error:'',success:'Equipment saved.'};
}
export async function updateEquipmentStatus(id:string,status:string){
 const ctx=await context();if(!ctx)return {error:'Access denied.'};
 if(!/^[0-9a-f-]{36}$/i.test(id)||!['active','needs_repair','out_of_service','retired'].includes(status))return {error:'Invalid status.'};
 const {error}=await ctx.supabase.from('equipment').update({status}).eq('id',id).eq('business_id',ctx.member.business_id);
 if(error)return {error:'Could not update status.'};revalidatePath('/equipment');return {success:true};
}
export async function addMaintenance(_state:State,f:FormData):Promise<State>{
 const ctx=await context();if(!ctx)return {error:'Access denied.',success:''};
 const equipment_id=value(f,'equipment_id',40),description=value(f,'description',1000),performed_at=value(f,'performed_at',10),next_due=value(f,'next_due',10),cost=Number(f.get('cost'));
 if(!/^[0-9a-f-]{36}$/i.test(equipment_id)||!description||!/^\d{4}-\d{2}-\d{2}$/.test(performed_at)||next_due&&!/^\d{4}-\d{2}-\d{2}$/.test(next_due)||!Number.isFinite(cost)||cost<0)return {error:'Check maintenance details.',success:''};
 const {error}=await ctx.supabase.from('equipment_maintenance').insert({business_id:ctx.member.business_id,created_by:ctx.user.id,equipment_id,description,performed_at,next_due:next_due||null,cost});
 if(error)return {error:'Could not save maintenance.',success:''};revalidatePath('/equipment');return {error:'',success:'Maintenance recorded.'};
}
export async function addExpense(_state:State,f:FormData):Promise<State>{
 const ctx=await context();if(!ctx)return {error:'Access denied.',success:''};
 const category=value(f,'category',40),description=value(f,'description',1000),vendor=value(f,'vendor',150),incurred_at=value(f,'incurred_at',10),equipment_id=value(f,'equipment_id',40),amount=Number(f.get('amount'));
 if(!['fuel','chemicals','equipment','repairs','insurance','marketing','apparel','software','legal','supplies','labor','other'].includes(category)||!description||!/^\d{4}-\d{2}-\d{2}$/.test(incurred_at)||!Number.isFinite(amount)||amount<=0||(equipment_id&&!/^[0-9a-f-]{36}$/i.test(equipment_id)))return {error:'Check expense details.',success:''};
 const {error}=await ctx.supabase.from('business_expenses').insert({business_id:ctx.member.business_id,created_by:ctx.user.id,category,description,vendor,incurred_at,amount,equipment_id:equipment_id||null});
 if(error)return {error:'Could not save expense.',success:''};revalidatePath('/expenses');return {error:'',success:'Expense recorded.'};
}
