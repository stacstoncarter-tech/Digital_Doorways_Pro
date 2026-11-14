'use client';
import { useActionState } from 'react';
import { addCustomer, type ActionState } from './actions';
const initial: ActionState = {error:'',success:''};
export default function CustomerForm() {
  const [state, action, pending] = useActionState(addCustomer, initial);
  return <form action={action} style={{display:'grid',gap:12,maxWidth:520}}>
    <label>Full name<input name="name" required maxLength={120}/></label>
    <label>Email<input name="email" type="email" maxLength={200}/></label>
    <label>Phone<input name="phone" type="tel" maxLength={40}/></label>
    <label>Service address<input name="address" maxLength={240}/></label>
    {state.error && <p role="alert">{state.error}</p>}
    {state.success && <p role="status">{state.success}</p>}
    <button className="primary" disabled={pending}>{pending?'Saving…':'Save customer'}</button>
  </form>;
}
