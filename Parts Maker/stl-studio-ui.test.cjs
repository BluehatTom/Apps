const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {G}=require('./engine-review.cjs');
const nodes=new Map(),handlers={},disk=new Map(),downloads=[];
function node(id){if(!nodes.has(id))nodes.set(id,{id,tagName:'DIV',value:id==='snap'?'1':'',children:[],hidden:false,disabled:false,append(...children){this.children.push(...children);},replaceChildren(){this.children=[];},setAttribute(){},addEventListener(){},click(){this.onclick?.();if(this.download)downloads.push(this.download);}});return nodes.get(id);}
const ctx={Geo:G,console,Blob,setTimeout:fn=>fn(),URL:{createObjectURL:()=>'',revokeObjectURL(){}},confirm:()=>true,localStorage:{getItem:k=>disk.get(k),setItem:(k,v)=>disk.set(k,v)},document:{getElementById:node,createElement:tag=>{const el={...node(Symbol()),tagName:tag.toUpperCase()};Object.defineProperty(el,'id',{set(value){nodes.set(value,el);}});return el;},querySelectorAll:()=>[],addEventListener:(k,fn)=>handlers[k]=fn},MeshViewer:class{setMeshes(m){ctx.meshes=m;}draw(){}reset(){} }};
ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('stl-studio.js','utf8'),ctx);
const key=(key,extra={})=>handlers.keydown({key,target:{tagName:'BODY'},preventDefault(){},...extra});
assert(node('properties').hidden);key('b');assert.equal(ctx.meshes.length,1);assert(!node('properties').hidden);
node('size0').value='40';node('size0').onchange();assert.equal(G.bounds(ctx.meshes[0].mesh.vertices).size[0],40);
key('ArrowRight',{shiftKey:true});assert.equal(node('position0').value,10);
node('duplicate').click();assert.equal(ctx.meshes.length,2);node('undo').click();assert.equal(ctx.meshes.length,1);node('redo').click();assert.equal(ctx.meshes.length,2);
node('delete').click();node('size0').value='-5';node('size0').onchange();assert.equal(node('size0').value,40);assert.match(node('status').textContent,/at least/);
node('new').click();assert.equal(ctx.meshes.length,0);node('starter').click();assert.equal(ctx.meshes.length,5);node('preview').click();assert.equal(ctx.meshes.length,1);assert(G.meshStats(ctx.meshes[0].mesh).valid);
node('export').click();assert(downloads.includes('my-design.stl'));node('save').click();assert(downloads.includes('my-stl-design.json'));
assert.equal(JSON.parse(disk.get('parts-stl-studio-v1')).length,5);
key('b',{target:{tagName:'INPUT'}});assert.equal(JSON.parse(disk.get('parts-stl-studio-v1')).length,5);
console.log('STL Studio UI: empty state, shortcuts, dimensions, undo/redo, invalid edits, starter, preview, export and autosave passed.');

