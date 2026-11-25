/* File converters for the Simple Writer v2 structured document model. */
(() => {
'use strict';
const M = window.WriterModel;
const textOf = runs => (runs||[]).map(x=>x.text||'').join('');
const support = {
 docx:'https://cdn.jsdelivr.net/npm/docx@9.16.0/dist/index.iife.js',
 mammoth:'https://cdn.jsdelivr.net/npm/mammoth@1.13.0/mammoth.browser.min.js'
};
const loading = {};
function ensureLibrary(name){
 if(window[name])return Promise.resolve(window[name]);
 if(loading[name])return loading[name];
 loading[name]=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=support[name];script.async=true;
  let finished=false;
  const timer=setTimeout(()=>done(Error('Could not reach the '+name+' converter. Connect to the internet and try again.')),15000);
  function done(error){if(finished)return;finished=true;clearTimeout(timer);if(error){script.remove();reject(error)}else if(window[name])resolve(window[name]);else reject(Error(name+' converter unavailable.'))}
  script.onload=()=>done(null);script.onerror=()=>done(Error('Could not load the '+name+' conversion library. Check your internet connection.'));
  document.head.append(script);
 }).catch(error=>{delete loading[name];throw error});
 return loading[name];
}
function rtfQuote(s){
 let out='';for(const ch of String(s??'')){
  const cp=ch.codePointAt(0);
  if(ch==='\\')out+='\\\\';else if(ch==='{')out+='\\{';else if(ch==='}')out+='\\}';
  else if(ch==='\n')out+='\\line ';
  else if(cp<128)out+=ch;
  else if(cp>0xffff){const v=cp-0x10000;for(const n of [0xd800+(v>>10),0xdc00+(v&1023)])out+='\\u'+(n>32767?n-65536:n)+'?';}
  else out+='\\u'+(cp>32767?cp-65536:cp)+'?';
 }return out;
}
function exportRTF(model){
 const doc=M.normalize(model);const colors=['#000000'];const fonts=['Arial'];
 function cindex(col){if(!col)return 0;let k=colors.indexOf(col.toLowerCase());if(k<0){k=colors.length;colors.push(col.toLowerCase())}return k+1;}
 function findFont(font){const f=font||'Arial';let i=fonts.indexOf(f);if(i<0){i=fonts.length;fonts.push(f)}return i;}
 for(const b of doc.blocks){const sets=b.type==='table'?b.rows.flat().map(c=>c.runs):b.type==='list'?b.items.map(it=>it.runs):[b.runs||[]];for(const rs of sets)for(const r of rs){if(r.color)cindex(r.color);if(r.highlight)cindex(r.highlight);if(r.font)findFont(r.font);}}
 const colorTable='{\\colortbl ;'+colors.map(h=>{const n=parseInt(h.slice(1),16);return '\\red'+((n>>16)&255)+'\\green'+((n>>8)&255)+'\\blue'+(n&255)+';'}).join('')+'}';
 const fontTable='{\\fonttbl'+fonts.map((f,i)=>'{\\f'+i+' '+rtfQuote(f)+';}').join('')+'}';
 function runs(rs){return (rs||[]).map(r=>{
  let flags='\\plain\\f'+findFont(r.font)+'\\fs'+Math.round((r.size||12)*2);
  if(r.bold)flags+='\\b';if(r.italic)flags+='\\i';if(r.underline)flags+='\\ul';if(r.strike)flags+='\\strike';
  if(r.color)flags+='\\cf'+cindex(r.color);if(r.highlight)flags+='\\highlight'+cindex(r.highlight);
  return '{'+flags+' '+rtfQuote(r.text)+'}';
 }).join('');}
 function para(rs,prefix='',align='left'){const aligns={left:'\\ql',center:'\\qc',right:'\\qr',justify:'\\qj'};return '\\pard'+(aligns[align]||'\\ql')+' '+prefix+runs(rs)+'\\par\n';}
 let body='';
 for(const b of doc.blocks){
  if(b.type==='heading'){body+=para(b.runs,'\\b\\fs'+(b.level===1?'34':b.level===2?'28':'24')+' ',b.align);}
  else if(b.type==='paragraph'||b.type==='quote'){body+=para(b.runs,b.type==='quote'?'\\li540\\i ':'',b.align);}
  else if(b.type==='list'){b.items.forEach((it,i)=>{body+=para(it.runs,'\\li540 '+(b.ordered?`${i+1}. `:'\\bullet '));});}
  else if(b.type==='table'){
   if(b.caption)body+=para([{text:b.caption,bold:true}]);
   for(const row of b.rows){const n=Math.max(row.length,1);body+='\\trowd\\trgaph108 '+row.map((_,i)=>'\\cellx'+Math.floor((i+1)*9000/n)).join(' ')+'\n';
    for(const cell of row)body+='\\pard\\intbl '+runs(cell.runs)+'\\cell\n';body+='\\row\n';}
  }else if(b.type==='image'){body+=para([{text:'[Image: '+(b.alt||b.caption||'No description')+']'}]);if(b.caption)body+=para([{text:b.caption,italic:true}]);}
  else if(b.type==='pageBreak')body+='\\page\n';
 }
 return '{\\rtf1\\ansi\\deff0'+fontTable+colorTable+'\\viewkind4\\uc1\n'+body+'}';
}
function createImageBytes(data){
 const match=String(data||'').match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/i);
 if(!match)return null;
 const raw=atob(match[2]);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return {type:match[1].toLowerCase()==='jpeg'?'jpg':match[1].toLowerCase(),bytes};
}
async function asSupportedImage(source){
 const i=createImageBytes(source);if(!i)return null;
 if(i.type!=='webp')return i;
 // Word's image support is more consistent with PNG than WebP.
 const image=new Image();image.src=source;await image.decode();
 const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
 canvas.getContext('2d').drawImage(image,0,0);return createImageBytes(canvas.toDataURL('image/png'));
}
async function exportDOCX(model){
 const lib=await ensureLibrary('docx'),doc=M.normalize(model);
 const runOptions= r => {
  const opts={text:'',bold:!!r.bold,italics:!!r.italic,underline:r.underline?{type:'single'}:undefined,strike:!!r.strike};
  if(r.color)opts.color=r.color.slice(1);if(r.highlight)opts.shading={fill:r.highlight.slice(1)};
  if(r.font)opts.font=r.font;if(r.size)opts.size=Math.round(r.size*2);return opts;
 };
 function toRuns(rs){const out=[];for(const r of rs||[]){
  const segments=String(r.text||'').split('\n');segments.forEach((segment,i)=>{
   const options={...runOptions(r),text:segment};if(i)options.break=1;
   if(r.href)out.push(new lib.ExternalHyperlink({link:r.href,children:[new lib.TextRun({...options,style:'Hyperlink'})]}));
   else out.push(new lib.TextRun(options));
  });
 }return out.length?out:[new lib.TextRun('')];}
 const alignment={left:lib.AlignmentType.LEFT,center:lib.AlignmentType.CENTER,right:lib.AlignmentType.RIGHT,justify:lib.AlignmentType.JUSTIFIED};
 const paragraph=(b={})=>new lib.Paragraph({
  heading:b.type==='heading'?(lib.HeadingLevel['HEADING_'+b.level]):undefined,
  alignment:alignment[b.align||'left'],
  spacing:{after:Math.round(doc.page.spacing*240)},
  children:toRuns(b.runs)
 });
 const children=[];let listInstance=0;
 for(const b of doc.blocks){
  if(['heading','paragraph','quote'].includes(b.type)){
   children.push(new lib.Paragraph({
    heading:b.type==='heading'?lib.HeadingLevel['HEADING_'+b.level]:undefined,
    alignment:alignment[b.align||'left'],
    spacing:{after:Math.round(doc.page.spacing*240)},
    indent:b.type==='quote'?{left:480}:undefined,
    children:toRuns(b.runs)}));
  }else if(b.type==='list'){
   listInstance++;
   for(const it of b.items){children.push(new lib.Paragraph({numbering:{reference:b.ordered?'sw-numbers':'sw-bullets',level:0,instance:listInstance},children:toRuns(it.runs)}));}
  }else if(b.type==='table'){
   if(b.caption)children.push(new lib.Paragraph({children:[new lib.TextRun({text:b.caption,bold:true})]}));
   const rows=b.rows.map((row,i)=>new lib.TableRow({children:row.map(cell=>new lib.TableCell({children:[new lib.Paragraph({children:toRuns(cell.runs)})],shading:b.header&&i===0?{fill:'EDF3F9'}:undefined}))}));
   if(rows.length)children.push(new lib.Table({rows,width:{size:100,type:lib.WidthType.PERCENTAGE}}));
  }else if(b.type==='image'){
   const image=await asSupportedImage(b.src);if(!image)continue;
   const width=Math.round(Math.min(b.width||440,doc.page.paper==='a4'?510:520));
   let height=Math.max(1,Math.round(width*.65));
   try{const probe=new Image();probe.src=b.src;await probe.decode();height=Math.max(1,Math.round(width*(probe.naturalHeight/probe.naturalWidth)));}catch{}
   children.push(new lib.Paragraph({alignment:lib.AlignmentType.CENTER,children:[new lib.ImageRun({type:image.type,data:image.bytes,transformation:{width,height},altText:{name:b.alt||'Image',description:b.alt||'',title:b.alt||'Image'}})]}));
   if(b.caption)children.push(new lib.Paragraph({alignment:lib.AlignmentType.CENTER,children:[new lib.TextRun({text:b.caption,italics:true,size:20})]}));
  }else if(b.type==='pageBreak')children.push(new lib.Paragraph({children:[new lib.PageBreak()]}));
 }
 if(!children.length)children.push(new lib.Paragraph(''));
 const pageWidths=doc.page.paper==='a4'?[11906,16838]:[12240,15840];
 const [w,h]=doc.page.orientation==='landscape'?[pageWidths[1],pageWidths[0]]:pageWidths;
 const margin=Math.round(doc.page.margin*1440);
 const wordDoc=new lib.Document({
  title:doc.title,creator:'Simple Writer',
  numbering:{config:[
   {reference:'sw-numbers',levels:[{level:0,format:lib.LevelFormat.DECIMAL,text:'%1.',alignment:lib.AlignmentType.LEFT,style:{paragraph:{indent:{left:700,hanging:260}}}}]},
   {reference:'sw-bullets',levels:[{level:0,format:lib.LevelFormat.BULLET,text:'•',alignment:lib.AlignmentType.LEFT,style:{paragraph:{indent:{left:700,hanging:260}}}}]}
  ]},
  sections:[{properties:{page:{size:{width:w,height:h},margin:{top:margin,right:margin,bottom:margin,left:margin}}},children}]
 });
 return lib.Packer.toBlob(wordDoc);
}
async function importDOCX(file){
 await ensureLibrary('mammoth');
 const arr=await file.arrayBuffer();
 const result=await window.mammoth.convertToHtml({arrayBuffer:arr},{convertImage:window.mammoth.images.imgElement(image=>image.read('base64').then(data=>({src:'data:'+image.contentType+';base64,'+data})))});
 const model=M.fromHTML(result.value,file.name.replace(/\.docx$/i,''));model.title=file.name.replace(/\.docx$/i,'');
 return {model,messages:result.messages||[]};
}
function filename(raw,extension){
 let name=String(raw||'Untitled document').replace(/\.(docx|html?|rtf|txt|md|json)$/i,'').trim().replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').replace(/[. ]+$/,'').slice(0,90).trim();
 return (name||'Untitled document')+'.'+extension;
}
function toBlob(model,format){
 const d=M.normalize(model);
 if(format==='html')return new Blob([M.toHTML(d)],{type:'text/html;charset=utf-8'});
 if(format==='rtf')return new Blob([exportRTF(d)],{type:'application/rtf'});
 if(format==='txt')return new Blob([M.toText(d)],{type:'text/plain;charset=utf-8'});
 if(format==='md')return new Blob([M.toMarkdown(d)],{type:'text/markdown;charset=utf-8'});
 if(format==='json')return new Blob([JSON.stringify(d,null,2)],{type:'application/json;charset=utf-8'});
 throw new Error('Unsupported format');
}
window.WriterFormats={exportRTF,exportDOCX,importDOCX,filename,toBlob};
})();
