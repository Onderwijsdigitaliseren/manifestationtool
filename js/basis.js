/* ============================================================
   Manifest — gedeelde basis (rust, lichtstof, toast, opslag)
   ============================================================ */
"use strict";
/* >>> Pas hier je Ko-fi-adres aan (één plek voor de hele site): */
window.Manifest_KOFI = "https://ko-fi.com/kellievdk";
window.V = (function(){

  /* ---------- veilige opslag: localStorage met geheugen-terugval ---------- */
  const mem = {};
  const store = {
    get(key, fallback){
      try{
        const raw = localStorage.getItem("vandaag:" + key);
        return raw === null ? (key in mem ? mem[key] : fallback) : JSON.parse(raw);
      }catch(e){ return key in mem ? mem[key] : fallback; }
    },
    set(key, value){
      mem[key] = value;
      try{ localStorage.setItem("vandaag:" + key, JSON.stringify(value)); }catch(e){}
    }
  };
  function saveItem(tag, text){
    const items = store.get("items", []);
    items.push({tag, text, time:new Date().toLocaleString((document.documentElement.lang||"nl").indexOf("en")===0 ? "en-GB" : "nl-NL",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})});
    store.set("items", items);
  }
  function getItems(){ return store.get("items", []); }

  /* ---------- rust / verminderde beweging ---------- */
  const root = document.documentElement;
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  let calm = store.get("calm", null);
  if(calm === null) calm = mq.matches;
  function applyCalm(){
    root.classList.toggle("reduced", calm);
    document.querySelectorAll("[data-calm]").forEach(b=>b.setAttribute("aria-pressed", String(calm)));
    if(calm){ dust.stop(); } else { dust.start(); }
  }
  mq.addEventListener("change", e=>{ calm = e.matches; store.set("calm", calm); applyCalm(); });

  /* ---------- sterrenstof ---------- */
  const dust = (function(){
    let canvas = null, ctx = null, parts = [], raf = null, running = false;
    let W = 0, H = 0, dpr = 1, lastAmbient = 0;
    function ensure(){
      if(canvas) return true;
      canvas = document.getElementById("dust");
      if(!canvas) return false;
      ctx = canvas.getContext("2d");
      window.addEventListener("resize", resize);
      window.addEventListener("pointermove", e=>{ if(running) add(e.clientX, e.clientY); }, {passive:true});
      document.addEventListener("visibilitychange", ()=>{
        if(document.hidden){ if(running){ running = false; cancelAnimationFrame(raf); } }
        else if(!calm){ running = true; raf = requestAnimationFrame(tick); }
      });
      return true;
    }
    function resize(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W*dpr; canvas.height = H*dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    function add(x,y){
      if(parts.length > 110) parts.shift();
      parts.push({x:x+(Math.random()-0.5)*16, y:y+(Math.random()-0.5)*12,
        vx:(Math.random()-0.5)*0.3, vy:-(0.25+Math.random()*0.45),
        life:1, r:0.7+Math.random()*1.5});
    }
    function tick(t){
      if(!running) return;
      ctx.clearRect(0,0,W,H);
      if(t-lastAmbient > 900){
        lastAmbient = t;
        add(W*Math.random(), H*(0.6+Math.random()*0.4));
      }
      for(let i=parts.length-1;i>=0;i--){
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.011;
        if(p.life<=0){ parts.splice(i,1); continue; }
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle = "rgba("+(p.r>1.4?"226,140,120":"236,160,60")+","+(p.life*0.8).toFixed(3)+")";
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    return {
      start(){ if(running || !ensure()) return; running = true; resize(); raf = requestAnimationFrame(tick); },
      stop(){ running = false; if(raf) cancelAnimationFrame(raf); if(ctx) ctx.clearRect(0,0,W,H); },
      burst(x,y){ if(!ensure()) return; for(let i=0;i<14;i++) add(x,y); }
    };
  })();

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(msg){
    const el = document.getElementById("toast");
    if(!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>el.classList.remove("show"), 2400);
  }

  /* ---------- overlays ---------- */
  let lastFocused = null;
  function openOverlay(ov){
    lastFocused = document.activeElement;
    ov.hidden = false;
    const first = ov.querySelector("button, a");
    if(first) first.focus();
  }
  function closeOverlay(ov){
    ov.hidden = true;
    if(lastFocused && lastFocused.focus) lastFocused.focus();
  }
  function wireOverlays(){
    document.querySelectorAll(".overlay").forEach(ov=>{
      ov.addEventListener("click", e=>{ if(e.target === ov) closeOverlay(ov); });
      ov.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click", ()=>closeOverlay(ov)));
      ov.addEventListener("keydown", e=>{
        if(e.key !== "Tab") return;
        const f = Array.from(ov.querySelectorAll("button, a[href]")).filter(el=>el.offsetParent !== null);
        if(!f.length) return;
        const first = f[0], last = f[f.length-1];
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      });
    });
    document.addEventListener("keydown", e=>{
      if(e.key !== "Escape") return;
      const open = Array.from(document.querySelectorAll(".overlay")).find(ov=>!ov.hidden);
      if(open) closeOverlay(open);
    });
  }

  /* ---------- init per pagina ---------- */
  function init(){
    document.querySelectorAll("[data-kofi]").forEach(a=>{ a.href = window.Manifest_KOFI; });
    document.querySelectorAll("[data-calm]").forEach(b=>{
      b.addEventListener("click", ()=>{ calm = !calm; store.set("calm", calm); applyCalm(); });
    });
    wireOverlays();
    applyCalm();
  }
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }

  /* ---------- moodboard-opslag (IndexedDB), gedeeld met kaartjes en back-up ---------- */
  const board = (function(){
    let db = null;
    function open(){
      return new Promise(res=>{
        if(db) return res(db);
        try{
          const r = indexedDB.open("vandaag-moodboard", 1);
          r.onupgradeneeded = ()=>{ r.result.createObjectStore("kv"); };
          r.onsuccess = ()=>{ db = r.result; res(db); };
          r.onerror = ()=>res(null);
        }catch(e){ res(null); }
      });
    }
    return {
      async get(){
        const d = await open(); if(!d) return null;
        return new Promise(res=>{
          try{ const q = d.transaction("kv","readonly").objectStore("kv").get("board"); q.onsuccess = ()=>res(q.result || null); q.onerror = ()=>res(null); }
          catch(e){ res(null); }
        });
      },
      async set(v){
        const d = await open(); if(!d) return false;
        return new Promise(res=>{
          try{ const tx = d.transaction("kv","readwrite"); tx.objectStore("kv").put(v,"board"); tx.oncomplete = ()=>res(true); tx.onerror = ()=>res(false); }
          catch(e){ res(false); }
        });
      },
      async add(item){
        const cur = (await this.get()) || {v:1, items:[]};
        if(!Array.isArray(cur.items)) cur.items = [];
        item.id = Math.random().toString(36).slice(2,9);
        if(item.x == null){ item.x = .3 + Math.random()*.4; item.y = .2 + Math.random()*.5; }
        if(item.rot == null) item.rot = Math.round((Math.random()-.5)*8);
        cur.items.push(item);
        return this.set(cur);
      }
    };
  })();

  /* ---------- back-up: alles van deze site in één bestand ---------- */
  async function exportAll(){
    const local = {};
    try{
      for(let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i);
        if(k && k.indexOf("vandaag:") === 0) local[k] = localStorage.getItem(k);
      }
    }catch(e){}
    return {app:"vandaag", v:1, made:new Date().toISOString(), local, board: await board.get()};
  }
  async function importAll(data){
    if(!data || data.app !== "vandaag") throw new Error("geen back-up");
    try{ Object.keys(data.local || {}).forEach(k=>{ if(k.indexOf("vandaag:") === 0) localStorage.setItem(k, data.local[k]); }); }catch(e){}
    if(data.board && Array.isArray(data.board.items)) await board.set(data.board);
  }

  return { store, saveItem, getItems, toast, openOverlay, closeOverlay, dust, board, exportAll, importAll,
    isCalm(){ return calm; } };
})();
