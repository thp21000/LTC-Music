(() => {
  const FAVORITES_KEY = 'ltcMusicFavoritesV1';
  let favorites = new Set();

  function loadFavorites(){
    try{
      const raw=JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]');
      favorites=new Set(Array.isArray(raw)?raw.map(String):[]);
    }catch(e){
      favorites=new Set();
    }
  }
  function saveFavorites(){
    localStorage.setItem(FAVORITES_KEY,JSON.stringify([...favorites]));
  }
  function isFavorite(id){return favorites.has(String(id))}
  function favoriteTracks(){return allTracks.filter(t=>isFavorite(t.id))}
  function favoriteCount(){return favoriteTracks().length}

  function updateFavoriteButtons(){
    document.querySelectorAll('.favorite').forEach(b=>{
      const active=isFavorite(b.dataset.favId);
      b.classList.toggle('active',active);
      b.textContent=active?'♥':'♡';
      b.setAttribute('aria-pressed',active?'true':'false');
      b.setAttribute('aria-label',active?'Retirer des favoris':'Ajouter aux favoris');
      b.title=active?'Retirer des favoris':'Ajouter aux favoris';
    });
  }

  function toggleFavorite(id){
    const key=String(id);
    const removing=favorites.has(key);
    if(removing) favorites.delete(key); else favorites.add(key);
    saveFavorites();
    toast(removing?'Retiré des favoris.':'Ajouté aux favoris.');

    if(view.level==='favorites') render();
    else {
      updateFavoriteButtons();
      renderBreadcrumb();
    }
  }

  loadFavorites();

  const baseUrlForView=urlForView;
  urlForView=function(level,category=null,album=null){
    if(level!=='favorites') return baseUrlForView(level,category,album);
    const u=new URL(window.location.href);
    u.search='';
    u.searchParams.set('view','favorites');
    return u.pathname+'?'+u.searchParams.toString()+u.hash;
  };

  const baseViewFromUrl=viewFromUrl;
  viewFromUrl=function(){
    const u=new URL(window.location.href);
    if(u.searchParams.get('view')==='favorites') return {level:'favorites',category:null,album:null};
    return baseViewFromUrl();
  };

  renderBreadcrumb=function(){
    const b=$('#breadcrumb');
    const favs=favoriteCount();
    let h=`<button class="crumb ${view.level==='categories'?'active':''}" data-l="categories">Genres</button>`;
    h+=`<span class="nav-separator">•</span><button class="crumb favorites-crumb ${view.level==='favorites'?'active':''}" data-l="favorites"><span class="heart-nav">♥</span> Favoris <span class="favorite-count">${favs}</span></button>`;

    if(view.level!=='favorites'&&view.category){
      const first=allTracks.find(t=>originalCategory(t)===view.category);
      h+=`<span>›</span><button class="crumb ${view.level==='albums'?'active':''}" data-l="albums">${esc(first?frCategory(first):view.category)}</button>`;
    }
    if(view.level!=='favorites'&&view.album){
      const first=tracksFor(view.category,view.album)[0];
      h+=`<span>›</span><span class="crumb active">${esc(first?frAlbum(first):view.album)}</span>`;
    }

    b.innerHTML=h;
    b.querySelector('[data-l="categories"]')?.addEventListener('click',()=>setView('categories'));
    b.querySelector('[data-l="favorites"]')?.addEventListener('click',()=>setView('favorites'));
    b.querySelector('[data-l="albums"]')?.addEventListener('click',()=>setView('albums',view.category));
  };

  const baseRenderContext=renderContext;
  renderContext=function(){
    if(view.level==='favorites'){
      const c=$('#contextHeader');
      c.hidden=true;
      c.innerHTML='';
      return;
    }
    return baseRenderContext();
  };

  const baseTrackCard=trackCard;
  trackCard=function(t){
    let html=baseTrackCard(t);
    const active=isFavorite(t.id);
    const fav=`<div class="track-actions"><button class="favorite${active?' active':''}" data-fav-id="${t.id}" type="button" aria-pressed="${active?'true':'false'}" aria-label="${active?'Retirer des favoris':'Ajouter aux favoris'}" title="${active?'Retirer des favoris':'Ajouter aux favoris'}">${active?'♥':'♡'}</button>`;
    html=html.replace('<button class="request"',fav+'<button class="request"');
    html=html.replace('</button></article>','</button></div></article>');
    return html;
  };

  const baseBindTrackButtons=bindTrackButtons;
  bindTrackButtons=function(){
    baseBindTrackButtons();
    document.querySelectorAll('.favorite').forEach(b=>{
      b.addEventListener('click',e=>{
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(b.dataset.favId);
      });
    });
    updateFavoriteButtons();
  };

  function renderFavorites(){
    const tracks=favoriteTracks().sort((a,b)=>frTitle(a).localeCompare(frTitle(b),'fr',{numeric:true}));
    $('#count').textContent=`${tracks.length} favori${tracks.length>1?'s':''}`;
    $('#modehint').textContent='Mes morceaux favoris';
    $('#grid').innerHTML=tracks.length
      ?tracks.map(trackCard).join('')
      :`<div class="empty favorites-empty"><div class="empty-heart">♡</div><strong>Aucun favori pour le moment</strong><span>Clique sur le cœur d’un morceau pour le retrouver ici.</span><button class="btn" id="browseFromFavorites">Explorer les genres</button></div>`;
    bindTrackButtons();
    $('#browseFromFavorites')?.addEventListener('click',()=>setView('categories'));
  }

  const baseRenderSearch=renderSearch;
  renderSearch=function(){
    if(view.level!=='favorites') return baseRenderSearch();
    const allowed=new Set(favoriteTracks().map(t=>String(t.id)));
    const tracks=searchTracks(query).filter(t=>allowed.has(String(t.id)));
    $('#count').textContent=`${tracks.length} résultat${tracks.length>1?'s':''}`;
    $('#modehint').textContent='Recherche dans mes favoris';
    $('#grid').innerHTML=tracks.length?tracks.map(trackCard).join(''):'<div class="empty">Aucun favori ne correspond à cette recherche.</div>';
    bindTrackButtons();
  };

  const baseRender=render;
  render=function(){
    if(view.level==='favorites'&&!query.trim()){
      renderBreadcrumb();
      renderContext();
      return renderFavorites();
    }
    return baseRender();
  };

  const baseSurprise=surprise;
  function favoriteSurprise(){
    const pool=favoriteTracks();
    if(!pool.length) return toast('Ajoute d’abord quelques morceaux aux favoris.',true);
    const t=pool[Math.floor(Math.random()*pool.length)];
    setView('tracks',originalCategory(t),originalAlbum(t));
    setTimeout(()=>document.querySelector(`.request[data-id="${t.id}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}),150);
  }
  $('#randomBtn').removeEventListener('click',baseSurprise);
  surprise=function(){
    if(view.level==='favorites') return favoriteSurprise();
    return baseSurprise();
  };
  $('#randomBtn').addEventListener('click',surprise);
})();