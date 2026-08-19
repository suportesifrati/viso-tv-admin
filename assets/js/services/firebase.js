
import { APP_CONFIG } from '../config.js';

export let session={token:null,uid:null,email:null,role:null};
const base=()=>`https://firestore.googleapis.com/v1/projects/${APP_CONFIG.firebase.projectId}/databases/(default)/documents`;
const headers=()=>({Authorization:`Bearer ${session.token}`,'Content-Type':'application/json'});

function dec(v){
  if(!v)return null;
  if('stringValue'in v)return v.stringValue;
  if('booleanValue'in v)return v.booleanValue;
  if('integerValue'in v)return Number(v.integerValue);
  if('doubleValue'in v)return Number(v.doubleValue);
  if('timestampValue'in v)return v.timestampValue;
  if('arrayValue'in v)return (v.arrayValue.values||[]).map(dec);
  if('mapValue'in v){const o={};for(const[k,x]of Object.entries(v.mapValue.fields||{}))o[k]=dec(x);return o}
  return null;
}
function doc(d){if(!d)return null;const o={id:d.name?.split('/').pop()};for(const[k,v]of Object.entries(d.fields||{}))o[k]=dec(v);return o}
export const sv=v=>({stringValue:String(v??'')});
export const bv=v=>({booleanValue:!!v});
export const iv=v=>({integerValue:String(parseInt(v,10)||0)});
export const tv=(dateStr,end=false)=>!dateStr?null:{timestampValue:new Date(end?`${dateStr}T23:59:59-03:00`:`${dateStr}T00:00:00-03:00`).toISOString()};
export const arr=v=>({arrayValue:{values:(v||[]).map(x=>({mapValue:{fields:{
  mediaId:sv(x.mediaId),
  order:iv(x.order),
  durationOverride:x.durationOverride?iv(x.durationOverride):iv(0)
}}}))}});

export async function login(email,password){
  const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${APP_CONFIG.firebase.apiKey}`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})
  });
  const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||'Falha no login.');
  session={token:d.idToken,uid:d.localId,email:d.email,role:'admin'};
  if(session.email.toLowerCase()!==APP_CONFIG.mainAdmin){
    const p=await getDoc(`users/${session.uid}`);if(!p?.active)throw new Error('Usuário sem acesso.');
    session.role=p.role||'viewer';
  }
  return session;
}
export async function sendReset(email){
  const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${APP_CONFIG.firebase.apiKey}`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestType:'PASSWORD_RESET',email})
  });
  const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||'Falha ao enviar recuperação.');
}
export async function getDoc(path){
  const r=await fetch(`${base()}/${path}`,{headers:headers()});if(r.status===404)return null;if(!r.ok)throw new Error(await r.text());return doc(await r.json())
}
export async function list(col,pageSize=1000){
  const r=await fetch(`${base()}/${col}?pageSize=${pageSize}`,{headers:headers()});if(!r.ok)throw new Error(await r.text());
  const d=await r.json();return (d.documents||[]).map(doc);
}
export async function save(col,id,fields){
  const u=id?`${base()}/${col}/${id}`:`${base()}/${col}`;
  const r=await fetch(u,{method:id?'PATCH':'POST',headers:headers(),body:JSON.stringify({fields})});if(!r.ok)throw new Error(await r.text());return doc(await r.json())
}
export async function patch(col,id,fields,masks){
  const qs=masks.map(x=>`updateMask.fieldPaths=${encodeURIComponent(x)}`).join('&');
  const r=await fetch(`${base()}/${col}/${id}?${qs}`,{method:'PATCH',headers:headers(),body:JSON.stringify({fields})});if(!r.ok)throw new Error(await r.text());return doc(await r.json())
}
export async function remove(col,id){
  const r=await fetch(`${base()}/${col}/${id}`,{method:'DELETE',headers:headers()});if(!r.ok)throw new Error(await r.text())
}
export async function bumpVersion(){
  const p=await getDoc('settings/player');const v=(p?.playlistVersion||0)+1;
  await patch('settings','player',{playlistVersion:iv(v),updatedAt:{timestampValue:new Date().toISOString()}},['playlistVersion','updatedAt']);
  return v;
}
export async function createUser(email,password,name,role){
  if(session.email.toLowerCase()!==APP_CONFIG.mainAdmin)throw new Error('Somente o admin principal pode criar usuarios.');
  const r=await fetch('/api/users-create',{
    method:'POST',
    headers:{Authorization:`Bearer ${session.token}`,'Content-Type':'application/json'},
    body:JSON.stringify({email,password,name,role})
  });
  const d=await r.json();
  if(!r.ok)throw new Error(d?.error||'Falha ao criar usuario.');
  return d.uid;
}
