import {POWER_CLEAN_LOGO} from '@/lib/branding';
export const dynamic='force-static';
export function GET(){
 const base64=POWER_CLEAN_LOGO.split(',')[1];
 return new Response(Buffer.from(base64,'base64'),{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=86400, s-maxage=86400','Content-Disposition':'inline; filename="power-clean-logo.webp"'}});
}
