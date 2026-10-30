// Keep the application self-contained while maintaining readable source files.
const fs=require('node:fs');let html=fs.readFileSync('Parts_Studio_V5_4.html','utf8');
function between(text,start,end,source){let a=text.indexOf(start),b=text.indexOf(end,a);if(a<0||b<0)throw Error('Source anchors not found: '+start);return text.slice(0,a)+source.trim()+'\n'+text.slice(b);}
let blueprints=fs.readFileSync('blueprints-source.js','utf8');blueprints=between(blueprints,'function sectionMesh(','function assemblySVG(',fs.readFileSync('blueprint-detail-source.js','utf8'));fs.writeFileSync('blueprints-source.js',blueprints);
html=between(html,'function drawingFeatures(','function finalize(',fs.readFileSync('drawing-features-source.js','utf8'));
html=between(html,'let projectHistory,','const assemblyWorkspace=',fs.readFileSync('studio-tools-ui.js','utf8'));
for(const [id,file] of [['assemblyWorkspaceSource','assembly-workspace-source.js'],['projectToolsSource','project-tools-source.js'],['blueprintsSource','blueprints-source.js']]){const regex=new RegExp('<script id="'+id+'">[\\s\\S]*?<\\/script>');if(!regex.test(html))throw Error('Missing script '+id);html=html.replace(regex,'<script id="'+id+'">'+fs.readFileSync(file,'utf8').trim()+'\n</script>');}
html=between(html,'const assemblyWorkspace=','// Small test/debug API:',fs.readFileSync('assembly-workspace-ui.js','utf8'));
fs.writeFileSync('Parts_Studio_V5_4.html',html);
