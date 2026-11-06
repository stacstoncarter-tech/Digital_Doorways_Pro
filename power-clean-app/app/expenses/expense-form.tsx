'use client';
import {useActionState} from 'react';
import {addExpense} from '@/app/equipment/actions';
export default function ExpenseForm({equipment}:{equipment:{id:string;name:string}[]}){const [state,action,pending]=useActionState(addExpense,{error:'',success:''});return <details><summary>Record an expense</summary><form action={action} style={{display:'grid',gap:10,maxWidth:580,marginTop:12}}>
 <label>Category<select name="category">{['fuel','chemicals','equipment','repairs','insurance','marketing','apparel','software','legal','supplies','labor','other'].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
 <label>Description<input name="description" maxLength={1000} required/></label><label>Vendor<input name="vendor" maxLength={150}/></label>
 <label>Amount ($)<input name="amount" type="number" min=".01" step=".01" required/></label>
 <label>Expense date<input name="incurred_at" type="date" required/></label>
 <label>Related equipment (optional)<select name="equipment_id"><option value="">Not linked</option>{equipment.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
 <button className="primary" disabled={pending}>Save expense</button>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}
 </form></details>}
