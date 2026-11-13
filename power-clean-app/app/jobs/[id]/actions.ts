'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
type State={error:string;success:string};
async function context(jobId:string){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user||!/^[0-9a-f-]{36}$/i.test(jobId))return null;const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();if(!member||!['owner','admin','staff'].includes(member.role))return null;const {data:job}=await supabase.from('jobs').select('id,customer_id').is('deleted_at',null).eq('id',jobId).eq('business_id',member.business_id).maybeSingle();if(!job)return null;return {supabase,user,member,job};}
export async function addChecklistItem(_state:State,f:FormData):Promise<State>{
 const jobId=String(f.get('job_id')||''),title=String(f.get('title')||'').trim();const ctx=await context(jobId);
 if(!ctx)return {error:'Access denied.',success:''};if(!title||title.length>200)return {error:'Enter a checklist item.',success:''};
 const {error}=await ctx.supabase.from('job_checklist_items').insert({job_id:jobId,business_id:ctx.member.business_id,title,created_by:ctx.user.id});
 if(error)return {error:'Could not add item.',success:''};revalidatePath('/jobs/'+jobId);return {error:'',success:'Checklist item added.'};
}
export async function toggleChecklistItem(jobId:string,id:string,complete:boolean){
 const ctx=await context(jobId);if(!ctx||!/^[0-9a-f-]{36}$/i.test(id))return {error:'Access denied.'};
 const {error}=await ctx.supabase.from('job_checklist_items').update({is_complete:complete,completed_at:complete?new Date().toISOString():null,completed_by:complete?ctx.user.id:null}).eq('id',id).eq('job_id',jobId).eq('business_id',ctx.member.business_id);
 if(error)return {error:'Could not update checklist.'};revalidatePath('/jobs/'+jobId);return {success:true};
}
export async function addCustomerPhotoToJob(_state:State, form:FormData):Promise<State>{
 const jobId=String(form.get('job_id')||'');
 const phase=String(form.get('phase')||'');
 const caption=String(form.get('caption')||'').trim();
 const filename=String(form.get('photo')||'');
 const ctx=await context(jobId);
 if(!ctx?.job.customer_id)return {error:'This job has no accessible customer profile.',success:''};
 const extension=/^[\w-]+\.(jpe?g|png|webp|heic|heif)$/i.exec(filename)?.[1].toLowerCase();
 if(!extension||!['before','during','after'].includes(phase)||caption.length>300){
  return {error:'Choose a customer photo and a stage. Captions can be up to 300 characters.',success:''};
 }

 const sourcePath=ctx.member.business_id+'/'+ctx.job.customer_id+'/'+filename;
 const {data:file,error:downloadError}=await ctx.supabase.storage.from('power-clean-customer-photos').download(sourcePath);
 if(downloadError||!file)return {error:'Could not open that customer photo. It may have been removed.',success:''};

 const path=ctx.member.business_id+'/'+jobId+'/'+crypto.randomUUID()+'.'+extension;
 const bucket=ctx.supabase.storage.from('power-clean-job-photos');
 const {error:uploadError}=await bucket.upload(path,file,{contentType:file.type,upsert:false});
 if(uploadError)return {error:'Could not save the customer photo to this job: '+uploadError.message,success:''};
 const {error}=await ctx.supabase.from('job_photos').insert({job_id:jobId,business_id:ctx.member.business_id,storage_path:path,phase,caption,created_by:ctx.user.id});
 if(error){
  await bucket.remove([path]);
  return {error:'Could not save the job photo record.',success:''};
 }
 revalidatePath('/jobs/'+jobId);
 return {error:'',success:'Customer photo added to the job.'};
}

export async function deleteJobPhoto(jobId:string,photoId:string){
 const ctx=await context(jobId);
 if(!ctx||!/^[0-9a-f-]{36}$/i.test(photoId))return {error:'Access denied.'};
 const {data:photo,error:lookupError}=await ctx.supabase.from('job_photos').select('id,storage_path').eq('id',photoId).eq('job_id',jobId).eq('business_id',ctx.member.business_id).maybeSingle();
 if(lookupError||!photo)return {error:'Job photo not found.'};
 const prefix=ctx.member.business_id+'/'+jobId+'/';
 if(!photo.storage_path.startsWith(prefix)||photo.storage_path.slice(prefix.length).includes('/'))return {error:'Invalid photo storage path.'};
 const {error:storageError}=await ctx.supabase.storage.from('power-clean-job-photos').remove([photo.storage_path]);
 if(storageError)return {error:'Storage deletion failed: '+storageError.message};
 const {data:remaining,error:verifyError}=await ctx.supabase.storage.from('power-clean-job-photos').list(prefix.slice(0,-1),{limit:1000});
 if(verifyError)return {error:'Storage deletion could not be verified: '+verifyError.message};
 if((remaining||[]).some(p=>p.name===photo.storage_path.slice(prefix.length)))return {error:'Photo still exists in storage; check DELETE permissions.'};
 const {data:deleted,error:dbError}=await ctx.supabase.from('job_photos').delete().eq('id',photoId).eq('job_id',jobId).eq('business_id',ctx.member.business_id).select('id').maybeSingle();
 if(dbError||!deleted)return {error:'Image removed from storage, but database cleanup failed: '+(dbError?.message||'No matching record')};
 revalidatePath('/jobs/'+jobId);
 return {success:true};
}
