import { API_BASE, REQUIRE_SIGN_IN } from './config.js';
import { readWorkspace, writeWorkspace } from './local-workspace.js';
let csrf='';
export function setCsrf(value){csrf=value||'';}
export async function api(path,{method='GET',body}={}){
 if(!REQUIRE_SIGN_IN && path==='/api/workspace') {
  if(method==='GET')return readWorkspace(localStorage);
  if(method==='PUT')return writeWorkspace(localStorage,body.workspace,body.revision);
 }
 if(!REQUIRE_SIGN_IN && path==='/api/suggest' && !API_BASE && !['localhost','127.0.0.1','[::1]'].includes(location.hostname)) {
  throw Error('AI needs a backend server. Run the local Atlas test server to use AI; mapping, saving, import and export work here without sign-in.');
 }
 const r=await fetch(API_BASE.replace(/\/$/,'')+path,{method,credentials:'include',headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 let data;try{data=await r.json();}catch{throw Error('Atlas backend is not configured or reachable. Contact the owner.');}
 if(!r.ok){if(r.status===401)window.dispatchEvent(new Event('atlas-session-expired'));throw Object.assign(new Error(data.error||'Request failed.'),{status:r.status});}return data;
}
