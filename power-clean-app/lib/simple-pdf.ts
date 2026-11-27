// Minimal text PDF writer for direct invoice sharing without a temporary file upload.
export function textPdf(lines:string[]):Uint8Array{
 const enc=new TextEncoder(),escape=(s:string)=>s.normalize('NFKD').replace(/[^\x20-\x7e]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
 const pages:string[][]=[];for(let i=0;i<lines.length;i+=48)pages.push(lines.slice(i,i+48));if(!pages.length)pages.push([]);
 const objects:string[]=['','<< /Type /Catalog /Pages 2 0 R >>','','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 const kids:string[]=[];
 for(const page of pages){const pageId=objects.length,contentId=pageId+1;kids.push(pageId+' 0 R');
  const stream=['BT','/F1 10 Tf','48 750 Td',...page.map((line,i)=>(i?'0 -14 Td ':'')+'('+escape(line.slice(0,105))+') Tj'),'ET'].join('\n');
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents '+contentId+' 0 R >>');
  objects.push('<< /Length '+enc.encode(stream).length+' >>\nstream\n'+stream+'\nendstream');
 }
 objects[2]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+kids.length+' >>';
 let output='%PDF-1.4\n';const offsets=[0];
 for(let i=1;i<objects.length;i++){offsets.push(enc.encode(output).length);output+=i+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const xref=enc.encode(output).length;output+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';for(let i=1;i<objects.length;i++)output+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 output+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 return enc.encode(output);
}
