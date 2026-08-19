
import { APP_CONFIG } from './config.js';
import { $,qsa,setNotice,normalizeText,statusOf,statusText,formatDate,inputDate,bytes } from './utils.js';
import { session,login,restoreSession,clearSavedSession,sendReset,list,getDoc,save,patch,remove,bumpVersion,createUser,sv,bv,iv,tv,arr } from './services/firebase.js';
import { uploadToR2,usage } from './services/r2.js';
import { renderDashboard,mediaRows,playlistCards,playlistItems } from './ui/render.js';

const state={media:[],playlists:[],urgent:[],users:[],screen:null,usage:null,selected:new Set(),currentPlaylistId:null};

function canEdit(){return session.email?.toLowerCase()===APP_CONFIG.mainAdmin || session.role==='editor'}
function isAdmin(){return session.email?.toLowerCase()===APP_CONFIG.mainAdmin}

async function loadAll(){
  const tasks=[list('media'),list('playlists'),list('urgent'),getDoc(`screens/${APP_CONFIG.screenId}`)];
  if(isAdmin()) tasks.push(list('users'));
  const result=await Promise.all(tasks);
  [state.media,state.playlists,state.urgent,state.screen]=result;
  state.users=isAdmin()?result[4]:[];
  state.media=state.media.filter(x=>!x.screenId||x.screenId===APP_CONFIG.screenId);
  state.playlists.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  if(!state.currentPlaylistId)state.currentPlaylistId=state.screen?.activePlaylistId||state.playlists[0]?.id||null;
  renderAll();
}
function renderAll(){
  renderDashboard(state);
  renderMedia();
  renderPlaylists();
  renderProgram();
  renderUrgent();
  renderUsers();
  $('lastSeen').textContent=state.screen?.lastSeen?formatDate(state.screen.lastSeen):'Nunca';
  $('currentMedia').textContent=state.screen?.currentMediaName||'-';
  $('navUsers').classList.toggle('hidden',!isAdmin());
  qsa('[data-view="programacao"],[data-view="playlists"],[data-view="midias"],[data-view="urgente"]').forEach(b=>b.disabled=!canEdit()&&b.dataset.view!=='midias');
}
function renderMedia(){
  const q=normalizeText($('mediaSearch').value),cat=$('mediaCategoryFilter').value,st=$('mediaStatusFilter').value;
  let rows=state.media.filter(m=>(!q||normalizeText(`${m.name||''} ${m.advertiser||''}`).includes(q))&&(!cat||m.category===cat)&&(!st||statusOf(m)===st));
  $('mediaBody').innerHTML=mediaRows(rows,state.selected);
  $('bulkCount').textContent=`${state.selected.size} selecionadas`;
  $('bulkBar').classList.toggle('hidden',state.selected.size===0);
}
function renderPlaylists(){
  $('playlistGrid').innerHTML=playlistCards(state.playlists,state.screen);
  $('programPlaylistSelect').innerHTML=state.playlists.map(p=>`<option value="${p.id}" ${p.id===state.currentPlaylistId?'selected':''}>${p.name}</option>`).join('');
}
function renderProgram(){
  const p=state.playlists.find(x=>x.id===state.currentPlaylistId);
  const map=new Map(state.media.map(m=>[m.id,m]));
  $('programDragList').innerHTML=playlistItems(p?.items||[],map);
}
function renderUrgent(){
  const map=new Map(state.media.map(m=>[m.id,m]));
  const list=state.urgent.slice().sort((a,b)=>(a.priority||999)-(b.priority||999));
  const html=list.map(u=>{const m=map.get(u.mediaId);return `<div class="urgent-item"><div><b>${m?.name||'Mídia removida'}</b><small>Prioridade ${u.priority||1} • ${u.active?'Ativo':'Desativado'}</small></div><div class="actions"><button class="ghost" data-urgent-toggle="${u.id}">${u.active?'Desativar':'Ativar'}</button><button class="ghost" data-urgent-delete="${u.id}">Excluir</button></div></div>`}).join('')||'<p class="muted">Nenhum conteúdo de última hora.</p>';
  $('urgentList').innerHTML=html;$('dashboardUrgentList').innerHTML=html;
}
function renderUsers(){
  if(!isAdmin())return;
  $('usersList').innerHTML=state.users.map(u=>`<div class="card" style="box-shadow:none;margin-bottom:8px"><b>${u.name||u.email}</b><small>${u.email} • ${u.role||'viewer'} • ${u.active?'Ativo':'Desativado'}</small></div>`).join('')||'<p class="muted">Nenhum usuário adicional.</p>';
}
function switchView(name){
  qsa('.view').forEach(v=>v.classList.add('hidden'));$(`view-${name}`).classList.remove('hidden');
  qsa('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  const titles={dashboard:['Dashboard','Visão geral da operação.'],programacao:['Programação','Organize a ordem por arrastar e soltar.'],playlists:['Playlists','Predefinições de conteúdo para diferentes momentos.'],midias:['Biblioteca','Arquivos disponíveis para reutilizar nas playlists.'],urgente:['Última hora','Conteúdo prioritário antes da programação normal.'],usuarios:['Usuários','Controle de acesso ao painel.'],sistema:['Sistema','Armazenamento e conectividade.']};
  [$('pageTitle').textContent,$('pageSubtitle').textContent]=titles[name]||titles.dashboard;
}

function openMedia(m=null){
  $('mediaId').value=m?.id||'';$('mediaDialogTitle').textContent=m?'Editar mídia':'Nova mídia';$('mName').value=m?.name||'';$('mType').value=m?.type||'video';$('mCategory').value=m?.category||'hotel';$('mAdvertiser').value=m?.advertiser||'';$('mDuration').value=m?.duration||10;$('mActive').value=String(m?.active!==false);$('mStart').value=inputDate(m?.startDate);$('mEnd').value=inputDate(m?.endDate);$('mUrl').value=m?.url||'';$('mFile').value='';setNotice($('mediaProgress'),'Aguardando.');$('mediaDialog').showModal();
}
async function saveMediaForm(){
  try{
    if(!canEdit())throw new Error('Seu perfil é somente leitura.');
    const name=$('mName').value.trim();if(!name)throw new Error('Informe o nome.');
    if($('mStart').value&&$('mEnd').value&&$('mEnd').value<$('mStart').value)throw new Error('Data final anterior à inicial.');
    let url=$('mUrl').value.trim(),r2Key='';
    const file=$('mFile').files[0];
    if(file){
      if(file.size>500*1024*1024)throw new Error('Arquivo acima de 500 MB.');
      setNotice($('mediaProgress'),'Enviando ao R2...');
      const d=await uploadToR2(file,{name,category:$('mCategory').value,type:$('mType').value},p=>setNotice($('mediaProgress'),`Upload ${p}%`));
      url=d.publicUrl;r2Key=d.key;
    }
    if(!url)throw new Error('Selecione um arquivo ou informe uma URL.');
    const fields={name:sv(name),type:sv($('mType').value),category:sv($('mCategory').value),advertiser:sv($('mAdvertiser').value.trim()),screenId:sv(APP_CONFIG.screenId),url:sv(url),r2Key:sv(r2Key||state.media.find(x=>x.id===$('mediaId').value)?.r2Key||''),duration:iv($('mDuration').value),active:bv($('mActive').value==='true'),updatedAt:{timestampValue:new Date().toISOString()}};
    const s=tv($('mStart').value,false),e=tv($('mEnd').value,true);if(s)fields.startDate=s;if(e)fields.endDate=e;
    const id=$('mediaId').value;if(!id)fields.createdAt={timestampValue:new Date().toISOString()};
    await save('media',id,fields);await bumpVersion();await loadAll();setNotice($('mediaProgress'),'Salvo com sucesso.','ok');setTimeout(()=>$('mediaDialog').close(),400);
  }catch(e){setNotice($('mediaProgress'),`Erro: ${e.message}`,'error')}
}
function openPlaylist(p=null){
  $('playlistId').value=p?.id||'';$('pName').value=p?.name||'';$('pDescription').value=p?.description||'';$('pStart').value=p?.scheduleStart?new Date(p.scheduleStart).toISOString().slice(0,16):'';$('pEnd').value=p?.scheduleEnd?new Date(p.scheduleEnd).toISOString().slice(0,16):'';$('playlistDialog').showModal();
}
async function savePlaylistForm(){
  try{
    if(!canEdit())throw new Error('Sem permissão.');
    const id=$('playlistId').value,old=state.playlists.find(x=>x.id===id);
    const fields={name:sv($('pName').value.trim()),description:sv($('pDescription').value.trim()),items:arr(old?.items||[]),updatedAt:{timestampValue:new Date().toISOString()}};
    if($('pStart').value)fields.scheduleStart={timestampValue:new Date($('pStart').value).toISOString()};
    if($('pEnd').value)fields.scheduleEnd={timestampValue:new Date($('pEnd').value).toISOString()};
    if(!id)fields.createdAt={timestampValue:new Date().toISOString()};
    await save('playlists',id,fields);await bumpVersion();await loadAll();$('playlistDialog').close();
  }catch(e){setNotice($('playlistNotice'),`Erro: ${e.message}`,'error')}
}
function openChooseMedia(){
  $('chooseMediaSearch').value='';renderChooseMedia();$('chooseMediaDialog').showModal();
}
function renderChooseMedia(){
  const q=normalizeText($('chooseMediaSearch').value);$('chooseMediaList').innerHTML=state.media.filter(m=>!q||normalizeText(`${m.name} ${m.advertiser||''}`).includes(q)).map(m=>`<div class="card" style="box-shadow:none;margin-bottom:8px"><div class="row spread"><div><b>${m.name}</b><small>${m.advertiser||''}</small></div><button class="ghost" data-add-media="${m.id}">Adicionar</button></div></div>`).join('');
}
async function addToPlaylist(mediaId){
  const p=state.playlists.find(x=>x.id===state.currentPlaylistId);if(!p)return;
  const items=[...(p.items||[])];if(items.some(x=>x.mediaId===mediaId))return;
  items.push({mediaId,order:items.length+1,durationOverride:0});
  await patch('playlists',p.id,{items:arr(items),updatedAt:{timestampValue:new Date().toISOString()}},['items','updatedAt']);await bumpVersion();await loadAll();renderProgram();
}
async function saveDragOrder(){
  const p=state.playlists.find(x=>x.id===state.currentPlaylistId);if(!p)return;
  const ids=qsa('.drag-item',$('programDragList')).map(x=>x.dataset.mediaId);
  const items=ids.map((id,i)=>({mediaId:id,order:i+1,durationOverride:0}));
  await patch('playlists',p.id,{items:arr(items),updatedAt:{timestampValue:new Date().toISOString()}},['items','updatedAt']);await bumpVersion();await loadAll();
}
async function activatePlaylist(id){
  await patch('screens',APP_CONFIG.screenId,{activePlaylistId:sv(id),updatedAt:{timestampValue:new Date().toISOString()}},['activePlaylistId','updatedAt']);await bumpVersion();state.currentPlaylistId=id;await loadAll();
}
async function duplicatePlaylist(id){
  const p=state.playlists.find(x=>x.id===id);if(!p)return;
  await save('playlists','',{name:sv(`${p.name} - cópia`),description:sv(p.description||''),items:arr(p.items||[]),createdAt:{timestampValue:new Date().toISOString()},updatedAt:{timestampValue:new Date().toISOString()}});await bumpVersion();await loadAll();
}
function openUrgent(mediaId=''){
  $('uMedia').innerHTML=state.media.map(m=>`<option value="${m.id}" ${m.id===mediaId?'selected':''}>${m.name}</option>`).join('');$('uPriority').value=1;$('uActive').value='true';$('uStart').value='';$('uEnd').value='';$('urgentDialog').showModal();
}
async function saveUrgent(){
  const fields={mediaId:sv($('uMedia').value),priority:iv($('uPriority').value),active:bv($('uActive').value==='true'),createdAt:{timestampValue:new Date().toISOString()},updatedAt:{timestampValue:new Date().toISOString()}};
  if($('uStart').value)fields.startDate={timestampValue:new Date($('uStart').value).toISOString()};
  if($('uEnd').value)fields.endDate={timestampValue:new Date($('uEnd').value).toISOString()};
  await save('urgent','',fields);await bumpVersion();await loadAll();$('urgentDialog').close();
}
function previewMedia(m){
  $('previewBox').innerHTML=m.type==='image'?`<img src="${m.url}">`:`<video src="${m.url}" controls autoplay></video>`;$('previewDialog').showModal();
}
function previewPlaylist(){
  const p=state.playlists.find(x=>x.id===state.currentPlaylistId),map=new Map(state.media.map(m=>[m.id,m]));const first=(p?.items||[]).sort((a,b)=>a.order-b.order)[0];const m=first&&map.get(first.mediaId);if(m)previewMedia(m)
}

async function enterAdmin(){
  $('loginView').classList.add('hidden');
  $('adminView').classList.remove('hidden');
  $('sessionEmail').textContent=session.email;
  await loadAll();
  try{
    state.usage=await usage();
    renderDashboard(state);
  }catch{}
}

async function handleLogin(){
  try{
    setNotice($('loginNotice'),'Entrando...');
    await login($('loginEmail').value.trim(),$('loginPass').value);
    await enterAdmin();
  }catch(e){
    setNotice($('loginNotice'),`Erro: ${e.message}`,'error');
  }
}

$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  await handleLogin();
});

