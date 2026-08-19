
import { statusOf,statusText,categoryText,formatDate,bytes } from '../utils.js';

export function renderDashboard({media,playlists,urgent,screen,usage}){
  document.getElementById('dMedia').textContent=media.length;
  document.getElementById('dPlaylists').textContent=playlists.length;
  document.getElementById('dUrgent').textContent=urgent.filter(x=>statusOf(x)==='running').length;
  document.getElementById('dStorage').textContent=usage?bytes(usage.bytes):'...';
  document.getElementById('screenState').textContent=screen?.online?'Online':'Offline';
  document.getElementById('activePlaylistName').textContent=playlists.find(p=>p.id===screen?.activePlaylistId)?.name||'Nenhuma';
}
export function mediaRows(media,selected){
  return media.map(m=>`<tr draggable="false">
    <td><input class="bulkCheck" type="checkbox" data-id="${m.id}" ${selected.has(m.id)?'checked':''}></td>
    <td>${m.type==='image'?`<img class="thumb" src="${m.url}">`:`<div class="video-thumb">▶</div>`}</td>
    <td><b>${m.name||''}</b><small>${m.advertiser||''}</small></td>
    <td>${categoryText(m.category)}</td>
    <td><span class="badge ${statusOf(m)}">${statusText(statusOf(m))}</span></td>
    <td>${m.startDate?formatDate(m.startDate):'Sempre'} → ${m.endDate?formatDate(m.endDate):'Sem fim'}</td>
    <td><div class="actions">
      <button data-preview="${m.id}" class="ghost">Preview</button>
      <button data-edit="${m.id}" class="ghost">Editar</button>
      <button data-duplicate="${m.id}" class="ghost">Duplicar</button>
      <button data-urgent="${m.id}" class="ghost">Última hora</button>
    </div></td>
  </tr>`).join('')||'<tr><td colspan="7">Nenhuma mídia encontrada.</td></tr>';
}
export function playlistCards(playlists,screen){
  return playlists.map(p=>`<article class="playlist-card ${screen?.activePlaylistId===p.id?'active':''}">
    <div><span class="eyebrow">${screen?.activePlaylistId===p.id?'PLAYLIST ATIVA':'PLAYLIST'}</span><h3>${p.name||'Sem nome'}</h3><p>${(p.items||[]).length} itens</p></div>
    <div class="actions">
      <button class="ghost" data-open-playlist="${p.id}">Abrir</button>
      <button class="ghost" data-activate-playlist="${p.id}">Ativar</button>
      <button class="ghost" data-duplicate-playlist="${p.id}">Duplicar</button>
    </div>
  </article>`).join('')||'<p class="muted">Nenhuma playlist criada.</p>';
}
export function playlistItems(items,mediaMap){
  return (items||[]).sort((a,b)=>(a.order||0)-(b.order||0)).map((it,i)=>{
    const m=mediaMap.get(it.mediaId);
    return `<div class="drag-item" draggable="true" data-media-id="${it.mediaId}">
      <div class="handle">☰</div>
      <div class="drag-number">${i+1}</div>
      <div class="drag-main"><b>${m?.name||'Mídia removida'}</b><small>${m?.type==='image'?'Imagem':'Vídeo'} ${m?.advertiser?`• ${m.advertiser}`:''}</small></div>
      <button class="ghost" data-remove-item="${it.mediaId}">Remover</button>
    </div>`;
  }).join('')||'<div class="empty">Adicione mídias a esta playlist.</div>';
}
