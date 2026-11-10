'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';

export async function setRecordDeleted(kind:string,id:string,deleted:boolean){
 if(!['lead','job','invoice','agreement','estimate'].includes(kind)||!/^[0-9a-f-]{36}$/i.test(id))return {error:'Invalid record.'};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in again.'};
 const {error}=await supabase.rpc('set_record_deleted',{p_kind:kind,p_id:id,p_deleted:deleted});
 if(error)return {error:error.message};
 revalidatePath('/','layout');
 return {success:deleted?'Moved to Trash. You can restore it from Trash.':'Record restored. Old signing and approval links stay revoked; prepare a new link if needed.'};
}
