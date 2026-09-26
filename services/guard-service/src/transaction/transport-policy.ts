import assert from 'node:assert/strict';
export type ResultTransportPolicy = 'four-roster-result-v1';
const capability='bound-result-transport',version=1;
/** Undefined preserves the exact legacy policy shape and schema-1 contract. */
export function captureResultTransport(value: unknown): ResultTransportPolicy | undefined {
  if(value===undefined)return undefined;
  assert.equal(value,'four-roster-result-v1','Invalid Zcash result transport policy');
  return value;
}
export function assertResultTransportProfile(profile: {schema:number;resultTransport?:unknown}, policy: ResultTransportPolicy|undefined): void {
  if(policy===undefined){
    assert.equal(profile.schema,1,'legacy Zcash profile schema');
    assert.equal(profile.resultTransport,undefined,'legacy Zcash profile cannot carry result transport');
    return;
  }
  assert.equal(captureResultTransport(policy),'four-roster-result-v1');
  assert.equal(profile.schema,2,'explicit result transport requires schema 2');
  assert.deepEqual(profile.resultTransport,{capability,version},'Zcash result transport differs from trusted policy');
}
