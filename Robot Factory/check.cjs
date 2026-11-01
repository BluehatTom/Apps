const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',style:{},dataset:{},selectedOptions:[{textContent:'Part'}],classList:{toggle(){},add(){},remove(){}},addEventListener(){},closest(){return {style:{}}},replaceChildren(){},append(){},getBoundingClientRect(){return {width:0}},click(){}});return elements.get(id)};
const ctx={document:{getElementById:element,querySelector:element,querySelectorAll:()=>[],createElement:()=>element(Math.random())},localStorage:{getItem:()=>null,setItem(){}},ResizeObserver:class{observe(){}},window:{},console};vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/purpose.js','utf8')+'\npurposeMarkup=()=>{};',ctx);vm.runInContext(fs.readFileSync('dist/app.js','utf8'),ctx);
vm.runInContext(`
for(const part of Object.keys(partNames))for(const extreme of [false,true]){
 const family=Object.keys(families).find(f=>families[f].parts.includes(part));
 state=valid({...defaults,family,part,...(extreme?{length:30,width:20,thickness:40,hole:16}:{})});makeMesh();
 const edges=new Map();let signed=0;
 for(const t of mesh){if(Math.hypot(...normal(t))<1e-8)throw Error('Degenerate triangle');for(let i=0;i<3;i++){let a=t[i].map(x=>x.toFixed(6)).join(','),b=t[(i+1)%3].map(x=>x.toFixed(6)).join(',');const key=[a,b].sort().join('|');const e=edges.get(key)||[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(key,e)}const [a,b,c]=t;signed+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}
 for(const [key,[count,direction]] of edges)if(count!==2||direction!==0)throw Error(part+' non-manifold edge '+key);
 if(signed<=0)throw Error(part+' inward normals');
 console.log(part,extreme?'minimum size':'default',mesh.length+' triangles','closed, oriented, positive volume');
}
for(const family of Object.keys(families))for(const board of ['uno','esp32','pico']){state=valid({...defaults,family,board});update();if(new Set(boards[board].pins).size!==6)throw Error('Pin conflict');if(['rover','tracked'].includes(family)&&!firmware().includes('500'))throw Error('Missing watchdog');if(['arm','turret'].includes(family)&&(!firmware().includes('1000')||firmware().includes('A_PWM')))throw Error('Wrong servo template');if(['walker','gantry'].includes(family)&&!firmware().includes('motion disabled'))throw Error('Scaffold not labeled');if(valid(JSON.parse(JSON.stringify(state))).family!==family)throw Error('Round trip');console.log(family,board,'firmware and UI generation passed')}
state={...defaults,family:'arm'};const small=armLoads(state);if(armLoads({...state,payload:2}).shoulder<=small.shoulder)throw Error('Payload must increase torque');if(armLoads({...state,upperLength:300}).shoulder<=small.shoulder)throw Error('Reach must increase torque');if(preset({...state,upperLength:250},'upper').length!==274)throw Error('Preset not linked');console.log('Arm load scaling, purpose presets, and project round trips passed');
`,ctx);

