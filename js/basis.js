/* ============================================================
   VANDAAG / TODAY — gedeelde basis (rust, lichtstof, toast, opslag)
   ============================================================ */
"use strict";
/* >>> Pas hier je Ko-fi-adres aan (één plek voor de hele site): */
window.VANDAAG_KOFI = "https://ko-fi.com/kellievdk";
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
    document.querySelectorAll("[data-kofi]").forEach(a=>{ a.href = window.VANDAAG_KOFI; });
    document.querySelectorAll("[data-calm]").forEach(b=>{
      b.addEventListener("click", ()=>{ calm = !calm; store.set("calm", calm); applyCalm(); });
    });
    wireOverlays();
    applyCalm();
  }
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }

  return { store, saveItem, getItems, toast, openOverlay, closeOverlay, dust,
    isCalm(){ return calm; } };
})();
