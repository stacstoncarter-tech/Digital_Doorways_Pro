import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import CustomerPhotos from '../customer-photos';
export default async function CustomerPhotoPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{page?:string}>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();if(!member)notFound();
 const {data:customer}=await supabase.from('customers').select('name').eq('id',id).eq('business_id',member.business_id).maybeSingle();if(!customer)notFound();
 const page=Math.max(1,Math.floor(Number((await searchParams).page)||1));
 const folder=member.business_id+'/'+id;
 const {data:files,error}=await supabase.storage.from('power-clean-customer-photos').list(folder,{limit:61,offset:(page-1)*60,sortBy:{column:'name',order:'desc'}});
 const paths=(files??[]).slice(0,60).filter(f=>/\.(jpg|jpeg|png|webp|heic|heif)$/i.test(f.name)).map(f=>folder+"/"+f.name);
 const {data:links,error:linkError}=paths.length?await supabase.storage.from("power-clean-customer-photos").createSignedUrls(paths,3600):{data:[],error:null};
 const photos=(links??[]).flatMap(link=>link.path&&link.signedUrl?[{name:link.path,url:link.signedUrl}]:[]);
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / CUSTOMER PHOTOS</span><h1>{customer.name} — Property photos</h1></div><Link href={'/customers/'+id}>Back to customer</Link></header>{(error||linkError)&&<p role="alert">Could not load photos: {(error||linkError)?.message}</p>}<CustomerPhotos businessId={member.business_id} customerId={id} initialPhotos={photos} canUpload={['owner','admin','staff'].includes(member.role)}/><nav aria-label="Photo pages">{page>1&&<Link href={"?page="+(page-1)}>Previous photos</Link>} · Page {page} {(files?.length??0)>60&&<Link href={"?page="+(page+1)}>Next photos</Link>}</nav></main>;
}
