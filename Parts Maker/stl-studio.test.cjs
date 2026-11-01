const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
require('./build-stl-studio.cjs');
const html=fs.readFileSync('STL_Studio.html','utf8');
global.window=globalThis;
for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))vm.runInThisContext(m[1]);
const shape=(type='box',extra={})=>({name:type,type,kind:'solid',size:[20,20,20],position:[0,0,10],rotation:[0,0,0],...extra});
for(const type of ['box','cylinder','wedge','plate','tube']){
 const mesh=STLBuilder.result([shape(type)]);assert(Geo.meshStats(mesh).valid,type+' must be manifold');assert(Geo.meshStats(mesh).volume>0);
}
const box=shape(),hole=shape('cylinder',{kind:'hole',size:[6,6,30]});
const cut=STLBuilder.result([box,hole]);assert(Geo.meshStats(cut).volume<8000);assert.equal(Geo.meshStats(cut).shells,1);
const fused=STLBuilder.result([box,shape('box',{position:[10,0,10]})]);assert(Math.abs(Geo.meshStats(fused).volume-12000)<.01);assert.equal(Geo.meshStats(fused).shells,1);
const plate=shape('plate',{size:[60,40,4],position:[0,0,2]});const holes=[];for(const x of [-23,23])for(const y of [-13,13])holes.push(shape('cylinder',{kind:'hole',size:[4,4,8],position:[x,y,2]}));
const mount=STLBuilder.result([plate,...holes]);assert(Geo.meshStats(mount).valid);assert.equal(Geo.meshStats(mount).shells,1);
const bytes=Geo.stlBytes([{mesh:mount}],'test');assert(Geo.meshStats(Geo.parseSTL(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength))).valid);
assert.throws(()=>STLBuilder.result([hole]),/solid/);assert.throws(()=>STLBuilder.result([box,shape('box',{kind:'hole',size:[40,40,40]})]),/entire/);
assert.throws(()=>STLBuilder.validate([shape('box',{size:[NaN,20,20]})]),/Invalid/);assert.throws(()=>STLBuilder.validate([shape('box',{size:[0,20,20]})]),/at least/);
assert.throws(()=>STLBuilder.validate(Array.from({length:81},()=>shape())),/80/);
assert(Geo.meshStats(STLBuilder.result([shape('wedge',{rotation:[30,45,90]})])).valid);
console.log('STL Studio: primitives, cuts, unions, mounting plate, STL round-trip, rotations and validation passed.');
