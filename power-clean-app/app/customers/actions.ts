'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export type ActionState = { error: string; success: string };
export async function addCustomer(_previous: ActionState, data: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect('/login');
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim();
  const phone = String(data.get('phone') || '').trim();
  const address = String(data.get('address') || '').trim();
  if (!name || name.length > 120 || email.length > 200 || phone.length > 40 || address.length > 240 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return {error:'Check the customer details and try again.',success:''};
  const { data: membership, error: memberError } = await supabase.from('business_members').select('business_id,role').eq('user_id',auth.user.id).limit(1).maybeSingle();
  if (memberError || !membership || !['owner','admin','staff'].includes(membership.role)) return {error:'You do not have permission to create customers.',success:''};
  const { error } = await supabase.from('customers').insert({business_id:membership.business_id,name,email:email||null,phone:phone||null,service_address:address||null});
  if (error) return {error:'Could not save customer. Contact your administrator.',success:''};
  revalidatePath('/customers');
  return {error:'',success:'Customer saved.'};
}
