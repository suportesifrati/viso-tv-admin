
import { session } from './firebase.js';

export async function uploadToR2(file,meta,onProgress=()=>{}){
  const pre=await fetch('/api/r2-presign',{method:'POST',headers:{Authorization:`Bearer ${session.token}`,'Content-Type':'application/json'},body:JSON.stringify({
    filename:file.name,contentType:file.type,category:meta.category,type:meta.type,displayName:meta.name
  })});
  const d=await pre.json();if(!pre.ok)throw new Error(d?.error||'Falha ao preparar upload.');
  await new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('PUT',d.uploadUrl,true);xhr.setRequestHeader('Content-Type',file.type);
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100))};
    xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error(`R2 HTTP ${xhr.status}`));
    xhr.onerror=()=>reject(new Error('Falha de rede durante o upload para o R2.'));
    xhr.send(file);
  });
  return d;
}
export async function deleteR2(key){
  const r=await fetch('/api/r2-object',{method:'DELETE',headers:{Authorization:`Bearer ${session.token}`,'Content-Type':'application/json'},body:JSON.stringify({key})});
  const d=await r.json();if(!r.ok)throw new Error(d?.error||'Falha ao excluir arquivo.');
}
export async function usage(){
  const r=await fetch('/api/r2-usage',{headers:{Authorization:`Bearer ${session.token}`}});
  const d=await r.json();if(!r.ok)throw new Error(d?.error||'Falha ao consultar uso.');
  return d;
}
