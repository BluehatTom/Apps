(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
class Workspace{
 constructor(){this.items=[];this.nextId=1;}
 add(model,partIndex=null){
  const parts=(partIndex===null?model.parts:[model.parts[partIndex]]);
  if(!parts.length||parts.some(p=>!p||!p.valid))throw Error('Choose valid geometry before adding it to the workspace.');
  const item={id:this.nextId++,name:partIndex===null?model.settings.tool+' assembly':parts[0].name,position:[0,0,0],rotation:[0,0,0],visible:true,parts:parts.map(p=>({name:p.name,mesh:copy(p.assembly)}))};
  const b=root.Geo.bounds(item.parts.flatMap(p=>p.mesh.vertices));item.pivot=b.min.map((x,k)=>(x+b.max[k])/2);
  if(this.items.length){const existing=this.meshes(),max=Math.max(...existing.map(p=>root.Geo.bounds(p.mesh.vertices).max[0]));if(Number.isFinite(max))item.position[0]=max+15-b.min[0];}
  this.items.push(item);return item;
 }
 transform(item,v){let p=v.slice();for(let axis=0;axis<3;axis++)p=root.Geo.rotatePoint(p,axis,item.rotation[axis],item.pivot);return p.map((x,k)=>x+item.position[k]);}
 meshes(){return this.items.filter(i=>i.visible).flatMap(i=>i.parts.map(p=>({itemId:i.id,name:p.name,mesh:{vertices:p.mesh.vertices.map(v=>this.transform(i,v)),faces:p.mesh.faces}})));}
 test(clearance=0){
  if(!Number.isFinite(clearance)||clearance<0)throw Error('Clearance must be a nonnegative number.');
  const parts=this.meshes().map(p=>({...p,bounds:root.Geo.bounds(p.mesh.vertices)})),results=[];
  for(let a=0;a<parts.length;a++)for(let b=a+1;b<parts.length;b++){
   const p=parts[a],q=parts[b];if(p.itemId===q.itemId)continue;
   const overlap=p.bounds.min.map((x,k)=>Math.min(p.bounds.max[k],q.bounds.max[k])-Math.max(x,q.bounds.min[k]));
   const gap=Math.hypot(...overlap.map(x=>Math.max(0,-x)));
   if(overlap.every(x=>x>1e-6)||gap<=clearance+1e-6)results.push({a:p.itemId,b:q.itemId,partA:p.name,partB:q.name,kind:overlap.every(x=>x>1e-6)?'Possible interference':gap<1e-6?'Envelope contact':'Within clearance',gap});
  }return results;
 }
 combine(ids,merge=false){
  const chosen=this.items.filter(i=>ids.includes(i.id));
  if(chosen.length<2||chosen.some(i=>!i.visible))throw Error('Choose two visible items.');
  let parts=chosen.flatMap(i=>i.parts.map(p=>({name:p.name,mesh:{vertices:p.mesh.vertices.map(v=>this.transform(i,v)),faces:copy(p.mesh.faces)}})));
  if(merge){
   if(parts.reduce((n,p)=>n+p.mesh.faces.length,0)>12000)throw Error('Merge supports up to 12,000 triangles. Join these items as a group instead.');
   const mesh=root.Geo.toMesh(root.Geo.union(parts.map(p=>root.Geo.solidFromMesh(p.mesh))));
   if(!root.Geo.meshStats(mesh).valid)throw Error('Merge could not produce a valid solid. Adjust overlap and try again.');
   parts=[{name:'Merged solid',mesh}];
  }
  const b=root.Geo.bounds(parts.flatMap(p=>p.mesh.vertices)),item={id:this.nextId++,name:merge?'Merged solid':'Joined group',parts,position:[0,0,0],rotation:[0,0,0],pivot:b.min.map((x,k)=>(x+b.max[k])/2),visible:true};
  this.items=this.items.filter(i=>!ids.includes(i.id));this.items.push(item);return item;
 }
 ungroup(id){
  const item=this.items.find(i=>i.id===id);if(!item||item.parts.length<2)throw Error('Select a group with multiple components.');
  const items=item.parts.map(p=>{const mesh={vertices:p.mesh.vertices.map(v=>this.transform(item,v)),faces:copy(p.mesh.faces)},b=root.Geo.bounds(mesh.vertices);return {id:this.nextId++,name:p.name,parts:[{name:p.name,mesh}],position:[0,0,0],rotation:[0,0,0],pivot:b.min.map((x,k)=>(x+b.max[k])/2),visible:item.visible};});
  this.items=this.items.filter(i=>i.id!==id);this.items.push(...items);return items;
 }
 align(id,target,axis,contact=false){
  const a=this.items.find(i=>i.id===id),b=this.items.find(i=>i.id===target);if(!a||!b||a===b||![0,1,2].includes(axis))throw Error('Choose a different target item and an axis.');
  const bounds=i=>root.Geo.bounds(i.parts.flatMap(p=>p.mesh.vertices.map(v=>this.transform(i,v)))),ab=bounds(a),bb=bounds(b);
  a.position[axis]+=contact?bb.max[axis]-ab.min[axis]:(bb.min[axis]+bb.max[axis]-ab.min[axis]-ab.max[axis])/2;
 }
 serialize(){return JSON.stringify({application:'Parts Studio Assembly',version:1,items:this.items},null,2);}
 load(text){
  const data=JSON.parse(text),vec=v=>Array.isArray(v)&&v.length===3&&v.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e7);
  if(data.application!=='Parts Studio Assembly'||data.version!==1||!Array.isArray(data.items)||data.items.length>200)throw Error('Unsupported assembly file.');
  const ids=new Set();let vertices=0,faces=0;
  for(const i of data.items){
   if(!Number.isSafeInteger(i.id)||i.id<1||ids.has(i.id)||typeof i.name!=='string'||i.name.length>200||!vec(i.position)||!vec(i.rotation)||!vec(i.pivot)||typeof i.visible!=='boolean'||!Array.isArray(i.parts)||!i.parts.length)throw Error('Invalid assembly item.');ids.add(i.id);
   for(const p of i.parts){const m=p.mesh;if(typeof p.name!=='string'||!m||!Array.isArray(m.vertices)||!m.vertices.length||!Array.isArray(m.faces)||!m.faces.length)throw Error('Invalid assembly mesh.');vertices+=m.vertices.length;faces+=m.faces.length;if(vertices>1000000||faces>2000000||!m.vertices.every(vec)||!m.faces.every(f=>Array.isArray(f)&&f.length===3&&f.every(n=>Number.isInteger(n)&&n>=0&&n<m.vertices.length)))throw Error('Invalid or oversized assembly mesh.');if(!root.Geo.meshStats(m).valid)throw Error('Assembly contains invalid mesh geometry.');}
  }
  this.items=copy(data.items);this.nextId=Math.max(0,...ids)+1;return this;
 }
}
root.AssemblyWorkspace={Workspace};
})(typeof window==='undefined'?globalThis:window);
