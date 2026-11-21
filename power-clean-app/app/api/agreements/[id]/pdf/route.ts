import {createClient} from "@/lib/supabase/server";
import {PDFDocument,StandardFonts} from "pdf-lib";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)return new Response("Sign in required",{status:401});
  const {data:a}=await db.from("customer_agreements").select("id,business_id,title,body,status,signed_at,signer_name,marketing_photo_consent,signed_document_sha256,contractor_signed_at,contractor_signer_name,contractor_signer_title,contractor_signature_image_data").eq("id",id).is("deleted_at",null).maybeSingle();
  if(!a)return new Response("Document unavailable",{status:404});
  const {data:member}=await db.from("business_members").select("role").eq("user_id",user.id).eq("business_id",a.business_id).maybeSingle();
  if(!member)return new Response("Forbidden",{status:403});
  if(a.status==="signed"){
    const {data:event}=await db.from("agreement_signature_events").select("document_sha256").eq("agreement_id",id).maybeSingle();
    if(!event?.document_sha256 || event.document_sha256!==a.signed_document_sha256)return new Response("Signature verification failed",{status:409});
  }
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
  let page=pdf.addPage([612,792]),y=745;
  function line(s:string){
    if(y<55){page=pdf.addPage([612,792]);y=745;}
    page.drawText(s,{x:42,y,font,size:11});y-=16;
  }
  function paragraph(text:string){
    for(const block of text.split(/\r?\n/)){
      let row="";
      for(const word of block.split(/\s+/)){
        const clean=Array.from(word).map(c=>{try{font.encodeText(c);return c;}catch{return "?";}}).join("");
        if(row && font.widthOfTextAtSize(row+" "+clean,11)>525){line(row);row="";}
        for(const char of clean){if(font.widthOfTextAtSize(row+char,11)>525){line(row);row="";}row+=char;}
        row+=" ";
      }
      line(row.trimEnd());
    }
  }
  paragraph("Power Clean Solutions LLC");paragraph(a.title);paragraph("Status: "+a.status);paragraph(a.body);
  if(a.contractor_signed_at){
    paragraph("Authorized by "+a.contractor_signer_name+" — "+a.contractor_signer_title+" · "+a.contractor_signed_at);
    if(a.contractor_signature_image_data){
      const data=a.contractor_signature_image_data;
      const signature=data.startsWith("data:image/jpeg")?await pdf.embedJpg(data):await pdf.embedPng(data);
      const size=signature.scaleToFit(230,65);
      if(y<size.height+55){page=pdf.addPage([612,792]);y=745;}
      y-=size.height;page.drawImage(signature,{x:42,y,...size});y-=18;
    }
  }
  if(a.status==="signed"){
    paragraph("Customer signature: "+a.signer_name+" · "+a.signed_at);
    if(a.marketing_photo_consent!=null)paragraph("Marketing photo permission: "+(a.marketing_photo_consent?"Yes":"No"));
    paragraph("Verified signature record: "+a.signed_document_sha256);
  }
  paragraph("Document reference: "+id);
  return new Response(Buffer.from(await pdf.save()),{headers:{"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="Power-Clean-Agreement.pdf"',"Cache-Control":"private, no-store"}});
}
