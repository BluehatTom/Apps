/* Simple Writer document schema v2. The structured model is the source for saves,
   imports, exports, accessibility checks and reloading; contenteditable is a view. */
(() => {
'use strict';
const S = 'simple-writer', V = 2;
const defaults = {paper:'letter', orientation:'portrait', margin:0.75, spacing:0.8};
const escapeHTML = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => {try{const url=new URL(String(u||''));return ['https:','http:','mailto:'].includes(url.protocol)?url.href:''}catch{return ''}};
const safeImage = s => /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(String(s||'')) && s.length < 9000000 ? s : '';
const empty = title => ({schema:S,version:V,title:title||'Untitled document',page:{...defaults},blocks:[{type:'paragraph',runs:[{text:''}]}]});
const strings = o => typeof o==='string'?o:'';
const cleanRuns = runs => {
 if(!Array.isArray(runs))return [{text:''}];
 return runs.slice(0,20000).map(r=>{
  const x={text:String(r?.text??'').slice(0,100000)};
  for(const f of ['bold','italic','underline','strike'])if(r?.[f])x[f]=true;
  for(const f of ['color','highlight'])if(/^#[0-9a-f]{6}$/i.test(r?.[f]||''))x[f]=r[f];
  if(r?.font && /^[\w ,'-]{1,65}$/.test(r.font))x.font=r.font;
  if(+r?.size>=6&&+r?.size<=72)x.size=+r.size;
  if(r?.href&&safeUrl(r.href))x.href=safeUrl(r.href);
  return x;
 });
};
const cleanBlock = b => {
 if(!b||typeof b!=='object')return null;
 const type=['paragraph','heading','quote','list','image','table','pageBreak'].includes(b.type)?b.type:'paragraph';
 const block={type};
 if(['paragraph','heading','quote'].includes(type)){
   block.runs=cleanRuns(b.runs);
   if(type==='heading')block.level=Math.max(1,Math.min(3,Number(b.level)||1));
   if(['left','right','center','justify'].includes(b.align))block.align=b.align;
 }
 if(type==='list'){block.ordered=!!b.ordered;block.items=(b.items||[]).slice(0,500).map(item=>({runs:cleanRuns(item?.runs)}));}
 if(type==='image'){block.src=safeImage(b.src);block.alt=String(b.alt||'').slice(0,500);block.width=Math.max(80,Math.min(900,Number(b.width)||440));block.caption=String(b.caption||'').slice(0,500);}
 if(type==='table'){block.caption=String(b.caption||'').slice(0,300);block.header=!!b.header;block.widths=(Array.isArray(b.widths)?b.widths:[]).slice(0,20).map(n=>Math.max(3,Math.min(100,Number(n)||0)));block.rows=(b.rows||[]).slice(0,60).map(row=>(Array.isArray(row)?row:[]).slice(0,20).map(cell=>({runs:cleanRuns(cell?.runs)})));}
 return block;
};
const normalize = data => {
 const d=empty(typeof data?.title==='string'?data.title.slice(0,120):undefined);
 d.page={paper:data?.page?.paper==='a4'?'a4':'letter',orientation:data?.page?.orientation==='landscape'?'landscape':'portrait',margin:[.5,.75,1].includes(+data?.page?.margin)?+data.page.margin:.75,spacing:[.4,.8,1.2].includes(+data?.page?.spacing)?+data.page.spacing:.8};
 if(Array.isArray(data?.blocks)) d.blocks=data.blocks.slice(0,3000).map(cleanBlock).filter(Boolean);
 if(!d.blocks.length)d.blocks=[{type:'paragraph',runs:[{text:''}]}];
 return d;
};
function hexColor(raw){
 const v=String(raw||'').trim();
 if(/^#[0-9a-f]{6}$/i.test(v))return v.toLowerCase();
 if(/^#[0-9a-f]{3}$/i.test(v))return '#'+v.slice(1).split('').map(x=>x+x).join('').toLowerCase();
 const m=v.match(/^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/i);
 return m?'#'+[m[1],m[2],m[3]].map(n=>Math.min(255,Number(n)).toString(16).padStart(2,'0')).join(''):'';
}
function appendRun(runs,mark,text){
 if(!text)return;
 const newRun={text,...mark};
 const last=runs[runs.length-1];
 if(last && JSON.stringify({...last,text:''})===JSON.stringify({...newRun,text:''})){last.text+=text;}else runs.push(newRun);
}
function readInline(container){
 const runs=[];
 function walk(node,mark={}){
  if(node.nodeType===3){appendRun(runs,mark,node.nodeValue||'');return;}
  if(node.nodeType!==1)return;
  const tag=node.tagName;
  if(['SCRIPT','STYLE','IFRAME','SVG','BUTTON','INPUT','NOSCRIPT'].includes(tag))return;
  if(tag==='BR'){appendRun(runs,mark,'\n');return;}
  if(tag==='IMG')return;
  const next={...mark};
  if(['B','STRONG'].includes(tag))next.bold=true;
  if(['I','EM'].includes(tag))next.italic=true;
  if(tag==='U')next.underline=true;
  if(['STRIKE','S','DEL'].includes(tag))next.strike=true;
  if(tag==='A'){const href=safeUrl(node.getAttribute('href'));if(href)next.href=href;}
  if(tag==='FONT'){
   if(node.getAttribute('face'))next.font=node.getAttribute('face').slice(0,65);
   if(node.getAttribute('color')){const color=hexColor(node.getAttribute('color'));if(color)next.color=color;}
   if(node.getAttribute('size'))next.size=({1:8,2:10,3:12,4:14,5:18,6:24,7:36})[node.getAttribute('size')]||12;
  }
  const style=node.style||{};
  if(style.color){const c=hexColor(style.color);if(c)next.color=c;}
  if(style.backgroundColor){const c=hexColor(style.backgroundColor);if(c)next.highlight=c;}
  if(style.fontFamily)next.font=style.fontFamily.replace(/["']/g,'').split(',')[0].trim().slice(0,65);
  if(style.fontSize){const value=parseFloat(style.fontSize);if(value>0)next.size=Math.round((/px$/i.test(style.fontSize)?value*0.75:value)*10)/10;}
  if(style.fontWeight && (style.fontWeight==='bold'||Number(style.fontWeight)>=600))next.bold=true;
  if(style.fontStyle==='italic')next.italic=true;
  if(style.textDecoration?.includes('underline')||style.textDecorationLine?.includes('underline'))next.underline=true;
  if(style.textDecoration?.includes('line-through')||style.textDecorationLine?.includes('line-through'))next.strike=true;
  for(const child of Array.from(node.childNodes))walk(child,next);
 }
 for(const child of Array.from(container.childNodes||[]))walk(child);
 return cleanRuns(runs.length?runs:[{text:''}]);
}
function parseAlign(node){const a=(node.style?.textAlign||node.getAttribute?.('align')||'').toLowerCase();return ['center','right','justify'].includes(a)?a:'left';}
function extractBlocks(container){
 const result=[];
 function add(node){
  if(node.nodeType===3){if(node.nodeValue.trim())result.push({type:'paragraph',runs:[{text:node.nodeValue}]});return;}
  if(node.nodeType!==1)return;
  const tag=node.tagName;
  if(['SCRIPT','STYLE','IFRAME','INPUT','BUTTON','META','NOSCRIPT'].includes(tag))return;
  if(node.dataset?.pageBreak!==undefined){result.push({type:'pageBreak'});return;}
  if(tag==='IMG' || tag==='FIGURE'){
   const img=tag==='IMG'?node:node.querySelector('img');
   if(img){const src=safeImage(img.getAttribute('src'));if(src)result.push({type:'image',src,alt:img.getAttribute('alt')||'',width:parseInt(img.style.width||img.getAttribute('width'),10)||440,caption:node.querySelector('figcaption')?.textContent||''});}
   return;
  }
  if(tag==='TABLE'){
   const rows=Array.from(node.querySelectorAll('tr')).map(tr=>Array.from(tr.children).filter(x=>/^(TH|TD)$/.test(x.tagName)).map(c=>({runs:readInline(c)})));
   const widths=Array.from(node.querySelectorAll('colgroup col')).map(col=>parseFloat(col.style.width)||0);result.push({type:'table',caption:node.querySelector('caption')?.textContent||'',header:!!node.querySelector('tr:first-child th'),rows,widths});return;
  }
  if(tag==='UL'||tag==='OL'){
   const items=Array.from(node.children).filter(c=>c.tagName==='LI').map(li=>({runs:readInline(li)}));
   result.push({type:'list',ordered:tag==='OL',items});return;
  }
  if(/^H[1-3]$/.test(tag)){result.push({type:'heading',level:Number(tag[1]),runs:readInline(node),align:parseAlign(node)});return;}
  if(tag==='BLOCKQUOTE'){result.push({type:'quote',runs:readInline(node),align:parseAlign(node)});return;}
  if(['P','DIV','LI'].includes(tag)){
    if(node.children.length===1 && ['P','DIV','UL','OL','TABLE','FIGURE'].includes(node.firstElementChild?.tagName)){
      for(const ch of node.childNodes)add(ch);return;
    }
    result.push({type:'paragraph',runs:readInline(node),align:parseAlign(node)});return;
  }
  if(tag==='BR'){result.push({type:'paragraph',runs:[{text:''}]});return;}
  if(tag==='BODY'||tag==='MAIN'||tag==='SECTION'||tag==='ARTICLE'||tag==='DOCUMENT'||tag==='FORM'){
   for(const child of node.childNodes)add(child);return;
  }
  if(node.querySelector('p,h1,h2,h3,ul,ol,table,figure')){for(const ch of node.childNodes)add(ch);return;}
  result.push({type:'paragraph',runs:readInline(node)});
 }
 for(const child of Array.from(container.childNodes||[]))add(child);
 return result.length?result:[{type:'paragraph',runs:[{text:''}]}];
}
function fromDOM(editor,prior={}){return normalize({...prior,blocks:extractBlocks(editor)});}
function fromHTML(html,title='Imported document'){
 const doc=new DOMParser().parseFromString(String(html),'text/html');
 const json=doc.getElementById('simple-writer-model');
 if(json){try{const parsed=JSON.parse(json.textContent);if(parsed?.schema===S)return normalize(parsed);}catch{}}
 const wrapper=doc.getElementById('simple-writer-document')||doc.body;
 return normalize({title:doc.title||title,blocks:extractBlocks(wrapper)});
}
function appendRuns(element,runs){
 for(const r of cleanRuns(runs)){
  const base=document.createElement('span');
  base.textContent=r.text;
  if(r.bold)base.style.fontWeight='bold';if(r.italic)base.style.fontStyle='italic';
  if(r.underline||r.strike)base.style.textDecoration=[r.underline?'underline':'',r.strike?'line-through':''].filter(Boolean).join(' ');
  if(r.color)base.style.color=r.color;if(r.highlight)base.style.backgroundColor=r.highlight;
  if(r.font)base.style.fontFamily=r.font;if(r.size)base.style.fontSize=r.size+'pt';
  if(r.href){const a=document.createElement('a');a.href=r.href;a.appendChild(base);element.appendChild(a);}else element.appendChild(base);
 }
}
function createBlocks(doc){const frag=document.createDocumentFragment();
 for(const b of normalize(doc).blocks){
  if(['paragraph','heading','quote'].includes(b.type)){
   const tag=b.type==='heading'?'h'+b.level:b.type==='quote'?'blockquote':'p';
   const el=document.createElement(tag);el.style.textAlign=b.align||'left';appendRuns(el,b.runs);
   if(!(el.textContent||'').length)el.appendChild(document.createElement('br'));
   frag.appendChild(el);
  }else if(b.type==='list'){
   const list=document.createElement(b.ordered?'ol':'ul');
   for(const item of b.items||[]){const li=document.createElement('li');appendRuns(li,item.runs);list.appendChild(li)}frag.appendChild(list);
  }else if(b.type==='image'){
   if(!safeImage(b.src))continue;
   const fig=document.createElement('figure'), img=document.createElement('img');
   img.src=b.src;img.alt=b.alt||'';img.style.width=Math.min(900,Number(b.width)||440)+'px';img.width=Math.min(900,Number(b.width)||440);
   fig.appendChild(img);if(b.caption){const cap=document.createElement('figcaption');cap.textContent=b.caption;fig.appendChild(cap)}frag.appendChild(fig);
  }else if(b.type==='table'){
   const table=document.createElement('table');
   if(b.caption){const cap=document.createElement('caption');cap.textContent=b.caption;table.appendChild(cap)}
   if(b.widths?.length){const group=document.createElement('colgroup');for(const width of b.widths){const c=document.createElement('col');c.style.width=width+'%';group.append(c)}table.append(group)}
   const body=document.createElement('tbody');
   b.rows.forEach((row,i)=>{const tr=document.createElement('tr');row.forEach(cell=>{const td=document.createElement(b.header&&i===0?'th':'td');if(b.header&&i===0)td.scope='col';appendRuns(td,cell.runs);if(!td.textContent)td.appendChild(document.createElement('br'));tr.appendChild(td)});body.appendChild(tr)});
   table.appendChild(body);frag.appendChild(table);
  }else if(b.type==='pageBreak'){
   const div=document.createElement('div');div.dataset.pageBreak='';div.contentEditable='false';div.setAttribute('aria-label','Page break');frag.appendChild(div);
  }
 }
 return frag;
}
function toEditor(editor,doc){editor.replaceChildren(createBlocks(doc));}
function inlineHTML(runs){return cleanRuns(runs).map(r=>{
 let t=escapeHTML(r.text).replace(/\n/g,'<br>');
 if(r.bold)t='<strong>'+t+'</strong>';if(r.italic)t='<em>'+t+'</em>';
 if(r.underline)t='<u>'+t+'</u>';if(r.strike)t='<s>'+t+'</s>';
 const props=[];if(r.color)props.push('color:'+r.color);if(r.highlight)props.push('background-color:'+r.highlight);
 if(r.font)props.push('font-family:'+escapeHTML(r.font));if(r.size)props.push('font-size:'+r.size+'pt');
 if(props.length)t='<span style="'+props.join(';')+'">'+t+'</span>';
 if(r.href)t='<a href="'+escapeHTML(r.href)+'">'+t+'</a>';return t;
 }).join('');}
function blocksHTML(model){
 return normalize(model).blocks.map(b=>{
  if(['paragraph','heading','quote'].includes(b.type)){const t=b.type==='heading'?'h'+b.level:b.type==='quote'?'blockquote':'p';return `<${t} style="text-align:${b.align||'left'}">${inlineHTML(b.runs)||'<br>'}</${t}>`;}
  if(b.type==='list'){const tag=b.ordered?'ol':'ul';return `<${tag}>${b.items.map(it=>'<li>'+inlineHTML(it.runs)+'</li>').join('')}</${tag}>`;}
  if(b.type==='table'){return '<table>'+(b.widths?.length?'<colgroup>'+b.widths.map(n=>'<col style="width:'+n+'%">').join('')+'</colgroup>':'')+(b.caption?'<caption>'+escapeHTML(b.caption)+'</caption>':'')+b.rows.map((row,i)=>'<tr>'+row.map(c=>{const t=b.header&&i===0?'th':'td';return `<${t}${t==='th'?' scope="col"':''}>${inlineHTML(c.runs)||'&nbsp;'}</${t}>`}).join('')+'</tr>').join('')+'</table>';}
  if(b.type==='image')return safeImage(b.src)?`<figure><img alt="${escapeHTML(b.alt)}" src="${escapeHTML(b.src)}" width="${b.width||440}" style="max-width:100%;width:${b.width||440}px;height:auto">${b.caption?'<figcaption>'+escapeHTML(b.caption)+'</figcaption>':''}</figure>`:'';
  if(b.type==='pageBreak')return '<div class="page-break" data-page-break=""></div>';
  return '';
 }).join('\n');
}
function toHTML(model){
 const d=normalize(model),title=escapeHTML(d.title);
 const modelJSON=JSON.stringify(d).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const paper=d.page.paper==='a4'?'A4':'letter',size=paper+(d.page.orientation==='landscape'?' landscape':'');
 return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>\n<style>body{font:16px/1.55 Arial,sans-serif;color:#202020;max-width:7.5in;margin:35px auto;padding:0 18px}p{margin:0 0 ${d.page.spacing}em}h1,h2,h3{line-height:1.3}figure{text-align:center;margin:16px 0}figcaption{font-size:.85em;color:#4e5964}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #899bab;padding:7px;text-align:left}th{background:#edf3f9}blockquote{border-left:4px solid #c2d0da;padding-left:12px}.page-break{break-before:page;page-break-before:always}@page{size:${size};margin:${d.page.margin}in}@media print{body{max-width:none;margin:0;padding:0}}</style></head><body><main id="simple-writer-document">\n${blocksHTML(d)}\n</main><script id="simple-writer-model" type="application/json">${modelJSON}</script></body></html>`;
}
function toText(model){return normalize(model).blocks.map(b=>{
 const txt=runs=>(runs||[]).map(x=>x.text).join('');
 if(['paragraph','heading','quote'].includes(b.type))return txt(b.runs);
 if(b.type==='list')return b.items.map((i,k)=>(b.ordered?(k+1)+'. ':'• ')+txt(i.runs)).join('\n');
 if(b.type==='table')return (b.caption?b.caption+'\n':'')+b.rows.map(row=>row.map(c=>txt(c.runs)).join('\t')).join('\n');
 if(b.type==='image')return (b.caption||b.alt)?'[Image: '+(b.caption||b.alt)+']':'';
 if(b.type==='pageBreak')return '\f';return '';
 }).join('\n\n').trim();}
function toMarkdown(model){
 const rtxt=rs=>cleanRuns(rs).map(r=>{let t=r.text.replace(/([\\`*_\[\]])/g,'\\$1');if(r.bold)t='**'+t+'**';if(r.italic)t='*'+t+'*';if(r.strike)t='~~'+t+'~~';if(r.href)t='['+t+']('+r.href+')';return t}).join('');
 return normalize(model).blocks.map(b=>{
  if(b.type==='heading')return '#'.repeat(b.level)+' '+rtxt(b.runs);
  if(b.type==='paragraph')return rtxt(b.runs);
  if(b.type==='quote')return '> '+rtxt(b.runs);
  if(b.type==='list')return b.items.map((it,i)=>(b.ordered?(i+1)+'. ':'- ')+rtxt(it.runs)).join('\n');
  if(b.type==='image')return '!['+(b.alt||'').replace(/]/g,'')+']('+b.src+')'+(b.caption?'\n*'+b.caption+'*':'');
  if(b.type==='table'){const rows=b.rows.map(row=>'| '+row.map(c=>rtxt(c.runs).replace(/\|/g,'\\|')).join(' | ')+' |');return [b.caption?'*'+b.caption+'*':'',rows[0]||'',(b.rows[0]||[]).length?'| '+b.rows[0].map(()=>'---').join(' | ')+' |':'',...rows.slice(1)].filter(Boolean).join('\n');}
  if(b.type==='pageBreak')return '\n---\n';return '';
 }).join('\n\n').trim()+'\n';}
function fromMarkdown(markdown,title){
 const lines=String(markdown).replace(/\r\n?/g,'\n').split('\n'),blocks=[];let text=[];
 const push=()=>{if(text.length){blocks.push({type:'paragraph',runs:[{text:text.join('\n')}]});text=[];}};
 for(let i=0;i<lines.length;i++){
  const ln=lines[i];if(!ln.trim()){push();continue;}
  const head=ln.match(/^(#{1,3})\s+(.*)$/);if(head){push();blocks.push({type:'heading',level:head[1].length,runs:[{text:head[2]}]});continue;}
  const li=ln.match(/^\s*(?:([-*])|(\d+)\.)\s+(.*)$/);if(li){push();const ordered=!!li[2];const prev=blocks.at(-1);if(prev?.type==='list'&&prev.ordered===ordered)prev.items.push({runs:[{text:li[3]}]});else blocks.push({type:'list',ordered,items:[{runs:[{text:li[3]}]}]});continue;}
  if(/^>\s?/.test(ln)){push();blocks.push({type:'quote',runs:[{text:ln.replace(/^>\s?/,'')}]});continue;}
  if(/^---+$/.test(ln)){push();blocks.push({type:'pageBreak'});continue;}
  text.push(ln);
 }push();return normalize({title,blocks});
}
function fromText(text,title){return normalize({title,blocks:String(text).replace(/\r\n?/g,'\n').split(/\n\n+/).map(para=>({type:'paragraph',runs:[{text:para}]}))});}
function makeTemplate(kind){const d=empty();const b=(type,text,level)=>({type,runs:[{text}],...(level?{level}:{})});
 switch(kind){
 case 'letter':d.title='Business letter';d.blocks=[b('paragraph','Your Name\nYour Address\nCity, State ZIP'),b('paragraph','Date'),b('paragraph','Recipient Name\nOrganization\nAddress'),b('paragraph','Dear Recipient:'),b('paragraph','Write your letter here.'),b('paragraph','Sincerely,\nYour Name')];break;
 case 'memo':d.title='Memo';d.blocks=[b('heading','Memorandum',1),b('paragraph','To: \nFrom: \nDate: \nSubject: '),b('heading','Purpose',2),b('paragraph','Describe the purpose of this memo.'),b('heading','Next steps',2),b('paragraph','List next steps.')];break;
 case 'report':d.title='Report';d.blocks=[b('heading','Report title',1),b('paragraph','Prepared by: \nDate: '),b('heading','Executive summary',2),b('paragraph','Summarize the main findings.'),b('heading','Background',2),b('paragraph','Explain the context.'),b('heading','Findings',2),b('paragraph','Present the evidence.'),b('heading','Recommendations',2),b('paragraph','Summarize recommended actions.')];break;
 default:d.blocks=[b('paragraph','')];
 }
 return normalize(d);
}
window.WriterModel={empty,normalize,fromDOM,fromHTML,fromText,fromMarkdown,toEditor,toText,toMarkdown,toHTML,blocksHTML,createBlocks,escapeHTML,makeTemplate,safeImage,safeUrl};
})();
