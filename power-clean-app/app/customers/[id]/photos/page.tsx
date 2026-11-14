import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import CustomerPhotos from '../customer-photos';
export default async function CustomerPhotoPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();if(!member)notFound();
 const {data:customer}=await supabase.from('customers').select('name').eq('id',id).eq('business_id',member.business_id).maybeSingle();if(!customer)notFound();
 const folder=member.business_id+'/'+id;
 const {data:files,error}=await supabase.storage.from('power-clean-customer-photos').list(folder,{limit:100,sortBy:{column:'created_at',order:'desc'}});
 const photos=await Promise.all((files||[]).filter(f=>/\.(jpg|jpeg|png|webp|heic|heif)$/i.test(f.name)).map(async f=>{const name=folder+'/'+f.name;const {data}=await supabase.storage.from('power-clean-customer-photos').createSignedUrl(name,3600);return data?.signedUrl?{name,url:data.signedUrl}:null;}));
 return <main className="workspace"><header className="workspace-header"><div><span className="eyebrow">POWER CLEAN / CUSTOMER PHOTOS</span><h1>{customer.name} — Property photos</h1></div><Link href={'/customers/'+id}>Back to customer</Link></header>{error&&<p role="alert">Could not load photos: {error.message}</p>}<CustomerPhotos businessId={member.business_id} customerId={id} initialPhotos={photos.filter((p):p is {name:string;url:string}=>p!==null)} canUpload={['owner','admin','staff'].includes(member.role)}/></main>;
}
