/* Simple Writer v2 application and editor controller */
(() => {
'use strict';
const M=window.WriterModel, F=window.WriterFormats;
if(!M||!F)throw Error('Simple Writer modules did not load.');
const $ = id=>document.getElementById(id);
const editor=$('editor'), name=$('docName'), status=$('saveStatus');
const LOCAL='simple-writer-structured-v2', OLD='simple-writer-autosave-v1', HISTORY='simple-writer-history-v2', THEME='simple-writer-appearance-v1';
let doc=M.empty(), savedRange=null, selectedImage=null, saveTimer=null, historyTimer=null, findList=[], findPosition=0, issues=[], lastFormat='docx';
let changedSinceSnapshot=false;
const appearanceMode=$('appearanceMode');
function setAppearance(mode){
 const allowed=['light','dark','green','orange'];
 const chosen=allowed.includes(mode)?mode:'light';
 document.body.dataset.theme=chosen;
 appearanceMode.value=chosen;
 document.documentElement.style.colorScheme=chosen==='light'?'light':'dark';
 try{localStorage.setItem(THEME,chosen)}catch{}
 if(!$('a11yPanel').hidden)runAudit();
}
try { setAppearance(localStorage.getItem(THEME)||'light') } catch { setAppearance('light') }
appearanceMode.addEventListener('change',e=>setAppearance(e.target.value));
function announce(t){status.textContent=t;}
function selectionInside(){const sel=window.getSelection();return !!(sel&&sel.rangeCount&&editor.contains(sel.getRangeAt(0).commonAncestorContainer));}
function remember(){if(selectionInside()) savedRange=window.getSelection().getRangeAt(0).cloneRange();}
function restore(){editor.focus({preventScroll:true});if(!savedRange)return;try{const s=window.getSelection();s.removeAllRanges();s.addRange(savedRange)}catch{}}
function syncDocument(){const fresh=M.fromDOM(editor,doc);fresh.title=name.value.trim()||'Untitled document';doc=fresh;renderStats();refreshOutline();if(!$('a11yPanel').hidden)runAudit();if(!$('findBar').hidden)updateFind();}
function queueSave(){announce('Editing · autosaving');changedSinceSnapshot=true;clearTimeout(saveTimer);saveTimer=setTimeout(saveLocal,650);clearTimeout(historyTimer);historyTimer=setTimeout(()=>{if(changedSinceSnapshot){addSnapshot(false);changedSinceSnapshot=false;}},120000);}
function change(){syncDocument();queueSave();}
function saveLocal(){try{localStorage.setItem(LOCAL,JSON.stringify(doc));announce('Saved in this browser')}catch{announce('Autosave unavailable; use Save As')}}
function loadDoc(next){doc=M.normalize(next);name.value=doc.title;M.toEditor(editor,doc);savedRange=null;selectedImage=null;applyLayout();renderStats();refreshOutline();if(!$('a11yPanel').hidden)runAudit();updateFind();saveLocal();editor.focus();}
function renderStats(){const t=M.toText(doc).replace(/\f/g,' ');const words=(t.match(/\S+/g)||[]).length;const chars=t.length;const read=Math.max(1,Math.ceil(words/220));const pages=Math.max(1,Math.ceil((editor.scrollHeight||0)/Math.max(500,$('paper').clientHeight-70)));$('docStats').textContent=`${words} words · ${chars} characters · ${read} min read · ~${pages} ${pages===1?'page':'pages'}`;}
function styleCommand(cmd,value){restore();try{document.execCommand(cmd,false,value)}catch(e){announce('Formatting not supported by this browser');return;}remember();change();updateFormatting();}
function updateFormatting(){if(!selectionInside())return;const commands=['bold','italic','underline','strikeThrough','insertOrderedList','insertUnorderedList','justifyLeft','justifyCenter','justifyRight'];
 document.querySelectorAll('[data-cmd]').forEach(btn=>{if(!commands.includes(btn.dataset.cmd))return;let active=false;try{active=document.queryCommandState(btn.dataset.cmd)}catch{}btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active))});
 const s=window.getSelection();let node=s?.anchorNode;if(node?.nodeType===3)node=node.parentElement;
 if(node?.closest){const b=node.closest('h1,h2,h3,blockquote,p');$('blockStyle').value=b?b.tagName.toLowerCase():'p';}
 if(node?.nodeType===1){const style=getComputedStyle(node);$('formatInfo').textContent=($('blockStyle').selectedOptions[0]?.textContent||'Normal text')+' · '+style.fontFamily.split(',')[0].replace(/["']/g,'')+' · '+Math.round(parseFloat(style.fontSize)*.75)+' pt';}
}
function applyLayout(){
 const p=doc.page;const dims=p.paper==='a4'?[8.27,11.69]:[8.5,11];const wh=p.orientation==='landscape'?dims.reverse():dims;
 $('paper').style.width=wh[0]+'in';$('paper').style.minHeight=wh[1]+'in';$('paper').style.padding=p.margin+'in';
 editor.style.minHeight=Math.max(2,wh[1]-2*p.margin-.12)+'in';editor.style.setProperty('--paragraph-space',p.spacing+'em');
 const size=p.paper==='a4'?'A4':'letter';$('printSettings').textContent=`@media print{@page{size:${size} ${p.orientation};margin:${p.margin}in}}`;
}
function showPanel(which){
 for(const id of ['outlinePanel','a11yPanel','historyPanel']){$(id).hidden=id!==which;}
 $('outlineBtn').setAttribute('aria-expanded',String(which==='outlinePanel'));
 $('a11yBtn').setAttribute('aria-expanded',String(which==='a11yPanel'));
 if(which==='outlinePanel')refreshOutline();if(which==='a11yPanel')runAudit();if(which==='historyPanel')renderHistory();
 $(which).querySelector('h2').focus();
}
function closePanel(id){$(id).hidden=true;$('outlineBtn').setAttribute('aria-expanded','false');$('a11yBtn').setAttribute('aria-expanded','false');}
function togglePanel(id){$(id).hidden?showPanel(id):closePanel(id)}
function findElement(index){return Array.from(editor.children)[index]||editor;}
function highlightTarget(node){if(!node)return;editor.querySelectorAll('.issue-target').forEach(el=>el.classList.remove('issue-target'));
 node.classList.add('issue-target');node.scrollIntoView({block:'center',behavior:'smooth'});
 try{node.focus?.({preventScroll:true});}catch{}setTimeout(()=>node.classList.remove('issue-target'),4500);
}
function refreshOutline(){if($('outlinePanel').hidden)return;const out=$('outlineItems');out.replaceChildren();
 const headings=Array.from(editor.querySelectorAll('h1,h2,h3'));
 if(!headings.length){const p=document.createElement('p');p.className='muted';p.textContent='No headings yet. Use Heading 1–3 to organize your document.';out.append(p);return;}
 headings.forEach(h=>{const btn=document.createElement('button');btn.className='outline-item level'+h.tagName[1];btn.textContent=h.textContent.trim()||'(Empty heading)';btn.addEventListener('click',()=>highlightTarget(h));out.append(btn)});
}
function contrastHex(fore,bg){const lum=h=>{const v=(h.slice(1).match(/.{2}/g)||[]).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]};const a=lum(fore),b=lum(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
function colorHex(c){if(/^#[0-9a-f]{6}$/i.test(c))return c.toLowerCase();if(/rgba\([^)]*,\s*0(?:\.0+)?\s*\)/i.test(String(c)))return '';const m=String(c||'').match(/^rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/i);return m?'#'+m.slice(1,4).map(x=>Number(x).toString(16).padStart(2,'0')).join(''):'';}
function auditData(){
 const found=[];const issue=(level,title,detail,node)=>found.push({level,title,detail,node});
 const heads=Array.from(editor.querySelectorAll('h1,h2,h3'));let prev=0;
 for(const h of heads){const n=Number(h.tagName[1]);if(!h.textContent.trim())issue('Issue','Empty heading','Add a descriptive heading or remove the heading style.',h);if(prev&&n>prev+1)issue('Issue','Skipped heading level',`Use Heading ${prev+1} before Heading ${n}.`,h);if(!prev&&n!==1)issue('Review','Document begins below Heading 1','Consider using Heading 1 for the top-level heading.',h);prev=n;}
 if(!heads.length&&(M.toText(doc).length>230))issue('Review','No structured headings','Consider using heading styles for a longer document.',editor);
 editor.querySelectorAll('a').forEach(a=>{const t=a.textContent.trim();if(!t)issue('Issue','Empty link','Add descriptive text to the link.',a);else if(/^(click here|here|more|read more|learn more|link)$/i.test(t))issue('Review','Unclear link label','Describe the link destination rather than “'+t+'”.',a);else if(/^https?:\/\/\S{40,}$/i.test(t))issue('Review','Long URL used as label','Use a short, descriptive label.',a);if(!M.safeUrl(a.href))issue('Issue','Invalid hyperlink target','Set a valid HTTPS, HTTP or email address.',a);});
 editor.querySelectorAll('img').forEach(img=>{if(!img.hasAttribute('alt'))issue('Issue','Missing image alternative text','Add an image description, or set empty alt text for a decorative image.',img);else if(!img.getAttribute('alt')&&!img.hasAttribute('data-decorative'))issue('Review','Image needs a description or decorative designation','Provide meaningful alternative text or explicitly mark the image as decorative.',img);});
 editor.querySelectorAll('table').forEach(t=>{if(!t.querySelector('th'))issue('Issue','Table has no header cells','Use the first row as column headings when appropriate.',t);else if(!t.querySelector('th[scope]'))issue('Review','Table header association','Review row/column associations, especially for complex tables.',t);if(!t.querySelector('caption'))issue('Review','Table without caption','Consider a short descriptive caption.',t);});
 const styleSet=new Set();for(const el of editor.querySelectorAll('p,h1,h2,h3,blockquote,li,td,th,span,a')){
  if(!(el.textContent||'').trim())continue;
  const st=getComputedStyle(el);let fg=colorHex(st.color),bg=colorHex(st.backgroundColor);if(!bg){let parent=el.parentElement;while(parent&&!bg){bg=colorHex(getComputedStyle(parent).backgroundColor);parent=parent.parentElement;}}bg=bg||'#ffffff';if(!fg)continue;
  const large=parseFloat(st.fontSize)>=24||(parseFloat(st.fontSize)>=18.66&&(parseInt(st.fontWeight)>=700||st.fontWeight==='bold'));
  const key=[fg,bg,large].join('|');if(styleSet.has(key))continue;styleSet.add(key);
  const ratio=contrastHex(fg,bg),limit=large?3:4.5;if(ratio<limit)issue('Issue','Low text contrast',`Estimated ${ratio.toFixed(2)}:1 contrast (target ${limit}:1). Complex backgrounds require manual review.`,el);
 }
 return found;
}
function runAudit(){
 // Audit the underlying document as it will be printed, not the retro display palette.
 const visualTheme=document.body.dataset.theme;
 if(visualTheme!=='light')document.body.dataset.theme='light';
 try{issues=auditData();}finally{document.body.dataset.theme=visualTheme;}
 const output=$('a11yItems');output.replaceChildren();const count=issues.filter(x=>x.level==='Issue').length;const review=issues.length-count;$('a11ySummary').textContent=`${count} potential ${count===1?'issue':'issues'} · ${review} to review`;
 if(!issues.length){const p=document.createElement('p');p.className='muted';p.textContent='No issues detected in these checks. Review reading order, meaning, page structure and color use manually.';output.append(p)}
 issues.forEach((it,i)=>{const section=document.createElement('section');section.className='issue '+(it.level==='Review'?'review':'');const sev=document.createElement('span');sev.textContent=it.level;const h=document.createElement('h3');h.textContent=(i+1)+'. '+it.title;const p=document.createElement('p');p.textContent=it.detail;const btn=document.createElement('button');btn.type='button';btn.textContent='Go to element';btn.addEventListener('click',()=>highlightTarget(it.node));section.append(sev,h,p,btn);output.append(section)});
}
function exportAudit(){runAudit();const report=[`Simple Writer accessibility report`,`Document: ${doc.title}`,`Checked: ${new Date().toLocaleString()}`,``,`${$('a11ySummary').textContent}`,``,...issues.map((x,i)=>`${i+1}. [${x.level}] ${x.title}\n${x.detail}\n`),'', 'This report is an automated review aid, not a compliance certificate.'].join('\n');downloadBlob(new Blob([report],{type:'text/plain'}),F.filename(doc.title+' - accessibility report','txt'));}
function loadHistory(){try{const saved=JSON.parse(localStorage.getItem(HISTORY)||'[]');return Array.isArray(saved)?saved:[]}catch{return []}}
function addSnapshot(manual=true){syncDocument();const hist=loadHistory();const time=new Date().toISOString();const payload=JSON.stringify(doc);if(!manual&&hist[0]?.data===payload)return;
 hist.unshift({time,title:doc.title,data:payload});
 try{localStorage.setItem(HISTORY,JSON.stringify(hist.slice(0,8)));if(manual)announce('Version saved in this browser')}catch{if(manual)announce('No space for snapshots; use Save As')}
 if(!$('historyPanel').hidden)renderHistory();
}
function renderHistory(){const target=$('historyItems');target.replaceChildren();const hist=loadHistory();if(!hist.length){const p=document.createElement('p');p.className='muted';p.textContent='No saved versions yet.';target.append(p);return;}
 hist.forEach((item,i)=>{const div=document.createElement('div');div.className='history-item';const strong=document.createElement('strong');strong.textContent=item.title||'Untitled document';const p=document.createElement('p');p.textContent=new Date(item.time).toLocaleString();const btn=document.createElement('button');btn.textContent='Restore version';btn.addEventListener('click',()=>{if(!confirm('Restore this version and replace current text? Save your current document first if needed.'))return;try{loadDoc(JSON.parse(item.data));announce('Restored local version')}catch{announce('Could not restore this version')}});div.append(strong,p,btn);target.append(div)});
}
function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800);}
function openSave(){syncDocument();$('saveFileName').value=F.filename(doc.title,'html').replace(/\.html$/,'');$('saveFileType').value=lastFormat;$('saveError').hidden=true;updateSavePreview();$('saveLocationInfo').textContent=(typeof showSaveFilePicker==='function'&&isSecureContext)?'Choose a folder and confirm the filename in your system file picker.':'This browser will download the file. Enable “Ask where to save each file” in browser settings to choose a folder.';$('saveDialog').showModal();$('saveFileName').focus();$('saveFileName').select();}
function updateSavePreview(){const f=$('saveFileType').value;$('savePreview').textContent=F.filename($('saveFileName').value,f);$('saveTip').textContent=f==='docx'?'Best for Microsoft Word. Keeps headings, lists, tables, most text formatting, and images. Some complex layouts may change.':f==='rtf'?'Compatible rich text. Image content is described but not embedded.':f==='txt'?'Plain text only; formatting and images are removed.':f==='md'?'Markdown preserves headings, lists and simple links; rich styling is simplified.':f==='html'?'Best for reopening here with exact editor structure and local images.':'Native structured project format for full-fidelity backups.';}
async function saveAs(ev){ev.preventDefault();syncDocument();const f=$('saveFileType').value,finalName=F.filename($('saveFileName').value,f);$('saveError').hidden=true;const submit=$('confirmSave');submit.disabled=true;
 let handle=null;try{
  if(typeof showSaveFilePicker==='function'&&isSecureContext){
   const mime={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',html:'text/html',rtf:'application/rtf',txt:'text/plain',md:'text/markdown',json:'application/json'}[f];
   handle=await showSaveFilePicker({suggestedName:finalName,types:[{description:$("saveFileType").selectedOptions[0].textContent,accept:{[mime]:['.'+f]}}]});
  }
  const exportDoc={...doc,title:F.filename($('saveFileName').value,'html').slice(0,-5)};
  const blob=f==='docx'?await F.exportDOCX(exportDoc):F.toBlob(exportDoc,f);
  if(handle){const writable=await handle.createWritable();await writable.write(blob);await writable.close();announce('Saved '+finalName);}
  else{downloadBlob(blob,finalName);announce('Download started: '+finalName);}
  doc.title=F.filename($('saveFileName').value,'html').slice(0,-5);name.value=doc.title;lastFormat=f;saveLocal();announce((handle?'Saved ':'Download started: ')+finalName);$('saveDialog').close();
 }catch(error){if(error?.name!=='AbortError'){ $('saveError').textContent='Could not save: '+(error?.message||'Unknown error');$('saveError').hidden=false;}}
 finally{submit.disabled=false;}
}
function insertNode(node){
 restore();let selection=window.getSelection();let block=null;
 if(selection?.rangeCount){let anchor=selection.getRangeAt(0).startContainer;if(anchor.nodeType===Node.TEXT_NODE)anchor=anchor.parentElement;
  if(anchor?.closest)block=anchor.closest('p,h1,h2,h3,blockquote,ul,ol,table,figure,[data-page-break]');}
 if(block&&editor.contains(block)){while(block.parentElement!==editor&&block.parentElement)block=block.parentElement;block.after(node);}
 else editor.append(node);
 const after=document.createElement('p');after.append(document.createElement('br'));node.after(after);
 const range=document.createRange();range.selectNodeContents(after);range.collapse(true);selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
 remember();change();
}
function insertHtmlMarkup(html){restore();document.execCommand('insertHTML',false,html);remember();change();}
function imageProperties(img){if(!img)return;selectedImage=img;$('imageAlt').value=img.getAttribute('alt')||'';$('imageCaption').value=img.closest('figure')?.querySelector('figcaption')?.textContent||'';$('imageWidth').value=parseInt(img.style.width||img.getAttribute('width'),10)||440;
 $('imageAlignment').value=img.closest('figure')?.dataset.align||'center';
 $('imageDecorative').checked=img.getAttribute('alt')==='' && img.hasAttribute('data-decorative');
 $('imageAlt').disabled=$('imageDecorative').checked;
 $('imageDialog').showModal();}
function imageFileData(file){return new Promise((resolve,reject)=>{
 const reader=new FileReader();reader.onerror=()=>reject(Error('Image could not be read'));reader.onload=()=>{
   const image=new Image();image.onload=()=>{
    // Keep images compact enough for local browser storage and HTML backups.
    const scale=Math.min(1,1400/Math.max(image.naturalWidth,image.naturalHeight));const w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(image,0,0,w,h);
    const png=file.type==='image/png'||file.type==='image/gif';resolve({src:canvas.toDataURL(png?'image/png':'image/jpeg',png?undefined:.87),width:Math.min(470,w)});
   };image.onerror=()=>reject(Error('Image could not be decoded'));image.src=reader.result;
 };reader.readAsDataURL(file);
 });}
function beginOpen(){if(editor.textContent.trim()&&!confirm('Open another document and replace the current document? Use Save As first if you need a copy.'))return;$('openFile').click();}
async function readOpenedFile(file){
 const ext=file.name.split('.').pop().toLowerCase();let imported=null,notification='Opened '+file.name;
 if(ext==='docx'){const r=await F.importDOCX(file);imported=r.model;if(r.messages.length)notification=`Opened Word document (${r.messages.length} import notes; inspect complex formatting)`;}
 else if(['html','htm'].includes(ext))imported=M.fromHTML(await file.text(),file.name.replace(/\.html?$/i,''));
 else if(ext==='md')imported=M.fromMarkdown(await file.text(),file.name.replace(/\.md$/i,''));
 else if(ext==='json'){const value=JSON.parse(await file.text());if(value.schema!=='simple-writer')throw Error('Not a Simple Writer project');imported=M.normalize(value);}
 else if(ext==='txt')imported=M.fromText(await file.text(),file.name.replace(/\.txt$/i,''));
 else throw Error('Unsupported file type. Open DOCX, HTML, TXT, MD, or a Simple Writer JSON project.');
 loadDoc(imported);announce(notification);
}
function textSegments(){const walk=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);let node,str='',entries=[],lastBlock=null;
 while((node=walk.nextNode())){
  if(node.parentElement?.closest('[data-page-break]'))continue;
  const block=node.parentElement?.closest('p,h1,h2,h3,blockquote,li,td,th,figcaption,caption')||editor;
  if(lastBlock&&block!==lastBlock)str+='\n';lastBlock=block;
  const start=str.length;str+=node.textContent||'';entries.push({node,start,end:str.length});
 }return {str,entries};
}
function rangeFor(start,end,map){
 const a=map.entries.find(x=>start>=x.start&&start<x.end),b=map.entries.find(x=>end>x.start&&end<=x.end);
 if(!a||!b)return null;const r=document.createRange();r.setStart(a.node,start-a.start);r.setEnd(b.node,end-b.start);return r;
}
function clearHighlights(){try{CSS.highlights.delete('writer-find');CSS.highlights.delete('writer-current')}catch{}}
function updateFind(){clearHighlights();const query=$('findInput').value,output=$('findCount');findList=[];findPosition=0;
 if(!query){output.textContent='0 matches';return;}
 const map=textSegments();const hay=map.str.toLocaleLowerCase(),needle=query.toLocaleLowerCase();if(!needle)return;
 let offset=0;while(offset<hay.length&&findList.length<800){const at=hay.indexOf(needle,offset);if(at<0)break;const range=rangeFor(at,at+needle.length,map);if(range)findList.push(range);offset=at+Math.max(1,needle.length);}
 output.textContent=findList.length+' '+(findList.length===1?'match':'matches');paintFind();
}
function paintFind(){
 clearHighlights();if(!findList.length)return;
 try{if(window.CSS?.highlights&&window.Highlight){CSS.highlights.set('writer-find',new Highlight(...findList));CSS.highlights.set('writer-current',new Highlight(findList[findPosition]));}}catch{}
}
function navigateFind(dir){if(!findList.length)return;findPosition=(findPosition+dir+findList.length)%findList.length;paintFind();let el=findList[findPosition].startContainer.parentElement;el?.scrollIntoView({block:'center',behavior:'smooth'});$('findCount').textContent=`${findPosition+1} of ${findList.length}`;}
function replaceSelected(all){if(!findList.length)return;const value=$('replaceInput').value;const ranges=all?[...findList].reverse():[findList[findPosition]];
 for(const range of ranges){try{range.deleteContents();range.insertNode(document.createTextNode(value));}catch{}}
 change();updateFind();}
function showFind(){ $('findBar').hidden=false;$('findInput').focus();$('findInput').select();updateFind();}
function closeFind(){$('findBar').hidden=true;clearHighlights();editor.focus();}
function newDocument(){if(editor.textContent.trim()&&!confirm('Start a new document? Save your current document first if needed.'))return;loadDoc(M.empty());announce('New document');}
function openTemplate(){ $('templateDialog').showModal(); }
function applyTemplate(which){if(editor.textContent.trim()&&!confirm('Replace your current document with this template?'))return;loadDoc(M.makeTemplate(which));$('templateDialog').close();announce('Template loaded');}
// ------------------- Toolbar and keyboard wiring -------------------
editor.addEventListener('input',change);
editor.addEventListener('keyup',remember);editor.addEventListener('mouseup',remember);
editor.addEventListener('click',e=>{const img=e.target.closest('img');if(img&&editor.contains(img))selectedImage=img;});
name.addEventListener('input',()=>{doc.title=name.value;queueSave();});
document.addEventListener('selectionchange',()=>{remember();updateFormatting();});
document.querySelectorAll('[data-cmd]').forEach(btn=>{btn.addEventListener('mousedown',e=>e.preventDefault());btn.addEventListener('click',()=>styleCommand(btn.dataset.cmd));});
$('blockStyle').addEventListener('change',e=>styleCommand('formatBlock','<'+e.target.value+'>'));
$('fontFamily').addEventListener('change',e=>styleCommand('fontName',e.target.value));
$('fontSize').addEventListener('change',e=>styleCommand('fontSize',e.target.value));
$('textColor').addEventListener('input',e=>styleCommand('foreColor',e.target.value));
$('highlightColor').addEventListener('input',e=>styleCommand('hiliteColor',e.target.value));
$('linkBtn').addEventListener('click',()=>{const link=prompt('Enter a web address (https://...) or email address (mailto:):');if(link===null)return;const href=M.safeUrl(/^[a-z][a-z\d+.-]*:/i.test(link)?link:'https://'+link);if(!href)return alert('Please enter a valid link.');restore();const sel=window.getSelection();if(!sel?.isCollapsed)document.execCommand('createLink',false,href);else document.execCommand('insertHTML',false,'<a href="'+M.escapeHTML(href)+'">'+M.escapeHTML(link)+'</a>');change()});
$('newBtn').addEventListener('click',newDocument);$('openBtn').addEventListener('click',beginOpen);$('saveBtn').addEventListener('click',openSave);$('printBtn').addEventListener('click',()=>{saveLocal();window.print()});
$('saveForm').addEventListener('submit',saveAs);$('cancelSave').addEventListener('click',()=>$('saveDialog').close());$('saveFileName').addEventListener('input',updateSavePreview);$('saveFileType').addEventListener('change',updateSavePreview);
$('openFile').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{await readOpenedFile(file)}catch(error){alert('Could not open file: '+error.message)}});
$('imageBtn').addEventListener('click',()=>$('imageFile').click());
async function insertImageFile(file){
 if(!file || !/^image\/(png|jpeg|gif|webp)$/.test(file.type)){alert('Choose a PNG, JPEG, GIF or WebP image.');return;}
 if(file.size>18*1024*1024){alert('This image is over 18 MB. Resize it before inserting.');return;}
 try{
  const data=await imageFileData(file),fig=document.createElement('figure'),img=document.createElement('img');
  img.src=data.src;img.alt='';img.width=data.width;img.style.width=data.width+'px';
  fig.dataset.align='center';fig.style.textAlign='center';fig.append(img);
  insertNode(fig);imageProperties(img);
 }catch(error){alert('Could not insert image: '+error.message)}
}
$('imageFile').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(file)await insertImageFile(file);});
$('imagePropsBtn').addEventListener('click',()=>{const sel=window.getSelection();let node=sel?.anchorNode;if(node?.nodeType===3)node=node.parentElement;const img=(node?.closest?.('figure')?.querySelector('img'))||selectedImage;if(img&&editor.contains(img))imageProperties(img);else alert('Click an image in the document first.');});
$('imageCancel').addEventListener('click',()=>$('imageDialog').close());
$('imageDecorative').addEventListener('change',e=>{$('imageAlt').disabled=e.target.checked;});
$('imageRemove').addEventListener('click',()=>{const img=selectedImage;if(!img||!editor.contains(img))return $('imageDialog').close();const fig=img.closest('figure');if(fig&&editor.contains(fig))fig.remove();else img.remove();selectedImage=null;change();$('imageDialog').close();});
$('imageForm').addEventListener('submit',e=>{e.preventDefault();const img=selectedImage;if(!img||!editor.contains(img))return $('imageDialog').close();img.alt=$('imageDecorative').checked?'':$('imageAlt').value.trim();
 if($('imageDecorative').checked)img.setAttribute('data-decorative','');else img.removeAttribute('data-decorative');
 const width=Math.max(80,Math.min(900,Number($('imageWidth').value)||440));img.width=width;img.style.width=width+'px';const fig=img.closest('figure');if(fig){fig.dataset.align=$('imageAlignment').value;fig.style.textAlign=$('imageAlignment').value;let cap=fig.querySelector('figcaption');if($('imageCaption').value){if(!cap){cap=document.createElement('figcaption');fig.append(cap)}cap.textContent=$('imageCaption').value;}else cap?.remove();}change();$('imageDialog').close();});
