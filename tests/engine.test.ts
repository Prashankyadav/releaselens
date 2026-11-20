import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,suite} from '../src/engine.ts';
for (const rev of ['candidate','corrected']) test(rev+' passes the existing suite',()=>{
  for (const c of suite) assert.equal(evaluate(c,rev).pass,true,c.name);
});
test('revision fixes the baseline equality defect',()=>{
  const r=evaluate({subtotal:1000,delivery:0,expected:100},'candidate');
  assert.equal(r.previous,0);assert.equal(r.actual,100);
});
test('delivery crossing threshold exposes regression',()=>{
  const r=evaluate({subtotal:950,delivery:60,expected:0},'candidate');
  assert.equal(r.previous,0);assert.equal(r.actual,100);assert.equal(r.pass,false);
});
test('corrected revision ignores delivery across boundary matrix',()=>{
  for(const subtotal of [0,949,950,999,1000,1001,1000000])
    for(const delivery of [0,1,50,60,1000])
      assert.equal(evaluate({subtotal,delivery,expected:subtotal>=1000?100:0},'corrected').pass,true);
});
test('rejects invalid monetary values and revision identifiers',()=>{
  for(const input of [{subtotal:-1},{delivery:.5},{delivery:1000001},{expected:10},{subtotal:'950'}])
    assert.throws(()=>evaluate({subtotal:950,delivery:60,expected:0,...input} as any,'candidate'));
  assert.throws(()=>evaluate({subtotal:1,delivery:0,expected:0},'unknown'));
});
