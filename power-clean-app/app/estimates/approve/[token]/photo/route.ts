import {createClient} from "@/lib/supabase/server";
export async function GET(req:Request,{params}:{params:Promise<{token:string}>}){
  const {token}=await params, query=new URL(req.url).searchParams;
  const area=query.get("area")??"",photo=query.get("photo")??"";
  if(!/^[0-9a-f]{64}$/.test(token)||!/^([0-9]|1[0-9])$/.test(area)||! /^[012]$/.test(photo)) return new Response(null,{status:404});
  const db=await createClient();
  const {data}=await db.rpc("read_estimate_photo",{p_token:token,p_area:Number(area),p_photo:Number(photo)});
  if(!data)return new Response(null,{status:404});
  return new Response(Buffer.from(data,"base64"),{headers:{"Content-Type":"image/jpeg","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
