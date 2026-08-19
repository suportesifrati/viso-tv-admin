
export const $ = id => document.getElementById(id);
export const qs = (s,root=document)=>root.querySelector(s);
export const qsa = (s,root=document)=>[...root.querySelectorAll(s)];
export function setNotice(el,text,type=''){el.textContent=text;el.className=`notice ${type}`;}
export function normalizeText(v=''){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
export function formatDate(v){if(!v)return'';return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Fortaleza'}).format(new Date(v))}
export function inputDate(v){if(!v)return'';return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v))}
export function bytes(n=0){const u=['B','KB','MB','GB'];let i=0;while(n>=1024&&i<u.length-1){n/=1024;i++}return `${n.toFixed(i?1:0)} ${u[i]}`}
export function statusOf(m){
  if(!m.active)return'disabled';
  const now=Date.now(),s=m.startDate?new Date(m.startDate).getTime():null,e=m.endDate?new Date(m.endDate).getTime():null;
  if(s&&now<s)return'scheduled'; if(e&&now>e)return'expired'; return'running';
}
export const statusText=s=>({running:'Em exibição',scheduled:'Agendada',expired:'Expirada',disabled:'Desativada'}[s]||s);
export const categoryText=c=>c==='advertising'?'Publicidade':'VISO Hotel';
export function estimateDuration(items,mediaMap){
  let total=0;
  for(const it of items||[]){
    const m=mediaMap.get(it.mediaId); if(!m)continue;
    if(m.type==='image') total += Number(it.durationOverride||m.duration||10);
  }
  return total;
}
