let allTracks=[];
let view={level:'categories',category:null,album:null};
let query='',liveEndpoint='',liveOnline=false;
const pending=new Set();
const PALETTE=[['#0B4C55','#0E6872'],['#2F673A','#4D8757'],['#77542E','#A17843'],['#5B456F','#80639A'],['#7A3948','#A65368'],['#315B77','#4E7D9E'],['#655E2E','#8F8643'],['#6E4535','#96614B']];

const $=s=>document.querySelector(s);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function hash(s){let h=0;for(const c of String(s)){h=((h<<5)-h)+c.charCodeAt(0);h|=0}return Math.abs(h)}
function colors(n){return PALETTE[hash(n)%PALETTE.length]}
function initials(s){return String(s||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function toast(msg,bad=false){const t=$('#toast');t.textContent=msg;t.classList.toggle('bad',bad);t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2800)}
function clientId(){let id=localStorage.getItem('ltcMusicClientId');if(!id){id='web_'+crypto.randomUUID().replaceAll('-','');localStorage.setItem('ltcMusicClientId',id)}return id}
function viewer(){return $('#viewerName').value.trim()}
function saveViewer(){const v=viewer();if(v)localStorage.setItem('ltcMusicViewer',v);else localStorage.removeItem('ltcMusicViewer')}

async function copyCommand(id){
  const cmd='!song #'+id;
  try{await navigator.clipboard.writeText(cmd)}
  catch(e){const ta=document.createElement('textarea');ta.value=cmd;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}
  toast('Relay hors ligne — commande copiée : '+cmd);
}

async function requestTrack(id){
  if(!liveOnline||!liveEndpoint)return copyCommand(id);
  if(pending.has(String(id)))return;
  pending.add(String(id));updateButtons();
  saveViewer();
  try{
    const r=await fetch(liveEndpoint+'/request',{
      method:'POST',
      mode:'cors',
      cache:'no-store',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({track_id:Number(id),viewer:viewer(),client_id:clientId()})
    });
    const data=await r.json().catch(()=>({ok:false,message:'Réponse invalide du relay.'}));
    if(!r.ok||!data.ok){toast(data.message||'Demande refusée.',true);return}
    toast(data.message||'Morceau ajouté à la file.');
    await refreshLive();
  }catch(e){
    liveOnline=false;updateLiveMode();updateButtons();
    toast('Relay inaccessible. Le bouton repasse en mode commande chat.',true);
    await copyCommand(id);
  }finally{
    pending.delete(String(id));updateButtons();
  }
}

function groupCategories(){
  const m=new Map();
  for(const t of allTracks){
    const c=t.category||'À classer';
    if(!m.has(c))m.set(c,{name:c,tracks:0,albums:new Set()});
    const x=m.get(c);x.tracks++;x.albums.add(t.album||'Sans album');
  }
  return [...m.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr'));
}
function groupAlbums(category){
  const m=new Map();
  for(const t of allTracks.filter(t=>(t.category||'À classer')===category)){
    const a=t.album||'Sans album';
    if(!m.has(a))m.set(a,{name:a,category,tracks:0,cover:t.cover||''});
    const x=m.get(a);x.tracks++;if(!x.cover&&t.cover)x.cover=t.cover;
  }
  return [...m.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr'));
}
function tracksFor(c,a){return allTracks.filter(t=>(t.category||'À classer')===c&&(t.album||'Sans album')===a).sort((x,y)=>x.title.localeCompare(y.title,'fr',{numeric:true}))}

function setView(level,category=null,album=null){
  view={level,category,album};query='';$('#search').value='';render();
  window.scrollTo({top:$('#breadcrumb').offsetTop-12,behavior:'smooth'});
}
function renderBreadcrumb(){
  const b=$('#breadcrumb');
  let h=`<button class="crumb ${view.level==='categories'?'active':''}" data-l="categories">Styles</button>`;
  if(view.category)h+=`<span>›</span><button class="crumb ${view.level==='albums'?'active':''}" data-l="albums">${esc(view.category)}</button>`;
  if(view.album)h+=`<span>›</span><span class="crumb active">${esc(view.album)}</span>`;
  b.innerHTML=h;
  b.querySelector('[data-l="categories"]')?.addEventListener('click',()=>setView('categories'));
  b.querySelector('[data-l="albums"]')?.addEventListener('click',()=>setView('albums',view.category));
}
function coverHTML(item,kind){
  const [a,b]=colors(kind==='category'?item.name:(item.category||item.name));
  if(kind==='album'&&item.cover)return `<div class="cover album-cover" style="--ca:${a};--cb:${b}"><img src="${esc(item.cover)}" alt="" loading="lazy" onerror="this.remove();this.parentElement.classList.add('fallback')"><span>${esc(initials(item.name))}</span></div>`;
  return `<div class="cover ${kind}-cover fallback" style="--ca:${a};--cb:${b}"><span>${esc(initials(item.name))}</span></div>`;
}
function searchTracks(q){
  const n=q.trim().toLocaleLowerCase('fr');
  return n?allTracks.filter(t=>[t.title,t.artist,t.category,t.album,t.id].join(' ').toLocaleLowerCase('fr').includes(n)):[];
}
function trackCard(t){
  const[a,b]=colors(t.category||'À classer');
  return `<article class="track-card">
    <div class="track-cover" style="--ca:${a};--cb:${b}">${t.cover?`<img src="${esc(t.cover)}" alt="" loading="lazy" onerror="this.remove()">`:''}<span>♫</span></div>
    <div class="track-main"><div class="track-meta"><span class="id">#${t.id}</span><span class="tag">${esc(t.category||'À classer')}</span></div><div class="title">${esc(t.title)}</div><div class="artist">${esc(t.artist)} · ${esc(t.album||'Sans album')}</div></div>
    <button class="request" data-id="${t.id}"></button>
  </article>`;
}
function bindTrackButtons(){document.querySelectorAll('.request').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();requestTrack(b.dataset.id)}));updateButtons()}
function updateButtons(){
  document.querySelectorAll('.request').forEach(b=>{
    const busy=pending.has(String(b.dataset.id));
    b.disabled=busy;
    b.textContent=busy?'Ajout…':(liveOnline?'Ajouter à la file':'Copier !song');
    b.classList.toggle('fallback-btn',!liveOnline);
  });
}
function renderCategories(){
  const cats=groupCategories();$('#count').textContent=`${cats.length} style${cats.length>1?'s':''}`;$('#modehint').textContent=`${allTracks.length} morceaux`;
  $('#grid').innerHTML=cats.map(c=>{const[a,b]=colors(c.name);return `<article class="browse-card category-card" data-v="${encodeURIComponent(c.name)}" style="--ca:${a};--cb:${b}">${coverHTML(c,'category')}<div class="browse-body"><span class="kicker">Style</span><h2>${esc(c.name)}</h2><p>${c.albums.size} album${c.albums.size>1?'s':''} · ${c.tracks} morceau${c.tracks>1?'x':''}</p><button class="open-btn">Explorer <span>→</span></button></div></article>`}).join('');
  document.querySelectorAll('.category-card').forEach(x=>x.addEventListener('click',()=>setView('albums',decodeURIComponent(x.dataset.v))));
}
function renderAlbums(){
  const albums=groupAlbums(view.category);$('#count').textContent=`${albums.length} album${albums.length>1?'s':''}`;$('#modehint').textContent=view.category;
  $('#grid').innerHTML=albums.map(a=>`<article class="browse-card album-card" data-v="${encodeURIComponent(a.name)}">${coverHTML(a,'album')}<div class="browse-body"><span class="kicker">${esc(view.category)}</span><h2>${esc(a.name)}</h2><p>${a.tracks} morceau${a.tracks>1?'x':''}</p><button class="open-btn">Voir l'album <span>→</span></button></div></article>`).join('');
  document.querySelectorAll('.album-card').forEach(x=>x.addEventListener('click',()=>setView('tracks',view.category,decodeURIComponent(x.dataset.v))));
}
function renderTracks(){
  const tracks=tracksFor(view.category,view.album);$('#count').textContent=`${tracks.length} morceau${tracks.length>1?'x':''}`;$('#modehint').textContent=view.album;
  $('#grid').innerHTML=tracks.length?tracks.map(trackCard).join(''):'<div class="empty">Cet album est vide.</div>';bindTrackButtons();
}
function renderSearch(){
  const tracks=searchTracks(query);$('#count').textContent=`${tracks.length} résultat${tracks.length>1?'s':''}`;$('#modehint').textContent='Recherche globale';
  $('#grid').innerHTML=tracks.length?tracks.map(trackCard).join(''):'<div class="empty">Aucun résultat.</div>';bindTrackButtons();
}
function render(){renderBreadcrumb();if(query.trim())return renderSearch();if(view.level==='categories')return renderCategories();if(view.level==='albums')return renderAlbums();renderTracks()}

