import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createAuth, fail } from './auth.js';
import { validateMap } from '../model.js';
import { handleApi } from '../api.js';
const files=new Set(['index.html','style.css','app.js','model.js','account.js','network.js','config.js']);
export function createApp({config,sendMail,ai=handleApi,now}){
 const auth=createAuth({path:config.databasePath,adminEmail:config.adminEmail,frontendUrl:config.frontendUrl,sendMail,now});
 const publicUrl=new URL(config.publicUrl),front=new URL(config.frontendUrl),origins=new Set([publicUrl.origin,front.origin]);
 const secure=publicUrl.protocol==='https:',sameSite=config.sameSite||'Lax';
 if(sameSite==='None'&&!secure)throw Error('SameSite=None requires HTTPS.');
 const cookieName=secure?'__Host-atlas':'atlas';
 const cookie=(raw,age=43200)=>`${cookieName}=${raw}; HttpOnly; Path=/; SameSite=${sameSite}; Max-Age=${age}${secure?'; Secure':''}`;
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' ${publicUrl.origin}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`);
  const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  try{
   const path=new URL(req.url,publicUrl).pathname,origin=req.headers.origin;
   if(path.startsWith('/api/')){
    if(origin&&!origins.has(origin))fail('Origin not allowed.',403);
    if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');}
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, X-CSRF-Token');res.writeHead(204);return res.end();}
    let body={};if(!['GET','HEAD'].includes(req.method)){if(!origin||!origins.has(origin))fail('A trusted origin is required.',403);if(!String(req.headers['content-type']).startsWith('application/json'))fail('JSON required.',415);let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>2_000_000)fail('Request is too large.',413);chunks.push(c);}try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{fail('Invalid JSON.');}}
    const raw=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
    const s=auth.session(raw);
    const clientIp=config.trustProxy?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim():req.socket.remoteAddress;
    if(path.startsWith('/api/auth/')&&req.method==='POST')auth.limit('auth-ip:'+clientIp,50);
    if(path==='/api/auth/session'&&req.method==='GET')return json(s?{user:s.user,csrf:s.csrf}:{user:null});
    if(path==='/api/auth/register'&&req.method==='POST')return json(await auth.register(body));
    if(path==='/api/auth/login'&&req.method==='POST'){const result=await auth.login(body);if(raw)auth.logout(raw);res.setHeader('Set-Cookie',cookie(result.raw));return json({user:result.user,csrf:result.csrf});}
    if(path==='/api/auth/verify'&&req.method==='POST')return json(await auth.verify(body.token));
    if(path==='/api/auth/resend'&&req.method==='POST')return json(await auth.recover(body.email,'verify'));
    if(path==='/api/auth/forgot'&&req.method==='POST')return json(await auth.recover(body.email,'reset'));
    if(path==='/api/auth/reset'&&req.method==='POST')return json(await auth.reset(body.token,body.password));
    if(!s)fail('Sign in to continue.',401);
    if(req.method!=='GET'&&req.headers['x-csrf-token']!==s.csrf)fail('Session check failed. Reload and try again.',403);
    if(path==='/api/auth/logout'&&req.method==='POST'){auth.logout(raw);res.setHeader('Set-Cookie',cookie('',0));return json({ok:true});}
    const user=auth.approved(s);
    if(path==='/api/admin/users'&&req.method==='GET')return json({users:auth.list(s)});
    if(path==='/api/admin/decision'&&req.method==='POST')return json(await auth.decision(s,body.id,body.status));
    if(path==='/api/workspace'&&req.method==='GET'){const row=auth.db.prepare('SELECT * FROM workspaces WHERE user_id=?').get(user.id);return json({workspace:row?JSON.parse(row.data):null,revision:row?.revision||0});}
    if(path==='/api/workspace'&&req.method==='PUT'){
     if(!Array.isArray(body.workspace?.maps)||body.workspace.maps.length>50||!Number.isInteger(body.revision)||body.revision<0)fail('Invalid workspace.');
     const ids=new Set();const maps=body.workspace.maps.map(m=>{if(typeof m.id!=='string'||m.id.length>100||ids.has(m.id))fail('Invalid map ID.');ids.add(m.id);return {...validateMap(m),id:m.id};});
     const workspace={maps,active:ids.has(body.workspace.active)?body.workspace.active:maps[0]?.id};
     auth.db.exec('BEGIN IMMEDIATE');try{const current=auth.db.prepare('SELECT revision FROM workspaces WHERE user_id=?').get(user.id)?.revision||0;if(current!==body.revision)fail('This workspace changed in another tab. Export your changes before reloading.',409);auth.db.prepare('INSERT INTO workspaces VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,revision=excluded.revision').run(user.id,JSON.stringify(workspace),current+1);auth.db.exec('COMMIT');return json({revision:current+1});}catch(e){auth.db.exec('ROLLBACK');throw e;}
    }
    if(path==='/api/suggest'&&req.method==='POST'){auth.limit('ai:'+user.id,30,3600000);const result=await ai(new Request(new URL('/api/suggest',publicUrl),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),config.env||{});res.writeHead(result.status,{'Content-Type':'application/json'});return res.end(await result.text());}
    fail('Not found.',404);
   }
   if(!['GET','HEAD'].includes(req.method))fail('Method not allowed.',405);
   const name=path==='/'?'index.html':path.slice(1);if(!files.has(name))fail('Not found.',404);
   const content=await readFile(new URL('../'+name,import.meta.url));res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css':'text/javascript');res.end(req.method==='HEAD'?undefined:content);
  }catch(e){json({error:e.status?e.message:'The server could not complete this request.'},e.status||500);}
 });
 server.requestTimeout=30000;server.headersTimeout=15000;
 return {server,auth,close:()=>new Promise(resolve=>server.close(()=>{auth.close();resolve();}))};
}
