'use server';
import {createClient} from '@/lib/supabase/server';

/** Trial-only sending: explicitly allowlisted verified recipients, never arbitrary customer numbers. */
export async function sendTrialAgreementSms(agreementId:string,token:string,recipient:string,consentConfirmed:boolean){
 if(!consentConfirmed)return {error:'Confirm the recipient agreed to receive this signing-request text.'};
 if(!/^[a-f0-9]{64}$/.test(token))return {error:'Prepare a fresh signing link first.'};
 if(!/^\+[1-9]\d{7,14}$/.test(recipient))return {error:'Use an E.164 phone number, such as +13525550123.'};
 const allowed=(process.env.TWILIO_TRIAL_VERIFIED_RECIPIENTS||'').split(',').map(x=>x.trim());
 if(!allowed.includes(recipient))return {error:'Trial sending is restricted to phone numbers explicitly verified and allowlisted by the administrator.'};
 const sid=process.env.TWILIO_ACCOUNT_SID,secret=process.env.TWILIO_AUTH_TOKEN,from=process.env.TWILIO_PHONE_NUMBER;
 if(!sid||!secret||!from)return {error:'Twilio credentials and trial sender have not been configured in Vercel.'};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:'Sign in again.'};
 const {data:member}=await supabase.from('business_members').select('business_id,role').eq('user_id',user.id).limit(1).maybeSingle();
 if(!member||!['owner','admin'].includes(member.role))return {error:'Only an owner or admin can send agreement texts.'};
 const {createHash}=await import('node:crypto');
 const hash=createHash('sha256').update(token).digest('hex');
 const {data:a}=await supabase.from('customer_agreements').select('id,status,signing_expires_at,signing_token_hash').eq('id',agreementId).eq('business_id',member.business_id).maybeSingle();
 if(!a||a.status!=='sent'||a.signing_token_hash!==hash||!a.signing_expires_at||Date.parse(a.signing_expires_at)<=Date.now())return {error:'Signing link is no longer valid. Prepare a new link.'};
 const base=process.env.NEXT_PUBLIC_APP_URL;
 if(!base||!/^https:\/\//.test(base))return {error:'Set NEXT_PUBLIC_APP_URL to the stable HTTPS app address before sending.'};
 const body=`Power Clean: Please review and sign your agreement: ${base.replace(/\/$/,'')}/sign/${token} Reply STOP to opt out.`;
 const params=new URLSearchParams({To:recipient,From:from,Body:body});
 try{
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(`${sid}:${secret}`).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:params.toString(),cache:'no-store'});
  if(!response.ok){const failure=await response.json().catch(()=>null) as {code?:number;message?:string}|null;const code=typeof failure?.code==='number'?` Twilio code ${failure.code}.`:'';const guidance=response.status===401?' Verify the Account SID and current Auth Token belong to the same Twilio account, then redeploy.':' Check the sender, trial recipient, and Twilio account settings.';return {error:`Twilio rejected the request (HTTP ${response.status}).${code}${guidance}`};}
  const result=await response.json() as {sid?:string;status?:string};
  return {success:true,status:result.status||'accepted',messageId:result.sid||''};
 }catch{return {error:'Twilio could not be reached. Try again later.'};}
}
