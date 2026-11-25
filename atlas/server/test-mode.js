// Local-only testing with no sign-in. Browser maps are separate from account data.
import { createApp } from './app.js';
const port=Number(process.env.PORT||4317);
const origin=`http://localhost:${port}`;
const app=createApp({config:{databasePath:':memory:',adminEmail:'local-test@example.invalid',publicUrl:origin,frontendUrl:origin+'/',localTestAI:true,trustProxy:false,env:process.env},sendMail:async()=>{throw Error('Email is disabled in local test mode.');}});
app.server.listen(port,'127.0.0.1',()=>console.log(`Atlas test mode: ${origin} (no sign-in; ${process.env.OPENAI_API_KEY?'AI configured':'AI key not configured'})`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();process.exit(0);});
