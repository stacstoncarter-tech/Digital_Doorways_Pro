'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
type State={error:string;success:string};
async function context(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return null;const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();if(!member||!['owner','admin','staff'].includes(member.role))return null;return {supabase,user,member};}
const val=(f:FormData,k:string,n:number)=>String(f.get(k)||'').trim().slice(0,n);
export async function addLead(_s:State,f:FormData):Promise<State>{
 const ctx=await context();if(!ctx)return {error:'Access denied.',success:''};
 const name=val(f,'name',150),email=val(f,'email',200),phone=val(f,'phone',50),service_address=val(f,'service_address',250),source=val(f,'source',30),notes=val(f,'notes',3000),amount=val(f,'estimated_value',20),follow=val(f,'follow_up_at',40);
 if(!name||!['google','website','referral','door_hanger','yard_sign','social','repeat','other'].includes(source)||(amount&&(!Number.isFinite(Number(amount))||Number(amount)<0))||(follow&&!Number.isFinite(Date.parse(follow))))return {error:'Check lead details.',success:''};
 const {error}=await ctx.supabase.from('sales_leads').insert({business_id:ctx.member.business_id,created_by:ctx.user.id,name,email,phone,service_address,source,notes,estimated_value:amount?Number(amount):null,follow_up_at:follow?new Date(follow).toISOString():null});
 if(error)return {error:'Could not save lead.',success:''};revalidatePath('/leads');return {error:'',success:'Lead saved.'};
}
export async function updateLead(_s:State,f:FormData):Promise<State>{
 const ctx=await context();if(!ctx)return {error:'Access denied.',success:''};
 const id=val(f,'id',40),status=val(f,'status',30),notes=val(f,'notes',3000),follow=val(f,'follow_up_at',40);
 if(!/^[0-9a-f-]{36}$/i.test(id)||!['new','contacted','estimate_needed','estimate_sent','won','lost'].includes(status)||(follow&&!Number.isFinite(Date.parse(follow))))return {error:'Check lead update.',success:''};
 const {error}=await ctx.supabase.from('sales_leads').update({status,notes,follow_up_at:follow?new Date(follow).toISOString():null,updated_at:new Date().toISOString()}).is('deleted_at',null).eq('id',id).eq('business_id',ctx.member.business_id);
 if(error)return {error:'Could not update lead.',success:''};revalidatePath('/leads');return {error:'',success:'Lead updated.'};
}
