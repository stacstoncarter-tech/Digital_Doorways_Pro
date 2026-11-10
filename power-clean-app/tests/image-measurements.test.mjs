import test from 'node:test';
import assert from 'node:assert/strict';
import {extractMeasurements} from '../lib/smart-estimate/image-measurements.ts';
import {geometry,newArea,parseDraft,defaults} from '../lib/smart-estimate/engine.ts';
test('extracts explicit area labels without prices or phone numbers',()=>{assert.deepEqual(extractMeasurements('$1,500 352-555-0100'),[]);assert.deepEqual(extractMeasurements('Driveway 1,250 sq. ft. Patio 400 ft²').map(x=>x.squareFeet),[1250,400]);});
test('feet inches dimensions produce 615 square feet',()=>{assert.equal(extractMeasurements('20′ 6″ × 30 ft')[0].squareFeet,615);assert.equal(extractMeasurements('20 ft x 30 ft')[0].squareFeet,600);assert.deepEqual(extractMeasurements('20 x 30'),[]);});
test('invalid inches rejected and multiple labels remain independent',()=>{assert.deepEqual(extractMeasurements('20 ft 13 in x 30 ft'),[]);assert.equal(extractMeasurements('100 sqft and 200 square feet').length,2);});
test('confirmed image area feeds engine and survives snapshot',()=>{const a={...newArea(),confirmedSquareFeet:1250,measurementSource:'1,250 sq ft'};assert.equal(geometry(a).area,1250);const d=parseDraft({version:1,customerId:'',serviceAddressId:'',notes:'',areas:[a],config:defaults()});assert.equal(d.areas[0].confirmedSquareFeet,1250);assert.throws(()=>geometry({...a,confirmedSquareFeet:NaN}));assert.throws(()=>geometry({...a,kind:'stairs'}));});
