'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
type State={error:string;success:string};
export async function logCustomerActivity(_state:State,f:FormData):Promise<State>{
 const customer_id=String(f.get('customer_id')||''),activity_type=String(f.get('activity_type')||''),summary=String(f.get('summary')||'').trim(),occurred=String(f.get('occurred_at')||'');
 if(!/^[0-9a-f-]{36}$/i.test(customer_id)||!['call','text','email','visit','follow_up','complaint','compliment','other'].includes(activity_type)||!summary||summary.length>2000||(occurred&&!Number.isFinite(Date.parse(occurred))))return {error:'Check activity details.',success:''};
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)return {error:'Sign in required.',success:''};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin','staff'].includes(member.role))return {error:'Access denied.',success:''};
 const {data:customer}=await supabase.from('customers').select('id').eq('id',customer_id).eq('business_id',member.business_id).maybeSingle();if(!customer)return {error:'Customer not found.',success:''};
 const {error}=await supabase.from('customer_activity').insert({business_id:member.business_id,customer_id,created_by:user.id,activity_type,summary,occurred_at:occurred?new Date(occurred).toISOString():new Date().toISOString()});
 if(error)return {error:'Could not record activity.',success:''};revalidatePath('/customers/'+customer_id+'/timeline');return {error:'',success:'Activity recorded.'};
}
