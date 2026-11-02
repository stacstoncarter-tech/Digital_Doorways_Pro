'use client';
import {useActionState} from 'react';
import {updateCustomer,updateAddress,type CustomerActionState} from './actions';
const initial:CustomerActionState={error:'',success:''};
export function CustomerProfileEditor({customer}:{customer:{id:string;name:string;email:string|null;phone:string|null}}){
 const [state,action,pending]=useActionState(updateCustomer,initial);
 return <section className="panel"><h2>Edit customer contact details</h2><form action={action}>
 <input type="hidden" name="customerId" value={customer.id}/>
 <label>Name<input name="name" required maxLength={120} defaultValue={customer.name}/></label>
 <label>Email<input name="email" type="email" maxLength={200} defaultValue={customer.email||''}/></label>
 <label>Phone<input name="phone" maxLength={40} defaultValue={customer.phone||''}/></label>
 <button className="primary" disabled={pending}>Save contact details</button>
 {state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}
 </form></section>;
}
export function PropertyEditor({customerId,property}:{customerId:string;property:{id:string;label:string;address:string}}){
 const [state,action,pending]=useActionState(updateAddress,initial);
 return <form action={action} style={{padding:'12px 0',borderTop:'1px solid #e1eaf0'}}>
 <input type="hidden" name="customerId" value={customerId}/><input type="hidden" name="addressId" value={property.id}/>
 <label>Property label<input name="label" required maxLength={80} defaultValue={property.label}/></label>
 <label>Service address<input name="address" required maxLength={240} defaultValue={property.address}/></label>
 <button className="secondary" disabled={pending}>Update property</button>
 {state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}
 </form>;
}
