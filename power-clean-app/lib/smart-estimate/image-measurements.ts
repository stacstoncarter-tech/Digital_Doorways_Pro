/** Parse explicit labels only. Never infer real-world size from image pixels. */
export type ImageMeasurement = { text: string; squareFeet: number; length?: {ft:number;inches:number}; width?: {ft:number;inches:number} };
export function extractMeasurements(text: string): ImageMeasurement[] {
 const source=text.slice(0,20000).replace(/[′’]/g,"'").replace(/[″“”]/g,'"');
 const results:ImageMeasurement[]=[];
 const number='(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
 const square=new RegExp(`(${number})\\s*(?:sq\\.?\\s*(?:ft\\.?|feet)|square\\s*(?:feet|foot)|ft\\s*(?:²|2)|sf\\b)`,'gi');
 for(const m of source.matchAll(square)) {const n=Number(m[1].replaceAll(',',''));if(n>0&&n<=1e8)results.push({text:m[0],squareFeet:n});}
 const measure=`(${number})\\s*(?:feet|foot|ft\\.?|')\\s*(?:(\\d+(?:\\.\\d+)?)\\s*(?:inches|inch|in\\.?|"))?`;
 const dimensions=new RegExp(`${measure}\\s*[x×]\\s*${measure}`,'gi');
 for(const m of source.matchAll(dimensions)) {
  const length={ft:Number(m[1].replaceAll(',','')),inches:Number(m[2]||0)},width={ft:Number(m[3].replaceAll(',','')),inches:Number(m[4]||0)};
  const n=(length.ft+length.inches/12)*(width.ft+width.inches/12);
  if(length.inches<12&&width.inches<12&&n>0&&n<=1e8)results.push({text:m[0],squareFeet:n,length,width});
 }
 return results.filter((r,i)=>results.findIndex(x=>x.text===r.text&&x.squareFeet===r.squareFeet)===i).slice(0,50);
}
