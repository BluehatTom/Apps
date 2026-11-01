const fs=require('node:fs');
const html=fs.readFileSync('Parts_Studio_V5_4.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
const geo=scripts.find(s=>s.includes('root.Geo={'));
const viewer=scripts.find(s=>s.includes('class MeshViewer'));
if(!geo||!viewer)throw Error('Missing geometry or viewer source');
fs.writeFileSync('STL_Studio.html',fs.readFileSync('stl-studio-template.html','utf8').replace('<!-- ENGINE -->','<script>'+geo+'</script><script>'+viewer+'</script>').replace('<!-- BUILDER -->','<script>'+fs.readFileSync('stl-studio.js','utf8')+'</script>'));