$('tableBtn').addEventListener('click',()=>$('tableDialog').showModal());$('tableCancel').addEventListener('click',()=>$('tableDialog').close());
$('tableForm').addEventListener('submit',e=>{e.preventDefault();const rows=Math.min(25,Math.max(1,Number($('tableRows').value))),cols=Math.min(12,Math.max(1,Number($('tableCols').value))),header=$('tableHeader').checked,caption=$('tableCaption').value.trim();
 const table=document.createElement('table');if(caption){const cap=document.createElement('caption');cap.textContent=caption;table.append(cap)}
 const group=document.createElement('colgroup');for(let c=0;c<cols;c++){const col=document.createElement('col');col.style.width=(100/cols)+'%';group.append(col)}table.append(group);
 const body=document.createElement('tbody');for(let r=0;r<rows;r++){const tr=document.createElement('tr');for(let c=0;c<cols;c++){const cell=document.createElement(header&&r===0?'th':'td');if(header&&r===0)cell.scope='col';cell.append(document.createElement('br'));tr.append(cell)}body.append(tr)}table.append(body);insertNode(table);$('tableDialog').close();announce('Table inserted');});
$('rowBtn').addEventListener('click',()=>{const sel=window.getSelection();let n=sel?.anchorNode;if(n?.nodeType===3)n=n.parentElement;const tr=n?.closest?.('tr');if(!tr||!editor.contains(tr))return alert('Click inside a table row first.');const row=document.createElement('tr');for(let i=0;i<tr.children.length;i++){const cell=document.createElement('td');cell.append(document.createElement('br'));row.append(cell)}tr.after(row);change();});
$('deleteRowBtn').addEventListener('click',()=>{const sel=window.getSelection();let n=sel?.anchorNode;if(n?.nodeType===3)n=n.parentElement;const tr=n?.closest?.('tr');if(!tr||!editor.contains(tr))return alert('Click inside a table row first.');const table=tr.closest('table');tr.remove();if(!table.querySelector('tr'))table.remove();change();});
function selectedTableCell(){const s=window.getSelection();let n=s?.anchorNode;if(n?.nodeType===Node.TEXT_NODE)n=n.parentElement;const cell=n?.closest?.('td,th');return cell&&editor.contains(cell)?cell:null;}
function tableColumns(table){const count=table.querySelector('tr')?.children.length||0;let group=table.querySelector('colgroup');if(!group){group=document.createElement('colgroup');table.prepend(group)}
 while(group.children.length<count)group.append(document.createElement('col'));while(group.children.length>count)group.lastChild.remove();return [...group.children];}