async function bootstrapSession(){
  try{
    setNotice($('loginNotice'),'Verificando sessão...');
    const restored=await restoreSession();
    if(restored){
      await enterAdmin();
      return;
    }
    setNotice($('loginNotice'),'Aguardando login.');
  }catch{
    setNotice($('loginNotice'),'Aguardando login.');
  }
}

bootstrapSession();

$('resetLink').onclick=async()=>{try{const e=$('loginEmail').value.trim();if(!e)throw new Error('Informe o e-mail.');await sendReset(e);setNotice($('loginNotice'),'E-mail de recuperação enviado.','ok')}catch(e){setNotice($('loginNotice'),`Erro: ${e.message}`,'error')}};
$('logoutBtn').onclick=()=>{clearSavedSession();location.reload();};
qsa('.nav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
qsa('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('quickNew').onclick=()=>openMedia();$('newMediaBtn').onclick=()=>openMedia();$('saveMediaBtn').onclick=saveMediaForm;
$('mediaSearch').oninput=renderMedia;$('mediaCategoryFilter').onchange=renderMedia;$('mediaStatusFilter').onchange=renderMedia;
$('newPlaylistBtn').onclick=()=>openPlaylist();$('savePlaylistBtn').onclick=savePlaylistForm;
$('programPlaylistSelect').onchange=e=>{state.currentPlaylistId=e.target.value;renderProgram()};
$('addMediaToPlaylistBtn').onclick=openChooseMedia;$('chooseMediaSearch').oninput=renderChooseMedia;$('saveOrderBtn').onclick=saveDragOrder;$('previewPlaylistBtn').onclick=previewPlaylist;
$('newUrgentBtn').onclick=()=>openUrgent();$('dashboardUrgentBtn').onclick=()=>openUrgent();$('saveUrgentBtn').onclick=saveUrgent;
$('newUserBtn').onclick=()=>$('userDialog').showModal();$('saveUserBtn').onclick=async()=>{try{await createUser($('usrEmail').value.trim(),$('usrPass').value,$('usrName').value.trim(),$('usrRole').value);setNotice($('userNotice'),'Usuário criado.','ok');await loadAll()}catch(e){setNotice($('userNotice'),`Erro: ${e.message}`,'error')}};
$('healthBtn').onclick=async()=>{try{const r=await fetch('/api/health'),d=await r.json();setNotice($('systemNotice'),d.ok?`Backend OK • ${d.bucket}`:'Falha',d.ok?'ok':'error')}catch{setNotice($('systemNotice'),'Backend indisponível.','error')}};
$('usageBtn').onclick=async()=>{try{state.usage=await usage();setNotice($('systemNotice'),`R2: ${bytes(state.usage.bytes)} em ${state.usage.count} arquivos.`,'ok');renderDashboard(state)}catch(e){setNotice($('systemNotice'),e.message,'error')}};

$('mediaBody').onclick=async e=>{
  const b=e.target.closest('button');if(!b)return;
  const id=b.dataset.preview||b.dataset.edit||b.dataset.duplicate||b.dataset.urgent;
  const m=state.media.find(x=>x.id===id);
  if(b.dataset.preview)previewMedia(m);
  if(b.dataset.edit)openMedia(m);
  if(b.dataset.duplicate){openMedia({...m,id:''});$('mName').value=`${m.name} - cópia`}
  if(b.dataset.urgent)openUrgent(m.id);
};
$('mediaBody').onchange=e=>{const c=e.target.closest('.bulkCheck');if(!c)return;c.checked?state.selected.add(c.dataset.id):state.selected.delete(c.dataset.id);renderMedia()};
$('bulkActivate').onclick=async()=>{for(const id of state.selected)await patch('media',id,{active:bv(true),updatedAt:{timestampValue:new Date().toISOString()}},['active','updatedAt']);await bumpVersion();state.selected.clear();await loadAll()};
$('bulkDisable').onclick=async()=>{for(const id of state.selected)await patch('media',id,{active:bv(false),updatedAt:{timestampValue:new Date().toISOString()}},['active','updatedAt']);await bumpVersion();state.selected.clear();await loadAll()};
$('bulkAddPlaylist').onclick=()=>{if(!state.currentPlaylistId)state.currentPlaylistId=state.playlists[0]?.id;openChooseMedia()};

$('playlistGrid').onclick=async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.openPlaylist){state.currentPlaylistId=b.dataset.openPlaylist;switchView('programacao');renderProgram();renderPlaylists()}
  if(b.dataset.activatePlaylist)await activatePlaylist(b.dataset.activatePlaylist);
  if(b.dataset.duplicatePlaylist)await duplicatePlaylist(b.dataset.duplicatePlaylist);
};
$('chooseMediaList').onclick=async e=>{const b=e.target.closest('[data-add-media]');if(b){await addToPlaylist(b.dataset.addMedia);$('chooseMediaDialog').close()}};
$('programDragList').onclick=async e=>{const b=e.target.closest('[data-remove-item]');if(!b)return;const p=state.playlists.find(x=>x.id===state.currentPlaylistId);const items=(p.items||[]).filter(x=>x.mediaId!==b.dataset.removeItem).map((x,i)=>({...x,order:i+1}));await patch('playlists',p.id,{items:arr(items),updatedAt:{timestampValue:new Date().toISOString()}},['items','updatedAt']);await bumpVersion();await loadAll()};
let dragged=null;
$('programDragList').addEventListener('dragstart',e=>{const it=e.target.closest('.drag-item');if(!it)return;dragged=it;it.classList.add('dragging')});
$('programDragList').addEventListener('dragend',e=>{e.target.closest('.drag-item')?.classList.remove('dragging');dragged=null});
$('programDragList').addEventListener('dragover',e=>{e.preventDefault();if(!dragged)return;const target=e.target.closest('.drag-item');if(!target||target===dragged)return;const rect=target.getBoundingClientRect();const after=e.clientY>rect.top+rect.height/2;target.parentNode.insertBefore(dragged,after?target.nextSibling:target)});
$('urgentList').onclick=$('dashboardUrgentList').onclick=async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.urgentToggle){const u=state.urgent.find(x=>x.id===b.dataset.urgentToggle);await patch('urgent',u.id,{active:bv(!u.active),updatedAt:{timestampValue:new Date().toISOString()}},['active','updatedAt']);await bumpVersion();await loadAll()}if(b.dataset.urgentDelete){await remove('urgent',b.dataset.urgentDelete);await bumpVersion();await loadAll()}};
