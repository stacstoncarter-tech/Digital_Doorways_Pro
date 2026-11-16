import test from 'node:test';
import assert from 'node:assert/strict';
import {serviceTimeToIso,serviceLocalTime} from '../lib/schedule-time.ts';
test('3–5pm Eastern survives save/reload in winter and summer',()=>{
 for (const [day,offset] of [['2026-11-10',5],['2026-07-10',4]]) {
  for (const hour of [15,17]) {
   const local=day+'T'+hour+':00';
   const iso=serviceTimeToIso(local);
   assert.equal(iso,day+'T'+(hour+offset)+':00:00.000Z');
   assert.equal(serviceLocalTime(iso),local);
  }
 }
});
test('invalid dates and nonexistent spring DST wall time are rejected',()=>{
 for(const value of ['2026-03-08T02:30','2026-02-30T15:00','invalid'])assert.equal(serviceTimeToIso(value),null);
});
