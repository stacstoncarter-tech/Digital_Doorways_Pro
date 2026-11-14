/** Refresh identity fields in current master drafts before issuing a new link.
 * Inspection findings and all other contract wording remain intact. */
export function refreshAgreementCustomer(body:string,customer:{name:string;email:string|null;phone:string|null},address:string){
 if(body.startsWith('PRESSURE AND SOFT WASHING SERVICES AGREEMENT')){
  return body
   .replace(/^.*?, an individual \(“Customer”\)\./m,()=>`${customer.name}, an individual (“Customer”).`)
   .replace(/^Property \(service address\): .*$/m,()=>`Property (service address): ${address}`)
   .replace(/^Customer telephone \/ email: .*$/m,()=>`Customer telephone / email: ${customer.phone||'Not provided'} / ${customer.email||'Not provided'}`);
 }
 if(body.startsWith('PROPERTY CONDITION DISCLOSURE')){
  return body
   .replace(/^.*? \(“Customer”\)\. The Acknowledgment concerns the real$/m,()=>`${customer.name} (“Customer”). The Acknowledgment concerns the real`)
   .replace(/^property located at .*?, Florida \(the “Property”\),$/m,()=>`property located at ${address}, Florida (the “Property”),`);
 }
 return body;
}
