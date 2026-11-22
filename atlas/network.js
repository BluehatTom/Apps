import { API_BASE } from './config.js';
let csrf='';
export function setCsrf(value){csrf=value||'';}
export async function api(path,{method='GET',body}={}){
 const r=await fetch(API_BASE.replace(/\/$/,'')+path,{method,credentials:'include',headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 let data;try{data=await r.json();}catch{throw Error('Atlas backend is not configured or reachable. Contact the owner.');}
 if(!r.ok){if(r.status===401)window.dispatchEvent(new Event('atlas-session-expired'));throw Object.assign(new Error(data.error||'Request failed.'),{status:r.status});}return data;
}