function evenTableColumns(table){const cols=tableColumns(table);cols.forEach(c=>c.style.width=(100/Math.max(1,cols.length))+'%');}
$('addColBtn').addEventListener('click',()=>{const cell=selectedTableCell();if(!cell)return alert('Click a table cell first.');const table=cell.closest('table');if(!table)return;const idx=cell.cellIndex;for(const row of table.rows){const header=row.querySelector('th')!=null;const td=document.createElement(header?'th':'td');if(header)td.scope='col';td.append(document.createElement('br'));const target=row.children[idx+1];if(target)row.insertBefore(td,target);else row.append(td)}evenTableColumns(table);change();});
$('deleteColBtn').addEventListener('click',()=>{const cell=selectedTableCell();if(!cell)return alert('Click a table cell first.');const table=cell.closest('table'),idx=cell.cellIndex;for(const row of table.rows){row.children[idx]?.remove();}if(!table.querySelector('tr td,tr th'))table.remove();else evenTableColumns(table);change();});
$('colWidthBtn').addEventListener('click',()=>{const cell=selectedTableCell();if(!cell)return alert('Click the table column you want to resize.');const table=cell.closest('table'),cols=tableColumns(table),idx=cell.cellIndex;if(cols.length<2)return alert('A single-column table already occupies the full width.');const existing=parseFloat(cols[idx].style.width)||100/cols.length;const requested=Number(prompt('Width of this column as a percentage of table width (10–90):',String(Math.round(existing))));if(!Number.isFinite(requested)||requested<10||requested>90)return;const rest=cols.reduce((total,col,j)=>total+(j===idx?0:(parseFloat(col.style.width)||100/cols.length)),0);cols.forEach((col,j)=>{col.style.width=(j===idx?requested:((parseFloat(col.style.width)||100/cols.length)/rest)*(100-requested)).toFixed(2)+'%'});change();});
$('pageBreakBtn').addEventListener('click',()=>{const div=document.createElement('div');div.dataset.pageBreak='';div.setAttribute('contenteditable','false');div.setAttribute('aria-label','Page break');insertNode(div)});
$('layoutBtn').addEventListener('click',()=>{ $('paperSize').value=doc.page.paper;$('paperOrientation').value=doc.page.orientation;$('pageMargin').value=String(doc.page.margin);$('paragraphSpacing').value=String(doc.page.spacing);$('layoutDialog').showModal();});
$('layoutCancel').addEventListener('click',()=>$('layoutDialog').close());
$('layoutForm').addEventListener('submit',e=>{e.preventDefault();doc.page={paper:$('paperSize').value,orientation:$('paperOrientation').value,margin:+$('pageMargin').value,spacing:+$('paragraphSpacing').value};applyLayout();queueSave();$('layoutDialog').close();});
$('outlineBtn').addEventListener('click',()=>togglePanel('outlinePanel'));
$('a11yBtn').addEventListener('click',()=>togglePanel('a11yPanel'));
$('historyBtn').addEventListener('click',()=>togglePanel('historyPanel'));
document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>closePanel(btn.dataset.close)));
$('a11yRerun').addEventListener('click',runAudit);$('a11yReport').addEventListener('click',exportAudit);$('snapshotBtn').addEventListener('click',()=>addSnapshot());
$('findBtn').addEventListener('click',()=>$('findBar').hidden?showFind():closeFind());$('closeFind').addEventListener('click',closeFind);
$('findInput').addEventListener('input',updateFind);$('findPrev').addEventListener('click',()=>navigateFind(-1));$('findNext').addEventListener('click',()=>navigateFind(1));$('replaceOne').addEventListener('click',()=>replaceSelected(false));$('replaceAll').addEventListener('click',()=>replaceSelected(true));
$('findInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();navigateFind(e.shiftKey?-1:1);}});
$('templateBtn').addEventListener('click',openTemplate);$('templateCancel').addEventListener('click',()=>$('templateDialog').close());document.querySelectorAll('[data-template]').forEach(btn=>btn.addEventListener('click',()=>applyTemplate(btn.dataset.template)));
$('inspectorBtn').addEventListener('click',()=>{updateFormatting();alert('Current selection: '+$('formatInfo').textContent+'\nFor document-level layout, choose Page layout.');});
function setFocus(value){document.body.classList.toggle('focus-mode',value);$('exitFocus').hidden=!value;$('focusBtn').textContent=value?'Exit focus':'Focus';$('focusBtn').setAttribute('aria-pressed',String(value));if(value)editor.focus()}
$('focusBtn').addEventListener('click',()=>setFocus(!document.body.classList.contains('focus-mode')));$('exitFocus').addEventListener('click',()=>setFocus(false));
editor.addEventListener('paste',e=>{
 const clipboard=e.clipboardData;if(!clipboard)return;
 const imageItem=Array.from(clipboard.items||[]).find(item=>item.kind==='file'&&/^image\/(png|jpeg|gif|webp)$/.test(item.type));
 if(imageItem){e.preventDefault();remember();void insertImageFile(imageItem.getAsFile());return;}
 const html=clipboard.getData('text/html');
 if(html){e.preventDefault();try{const safe=M.fromHTML(html,'Paste');insertHtmlMarkup(M.blocksHTML(safe));}catch{document.execCommand('insertText',false,clipboard.getData('text/plain'))}change();return;}
 const txt=clipboard.getData('text/plain');if(txt!=null){e.preventDefault();document.execCommand('insertText',false,txt);change();}
});
editor.addEventListener('dragover',e=>{if(Array.from(e.dataTransfer?.items||[]).some(item=>item.kind==='file'&&item.type.startsWith('image/')))e.preventDefault();});
editor.addEventListener('drop',e=>{
 const file=Array.from(e.dataTransfer?.files||[]).find(f=>/^image\/(png|jpeg|gif|webp)$/.test(f.type));
 if(file){e.preventDefault();editor.focus();void insertImageFile(file);return;}
 if(e.dataTransfer?.files?.length||e.dataTransfer?.types?.includes('text/html'))e.preventDefault();
});
document.addEventListener('keydown',e=>{
 const ctrl=e.ctrlKey||e.metaKey;
 if(ctrl&&!e.altKey&&e.key.toLowerCase()==='s'){e.preventDefault();if(!$('saveDialog').open)openSave();}
 else if(ctrl&&!e.altKey&&e.key.toLowerCase()==='f'){e.preventDefault();showFind();}
 else if(e.key==='Escape'&&document.body.classList.contains('focus-mode'))setFocus(false);
});
window.addEventListener('beforeunload',()=>{if(saveTimer)saveLocal()});
// v1 autosave compatibility: convert the previous HTML into the new structured model.
function initialize(){
 try{const saved=localStorage.getItem(LOCAL);if(saved){loadDoc(JSON.parse(saved));announce('Restored structured document');return;}
  const previous=JSON.parse(localStorage.getItem(OLD)||'null');if(previous&&typeof previous.content==='string'){loadDoc(M.fromHTML(previous.content,previous.title||'Untitled document'));announce('Migrated earlier Simple Writer document');return;}
 }catch(e){console.warn('Could not restore document',e)}loadDoc(M.empty());
}
initialize();
})();
