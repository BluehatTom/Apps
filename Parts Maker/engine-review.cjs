const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('Parts_Studio_V5_4.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
scripts.forEach(s => new vm.Script(s));
vm.runInThisContext(scripts[0]);
vm.runInThisContext(scripts[1]);
function overlaps(raw) {
  const collisions = [];
  for (let i=0;i<raw.length;i++) for(let j=i+1;j<raw.length;j++) {
    const a=raw[i].closed||raw[i].solid,b=raw[j].closed||raw[j].solid;
    if(!a||!b) continue;
    const ab=a.bounds(),bb=b.bounds();
    if(ab.min.some((v,k)=>Math.min(ab.max[k],bb.max[k])-Math.max(v,bb.min[k])<1e-5))continue;
    const volume=Math.abs(a.intersect(b).volume());
    if(volume>.01)collisions.push([raw[i].name,raw[j].name,Math.round(volume*1000)/1000]);
  }
  return collisions;
}
if(require.main===module){
  for(const joint of ['tab','finger','flush','adhesive','dovetail','snap','screw'])
    for(const opening of ['removable','sliding','magnet','pin']){
      try {const r=Designs.buildBox({...Designs.defaults,joint,opening});const c=overlaps(r.raw);console.log(JSON.stringify({joint,opening,collisions:c}));}
      catch(e){console.log(JSON.stringify({joint,opening,error:e.message}));}
    }
}
module.exports={html,scripts,overlaps,G:Geo,D:Designs};