function renderLiveOffline(msg='Le morceau en cours apparaîtra ici pendant le live.'){
  liveOnline=false;$('#liveDot').classList.add('offline');$('#liveUpdated').textContent='hors ligne';
  $('#liveCurrent').innerHTML=`<div><span class="kicker">En cours</span><strong>Le direct musical est hors ligne</strong><span>${esc(msg)}</span></div>`;
  $('#queueCount').textContent='0';$('#liveQueue').innerHTML='<div class="queue-empty">Aucune file publique pour le moment.</div>';updateLiveMode();updateButtons();
}
function updateLiveMode(){
  $('#requestStatus').textContent=liveOnline?'Actives — ajout direct à la file. 1 demande en attente maximum par navigateur.':'Hors ligne — le bouton copiera la commande chat.';
}
async function loadLiveConfig(){
  try{
    const r=await fetch('live-config.json',{cache:'no-store'});if(!r.ok)return renderLiveOffline();
    const c=await r.json();liveEndpoint=(c.endpoint||'').replace(/\/$/,'');
    if(!liveEndpoint)return renderLiveOffline();
    await refreshLive();setInterval(refreshLive,3000);
  }catch(e){renderLiveOffline()}
}
async function refreshLive(){
  if(!liveEndpoint)return renderLiveOffline();
  try{
    const r=await fetch(liveEndpoint+'/live',{cache:'no-store'});if(!r.ok)throw 0;
    const s=await r.json();liveOnline=true;$('#liveDot').classList.remove('offline');$('#liveUpdated').textContent='en direct';
    $('#liveCurrent').innerHTML=s.current?`<div><span class="kicker">En cours</span><strong>${esc(s.current.title)}</strong><span>${esc(s.current.artist)} · ${esc(s.current.album||'')} · ${esc(s.current.category||'')}</span></div>`:'<div><span class="kicker">En cours</span><strong>Aucun morceau</strong><span>Le lecteur attend le prochain titre.</span></div>';
    const q=Array.isArray(s.queue)?s.queue:[];$('#queueCount').textContent=s.queue_length||q.length||0;
    let h=q.slice(0,5).map(x=>`<div class="queue-row"><span class="queue-pos">${x.position}</span><div><strong>${esc(x.title)}</strong><span>${esc(x.requested_by?('Demandé par '+x.requested_by):(x.album||''))}</span></div></div>`).join('');
    if(q.length>5)h+=`<div class="queue-more">+ ${q.length-5} autre${q.length-5>1?'s':''} demande${q.length-5>1?'s':''}</div>`;
    $('#liveQueue').innerHTML=h||'<div class="queue-empty">File vide : lecture automatique dans le même album, puis le même style.</div>';updateLiveMode();updateButtons();
  }catch(e){renderLiveOffline('Le relay ne répond pas actuellement.')}
}
function surprise(){
  let pool=allTracks;if(view.level==='albums'&&view.category)pool=allTracks.filter(t=>(t.category||'À classer')===view.category);if(view.level==='tracks'&&view.album)pool=tracksFor(view.category,view.album);
  if(!pool.length)return toast('Aucun morceau disponible.',true);
  const t=pool[Math.floor(Math.random()*pool.length)];setView('tracks',t.category||'À classer',t.album||'Sans album');
  setTimeout(()=>document.querySelector(`.request[data-id="${t.id}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}),150);
}
async function load(){
  $('#viewerName').value=localStorage.getItem('ltcMusicViewer')||'';
  try{const r=await fetch('catalog.json',{cache:'no-store'});if(!r.ok)throw 0;allTracks=await r.json();allTracks=allTracks.map(t=>({...t,category:t.category||'À classer',album:t.album||'Sans album',cover:t.cover||''}))}
  catch(e){$('#grid').innerHTML='<div class="empty">Le catalogue musical n’est pas encore publié.</div>';$('#count').textContent='Catalogue indisponible';return}
  render();loadLiveConfig();
}
$('#search').addEventListener('input',e=>{query=e.target.value;render()});
$('#randomBtn').addEventListener('click',surprise);
$('#viewerName').addEventListener('change',saveViewer);
load();