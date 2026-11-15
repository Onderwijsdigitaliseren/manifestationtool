/* ============================================================
   De Wensjacht — motor
   Teksten: data/wensjacht.js · stijl: css/wensjacht.css
   Kaart: js/kaart/ (wandelmotor van Enigma Mystery: echte kaart via OpenFreeMap,
   anders een getekende plattegrond; gps met echte afstanden).
   Opslag: V.store "wensjacht" (voortgang, archief) en IndexedDB "vandaag-wensjacht" (foto's).
   Alles blijft op het apparaat.

   Testen: ?test achter het adres = geen gps nodig; tik op de kaart om erheen te "lopen".
   ============================================================ */
"use strict";
(function(){
  const D = window.JACHT, V = window.V, Wk = window.MW && window.MW.Walk;
  const U = D.UI || {}, t = x => U[x] != null ? U[x] : x;   /* vaste teksten; Engels in data/wensjacht-en.js */
  const LOC = D.LOC || "nl-NL", KEY = D.KEY || "wensjacht";
  const app = document.getElementById("jachtApp");
  const TEST = /[?&]test\b/.test(location.search);
  const WENS = {}; D.W.forEach(w => { WENS[w.id] = w; });

  /* ---------- opslag ---------- */
  let ST = V.store.get(KEY, null);
  if(!ST || ST.v !== 1) ST = {v:1, n:6, waar:"kaart", jacht:null, archief:[]};
  const save = () => V.store.set(KEY, ST);
  const FOTO = (function(){
    let db = null; const mem = {};
    function open(){
      return new Promise(res=>{
        if(db) return res(db);
        try{
          const r = indexedDB.open("vandaag-wensjacht", 1);
          r.onupgradeneeded = ()=>{ r.result.createObjectStore("kv"); };
          r.onsuccess = ()=>{ db = r.result; res(db); };
          r.onerror = ()=>res(null);
        }catch(e){ res(null); }
      });
    }
    return {
      async get(k){
        if(k in mem) return mem[k];
        const d = await open(); if(!d) return null;
        return new Promise(res=>{ try{ const q = d.transaction("kv","readonly").objectStore("kv").get(k); q.onsuccess = ()=>res(q.result || null); q.onerror = ()=>res(null); }catch(e){ res(null); } });
      },
      async set(k, v){ mem[k] = v; const d = await open(); if(!d) return; try{ d.transaction("kv","readwrite").objectStore("kv").put(v, k); }catch(e){} },
      async wis(id){
        Object.keys(mem).forEach(k => { if(k.indexOf(id + ":") === 0) delete mem[k]; });
        const d = await open(); if(!d) return;
        try{ const s = d.transaction("kv","readwrite").objectStore("kv"); const r = s.openCursor(); r.onsuccess = ()=>{ const c = r.result; if(!c) return; if(String(c.key).indexOf(id + ":") === 0) c.delete(); c.continue(); }; }catch(e){}
      }
    };
  })();

  /* ---------- hulpjes ---------- */
  function h(tag, attrs, kids){
    const e = document.createElement(tag);
    if(attrs) for(const k in attrs){
      const v = attrs[k];
      if(v == null || v === false) continue;
      if(k === "class") e.className = v;
      else if(k === "text") e.textContent = v;
      else if(k === "html") e.innerHTML = v;
      else if(k.indexOf("on") === 0) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    (Array.isArray(kids) ? kids : kids != null ? [kids] : []).forEach(c=>{
      if(c == null || c === false) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }
  const kies = a => a[Math.floor(Math.random() * a.length)];
  const datum = iso => { try{ return new Date(iso).toLocaleDateString(LOC, {day:"numeric", month:"long", year:"numeric"}); }catch(e){ return ""; } };
  const icoon = (w, cls) => h("span", {class:"j-ic " + (cls || ""), style:"--k:" + w.kleur, "aria-hidden":"true",
    html:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="' + w.ic + '"/></svg>'});
  const IMG = D.IMG || "../assets/wensjacht/";
  /* beeld van een wens; lukt het laden niet, dan het gekleurde pictogram */
  function wensBeeld(w, cls){
    const im = h("img", {class:"j-wb " + (cls || ""), src:IMG + "wens-" + w.id + ".webp", alt:"", loading:"lazy", style:"--k:" + w.kleur});
    im.addEventListener("error", ()=>{ im.replaceWith(icoon(w, cls)); });
    return im;
  }
  function sfeer(naam, cls){
    const im = h("img", {class:"j-sfeer " + (cls || ""), src:IMG + naam + ".webp", alt:"", loading:"lazy"});
    im.addEventListener("error", ()=>im.remove());
    return im;
  }
  function zeker(btn, vraag, doe){
    if(btn.classList.contains("armed")){ doe(); return; }
    const oud = btn.textContent; btn.textContent = vraag; btn.classList.add("armed");
    setTimeout(()=>{ if(btn.isConnected){ btn.textContent = oud; btn.classList.remove("armed"); } }, 5000);
  }
  function buzz(p){ try{ if(navigator.vibrate) navigator.vibrate(p || [80, 60, 80]); }catch(e){} }
  let wake = null;
  function lock(){ try{ if(navigator.wakeLock) navigator.wakeLock.request("screen").then(w=>{ wake = w; }).catch(()=>{}); }catch(e){} }
  function release(){ try{ if(wake) wake.release(); }catch(e){} wake = null; }
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden && kaartAan) lock(); });

  /* de kaartlaag gebruikt hetzelfde #toast-element: houd het zichtbaar via de toast van de site */
  (function(){
    const te = document.getElementById("toast"); if(!te || !window.MutationObserver) return;
    new MutationObserver(()=>{
      if(te.hidden) te.hidden = false;
      if(te.textContent && !te.classList.contains("show")) V.toast(te.textContent);
    }).observe(te, {attributes:true, attributeFilter:["hidden"], childList:true, characterData:true, subtree:true});
  })();

  let kaartAan = false;
  function scherm(vol, kids){
    kaartAan = false; if(Wk) Wk.stopWatch(); release();
    document.body.classList.toggle("in-jacht", !!vol);
    document.body.classList.remove("op-kaart");
    app.textContent = "";
    kids.forEach(k => k && app.appendChild(k));
    window.scrollTo(0, 0);
    const kop = app.querySelector("h1");
    if(kop){ kop.setAttribute("tabindex", "-1"); kop.focus({preventScroll:true}); }
  }
  function seg(naam, opties, huidig, zet){
    const box = h("div", {class:"j-seg", role:"group", "aria-label":naam});
    opties.forEach(o=>{
      box.appendChild(h("button", {type:"button", "aria-pressed":String(o[0] === huidig()), onclick:()=>{
        zet(o[0]); save();
        box.querySelectorAll("button").forEach((b, i)=>b.setAttribute("aria-pressed", String(opties[i][0] === huidig())));
      }}, [h("b", {text:o[1]}), o[2] ? h("small", {text:o[2]}) : null]));
    });
    return box;
  }

  /* ---------- foto maken en verkleinen ---------- */
  function verklein(file){
    return new Promise((res, rej)=>{
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = ()=>{
        const m = 1280, s = Math.min(1, m / Math.max(im.width, im.height));
        const c = document.createElement("canvas"); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", .85));
      };
      im.onerror = ()=>{ URL.revokeObjectURL(url); rej(new Error("foto")); };
      im.src = url;
    });
  }
  function fotoKnop(tekst, cls, klaar){
    const inp = h("input", {type:"file", accept:"image/*", capture:"environment", class:"j-file"});
    inp.addEventListener("change", async ()=>{
      const f = inp.files && inp.files[0]; if(!f) return;
      try{ klaar(await verklein(f)); }catch(e){ V.toast(t("Die foto lukte niet. Probeer het nog eens.")); }
      inp.value = "";
    });
    return h("label", {class:cls}, [inp, h("span", {text:tekst})]);
  }

  /* ============================================================
     Begin
     ============================================================ */
  function thuis(){
    const J = ST.jacht;
    const lengte = seg(t("Lengte"), D.LENGTE.map(l => [l.n, l.naam, l.n + t(" wensen · ") + l.tijd]), ()=>ST.n, v=>{ ST.n = v; });
    const waar = seg(t("Waar"), D.WAAR.map(w => [w.id, w.naam, w.uit]), ()=>ST.waar, v=>{ ST.waar = v; });
    waar.classList.add("breed");
    const arch = h("div", {class:"j-archief"});
    if(ST.archief.length){
      arch.appendChild(h("p", {class:"eyebrow", text:t("Mijn borden")}));
      const rij = h("div", {class:"j-borden"});
      ST.archief.forEach(a=>{
        const im = h("img", {alt:t("Visiebord van ") + datum(a.datum), loading:"lazy"});
        FOTO.get(a.id + ":bord").then(src => { if(src) im.src = src; });
        rij.appendChild(h("button", {class:"j-bordje", onclick:()=>bord(a)}, [im, h("span", {text:datum(a.datum)})]));
      });
      arch.appendChild(rij);
    }
    scherm(false, [
      h("header", {class:"page-head"}, [
        h("p", {class:"eyebrow", text:D.T.eyebrow}),
        h("h1", {text:D.T.titel}),
        h("p", {class:"j-onder", text:D.T.onder}),
        h("p", {text:D.T.pitch})
      ]),
      h("div", {class:"j-thuis"}, [
        sfeer("hero", "hero"),
        J ? h("div", {class:"j-kaartje verder"}, [
          h("p", {class:"eyebrow", text:t("Je bent nog op jacht")}),
          h("p", {class:"j-groot", text:J.fase === "zet" ? t("Alle wensen binnen. Nog één zet.") : t("Wens ") + (J.i + 1) + t(" van ") + J.n + ": " + WENS[J.w[J.i].c].naam}),
          h("div", {class:"j-knoppen links"}, [
            h("button", {class:"btn-gold", text:t("Verder met mijn jacht"), onclick:hervat}),
            h("button", {class:"linkish", text:t("Jacht afbreken"), onclick:function(){ zeker(this, t("Tik nog eens: deze jacht en de foto's verdwijnen."), ()=>{ FOTO.wis(J.id); ST.jacht = null; save(); thuis(); }); }})
          ])
        ]) : null,
        h("ul", {class:"j-regels"}, D.T.regels.map(r => h("li", {text:r}))),
        J ? null : h("div", {class:"j-kaartje"}, [
          h("p", {class:"eyebrow", text:t("Hoe groot wordt je jacht?")}), lengte,
          h("p", {class:"eyebrow", text:t("Waar jaag je?")}), waar,
          h("div", {class:"j-knoppen"}, [h("button", {class:"btn-gold", text:D.T.start, onclick:kiesScherm})]),
          h("p", {class:"soft j-klein midden", text:t("Je foto's en wensen blijven op dit apparaat. Er wordt niets verstuurd.")})
        ]),
        arch
      ])
    ]);
  }

  /* ============================================================
     Wensen kiezen
     ============================================================ */
  function kiesScherm(){
    const n = ST.n; let gekozen = [];
    const teller = h("p", {class:"j-teller", role:"status"});
    const go = h("button", {class:"btn-gold", text:D.T.open, disabled:true, onclick:()=>start(gekozen)});
    const grid = h("div", {class:"j-wensen"});
    function ververs(){
      grid.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(gekozen.indexOf(b.dataset.id) >= 0)));
      teller.textContent = gekozen.length + t(" van ") + n + t(" gekozen");
      go.disabled = gekozen.length !== n;
    }
    D.W.forEach(w=>{
      grid.appendChild(h("button", {class:"j-wens", type:"button", "data-id":w.id, "aria-pressed":"false", style:"--k:" + w.kleur, onclick:()=>{
        const i = gekozen.indexOf(w.id);
        if(i >= 0) gekozen.splice(i, 1);
        else { if(gekozen.length >= n){ V.toast(t("Je mand zit vol. Haal er eerst één uit, of kies een grotere jacht.")); return; } gekozen.push(w.id); }
        ververs();
      }}, [wensBeeld(w, "kaart"), h("b", {text:w.naam}), h("small", {text:w.kort})]));
    });
    scherm(true, [
      h("div", {class:"j-balk"}, [h("button", {class:"linkish", text:t("← Terug"), onclick:thuis})]),
      h("article", {class:"j-blad"}, [
        h("p", {class:"eyebrow", text:t("De catalogus")}),
        h("h1", {text:D.T.kiesKop}),
        h("p", {text:D.T.kiesUit(n)}),
        grid,
        h("div", {class:"j-onderbalk"}, [teller,
          h("button", {class:"btn-line", text:D.T.verras, onclick:()=>{ gekozen = D.W.map(w=>w.id).sort(()=>Math.random() - .5).slice(0, n); ververs(); }}), go])
      ])
    ]);
    ververs();
  }
  function start(ids){
    const volg = D.W.map(w=>w.id).filter(id => ids.indexOf(id) >= 0);
    ST.jacht = {id:Date.now().toString(36), datum:new Date().toISOString(), n:volg.length, waar:ST.waar, i:0, fase:"weg", tekens:0, world:null, zet:null,
      w:volg.map(c => ({c:c, groot:"", op:0, weg:Math.floor(Math.random() * WENS[c].weg.length), foto:null}))};
    save(); hervat();
  }
  function hervat(){
    const J = ST.jacht; if(!J) return thuis();
    if(J.fase === "punt") return puntScherm();
    if(J.fase === "zet") return zetScherm();
    if(J.waar === "kaart") return kaartScherm();
    vrijScherm();
  }

  /* ---------- menu tijdens de jacht ---------- */
  function balk(J, extra){
    const kids = [h("button", {class:"linkish", text:t("← Stoppen voor nu"), onclick:thuis}),
      h("span", {class:"j-stand", text:J.fase === "zet" ? t("Laatste stap") : t("Wens ") + (J.i + 1) + t(" van ") + J.n})];
    if(extra) kids.push(extra);
    return h("div", {class:"j-balk"}, kids);
  }
  function tekenKnop(J, cls){
    if(J.tekens >= 4) return null;
    return fotoKnop(D.T.teken, cls || "btn-line j-fotoknop", async src=>{
      await FOTO.set(J.id + ":t" + J.tekens, src); J.tekens++; save(); buzz([40]); V.toast(kies(D.T.tekenQ));
    });
  }
  function wegBlok(J){
    const x = J.w[J.i], w = WENS[x.c];
    return h("div", {class:"j-weg"}, [
      h("div", {class:"j-wegkop"}, [wensBeeld(w, "rond"), h("div", null, [h("small", {text:t("Op weg naar")}), h("b", {text:w.naam})])]),
      h("p", {class:"j-opdracht", text:w.weg[x.weg % w.weg.length]})
    ]);
  }

  /* ============================================================
     Onderweg zonder kaart
     ============================================================ */
  function vrijScherm(){
    const J = ST.jacht;
    scherm(true, [
      balk(J),
      h("article", {class:"j-blad"}, [
        h("p", {class:"eyebrow", text:t("Onderweg")}),
        h("h1", {text:t("Op naar de volgende")}),
        sfeer("onderweg"),
        h("p", {text:J.waar === "thuis" ? D.T.thuisLoop : D.T.vrijLoop}),
        wegBlok(J),
        h("div", {class:"j-knoppen"}, [
          h("button", {class:"btn-gold", text:t("Hier is het"), onclick:aankomst}),
          tekenKnop(J)
        ]),
        h("p", {class:"soft j-klein midden", text:D.T.tekenUit})
      ])
    ]);
  }

  /* ============================================================
     Onderweg met plattegrond
     ============================================================ */
  let map = null, WAYS = [], P = {x:0, y:0}, origin = null, lus = false, kaartCv = null;
  const THEMA = {bg:"#F6EBD7", water:"#BFDCE6", waterEdge:"#8DBBCB", ripple:"rgba(255,255,255,.5)", park:"#CFE2BE", parkEdge:"#A9C894", river:"#BFDCE6",
    major:"#E9B872", minor:"#EADFC8", road:"#FFFFFF", label:"#8A6A4A", waterLabel:"#4F8AA6", ring:"rgba(0,0,0,0)",
    me:"#C2495B", meHalo:"rgba(194,73,91,.14)", meRing:"rgba(194,73,91,.5)", font:"600 12px Jost,system-ui,sans-serif"};
  function naarVrij(msg){
    const J = ST.jacht; J.waar = "vrij"; save(); if(msg) V.toast(msg); vrijScherm();
  }
  function maakPunten(sx, sy, w, n){
    const nodes = [];
    WAYS.forEach(v=>{ if(typeof v.w !== "number" || v.w === 9) return; for(let j = 0; j < v.p.length; j += 2) nodes.push([v.p[j], v.p[j+1], v.n || ""]); });
    let best = null;
    for(let i = 0; i < 8; i++){
      const a = i * .785 + .3, cx = sx + w.r * Math.cos(a), cy = sy + w.r * Math.sin(a); let cost = 0; const pts = [];
      for(let k = 1; k < n; k++){
        const th = a + Math.PI + k * 6.283 / n, q = {x:cx + w.r * Math.cos(th), y:cy + w.r * Math.sin(th), name:""}; let bd = 160, b = null;
        for(let j = 0; j < nodes.length; j++){ const d = Math.hypot(nodes[j][0] - q.x, nodes[j][1] - q.y); if(d < bd){ bd = d; b = nodes[j]; } }
        if(b){ q.x = b[0]; q.y = b[1]; q.name = b[2]; cost += bd; } else cost += nodes.length ? 400 : 0;
        q.x = Math.round(q.x); q.y = Math.round(q.y); pts.push(q);
      }
      pts.push({x:Math.round(sx), y:Math.round(sy), name:t("waar je begon")});
      if(!best || cost < best.cost) best = {cost:cost, pts:pts};
    }
    return best.pts;
  }
  function volgend(){ const J = ST.jacht; return J && J.world && J.world.pts ? J.world.pts[J.i] : null; }
  function items(){
    const J = ST.jacht, out = []; if(!J || !J.world || !J.world.pts) return out;
    J.world.pts.forEach((p, i)=>{
      const w = WENS[J.w[i].c], klaar = i < J.i, nu = i === J.i;
      out.push({x:p.x, y:p.y, tap:false, draw:function(c, X, Y, t){
        if(klaar){ c.fillStyle = "rgba(154,90,34,.35)"; c.beginPath(); c.arc(X, Y, 6, 0, 7); c.fill(); return; }
        if(nu){ const pu = 8 + 5 * Math.sin(t / 380); c.strokeStyle = "rgba(200,132,47,.55)"; c.lineWidth = 2.5; c.beginPath(); c.arc(X, Y, 20 + pu, 0, 7); c.stroke(); }
        c.fillStyle = nu ? w.kleur : "#FFF9F0"; c.strokeStyle = nu ? "#FFF9F0" : w.kleur; c.lineWidth = 2.5;
        c.beginPath(); c.arc(X, Y, nu ? 17 : 12, 0, 7); c.fill(); c.stroke();
        c.fillStyle = nu ? "#FFF9F0" : w.kleur; c.font = "700 " + (nu ? 16 : 12) + "px Jost,system-ui,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(String(i + 1), X, Y + 1); c.textBaseline = "alphabetic";
      }});
    });
    return out;
  }
  function kaartScherm(){
    const J = ST.jacht;
    if(!Wk) return naarVrij(t("De plattegrond kon niet laden. Je gaat verder op eigen route."));
    const info = h("div", {id:"jInfo", role:"status", text:t("Plattegrond laden…")});
    const cv = h("canvas", {id:"jMap", "aria-label":t("Plattegrond met je volgende wens")});
    const erBtn = h("button", {class:"btn-gold", text:t("Ik ben er"), onclick:aankomst});
    scherm(true, [
      balk(J, h("details", {class:"j-meer"}, [h("summary", {text:t("Meer")}), h("div", null, [
        h("button", {class:"linkish", text:t("Verder zonder plattegrond"), onclick:()=>naarVrij()}),
        h("button", {class:"linkish", text:t("Nieuwe punten vanaf waar ik sta"), onclick:()=>{ J.world = null; save(); kaartScherm(); }})
      ])])),
      h("div", {class:"j-map"}, [cv,
        h("div", {id:"zoom"}, [
          h("button", {type:"button", id:"zIn", "aria-label":t("Inzoomen"), text:"+", onclick:()=>{ if(map){ map.V.auto = false; map.zoom(1.4); } }}),
          h("button", {type:"button", id:"zOut", "aria-label":t("Uitzoomen"), text:"−", onclick:()=>{ if(map){ map.V.auto = false; map.zoom(1 / 1.4); } }}),
          h("button", {type:"button", id:"zMe", "aria-label":t("Naar mijn plek"), text:"◎", onclick:()=>{ if(map){ map.V.auto = true; map.follow(); } }})
        ]), info]),
      h("div", {class:"j-paneel"}, [wegBlok(J),
        h("div", {class:"j-knoppen"}, [erBtn, tekenKnop(J)]),
        TEST ? h("p", {class:"soft j-klein midden", text:t("Testmodus: tik op de kaart om erheen te lopen.")}) : null])
    ]);
    document.body.classList.add("op-kaart");
    kaartAan = true; kaartCv = cv; lock();

    function tik(){
      const n = volgend(); if(!n || !kaartAan) return;
      const d = Math.hypot(n.x - P.x, n.y - P.y);
      const ver = d >= 1000 ? (d / 1000).toLocaleString(LOC, {maximumFractionDigits:1}) + " km" : Math.round(d / 10) * 10 + " m";
      info.textContent = (n.name ? n.name + " · " : "") + ver;
      if(d < 30 && ST.jacht && ST.jacht.fase === "weg"){ V.toast(t("Je bent er.")); aankomst(); }
    }
    function klaar(res){
      if(!kaartAan || ST.jacht !== J) return;
      const w = J.world; origin = res.origin; WAYS = res.ways || [];
      const sx = (w.slon - origin.lon) * origin.kx, sy = -(w.slat - origin.lat) * origin.ky;
      if(w.px != null){ P.x = w.px; P.y = w.py; } else { P.x = sx; P.y = sy; }
      if(!w.pts){ w.pts = maakPunten(sx, sy, w, J.n); save(); }
      if(res.later) res.later.then(ws => { if(ws && ws.length) WAYS = ws; }).catch(()=>{});
      map = Wk.createMap(cv, {player:()=>P, ways:()=>WAYS, R:()=>w.R, items:items, theme:THEMA,
        move:{points:()=>J.world.pts, can:p=>J.world.pts.indexOf(p) >= J.i, target:volgend,
          done:(p, info)=>{ p.name = info.name || ""; save(); map.V.auto = true; map.follow(); tik(); }},
        onTap:(hit, pos)=>{ if(TEST){ P.x = pos.x; P.y = pos.y; w.px = P.x; w.py = P.y; save(); tik(); } else { map.V.auto = true; map.follow(); } }});
      map.V.auto = true;
      if(!lus){ lus = true; requestAnimationFrame(function loop(t){
        if(kaartAan && map && kaartCv && kaartCv.isConnected && map.cx.canvas === kaartCv){
          const n = volgend(), sz = map.size();
          if(map.V.follow && map.V.auto){ const d = n ? Math.hypot(n.x - P.x, n.y - P.y) : 150; map.V.s = Math.max(.08, Math.min(2.2, Math.min(sz[0], sz[1]) / (2.6 * Math.max(d, 70)))); }
          map.draw(t);
        }
        requestAnimationFrame(loop); }); }
      if(!TEST) Wk.watch(origin, P, ()=>{ w.px = Math.round(P.x); w.py = Math.round(P.y); tik(); });
      tik();
    }
    function laad(){
      const w = J.world;
      Wk.fetchWorld({lat:w.lat, lon:w.lon, R:w.R}).then(klaar).catch(()=>naarVrij(t("De plattegrond kon niet laden. Je gaat verder op eigen route.")));
    }
    if(J.world) return laad();
    const plek = TEST ? Promise.resolve({coords:{latitude:52.0907, longitude:5.1214}}) : Wk.locate();
    plek.then(pos=>{
      if(!kaartAan || ST.jacht !== J) return;
      const la = pos.coords.latitude, lo = pos.coords.longitude;
      const m = (D.LENGTE.filter(l => l.n === J.n)[0] || D.LENGTE[1]).m, r = Math.max(90, Math.min(480, m / (1.3 * 6.283)));
      J.world = {slat:la, slon:lo, lat:la, lon:lo, r:r, R:Math.max(300, 2 * r + 120), pts:null}; save(); laad();
    }, ()=>naarVrij(t("Geen gps gevonden. Je gaat verder op eigen route.")));
  }
  function aankomst(){
    const J = ST.jacht; if(!J || J.fase !== "weg") return;
    J.fase = "punt"; save(); buzz(); puntScherm();
  }

  /* ============================================================
     Op het punt: maak hem groot, en dan de jacht
     ============================================================ */
  function puntScherm(){
    const J = ST.jacht, x = J.w[J.i], w = WENS[x.c], laatste = J.i === J.n - 1;
    const lijst = J.waar === "thuis" ? w.binnen : w.buiten.concat(w.binnen.slice(0, 1));
    let duw = 0;
    const veld = h("input", {class:"j-in", type:"text", maxlength:"90", placeholder:w.ph, "aria-label":w.vraag, value:x.groot || "", inputmode:w.nul ? "decimal" : "text",
      oninput:function(){ x.groot = this.value; save(); }});
    const duwUit = h("p", {class:"j-quip", role:"status"});
    const groter = h("button", {class:"btn-line", type:"button", text:w.nul ? t("Nul erbij") : t("Groter"), onclick:()=>{
      if(w.nul){
        let c = (veld.value.match(/\d/g) || []).join("");
        if(!c) c = "1000"; else if(c.length >= 15){ duwUit.textContent = t("Het universum moet even bijprinten. Dit is voorlopig genoeg."); return; } else c += "0";
        veld.value = (LOC === "nl-NL" ? "€ " : "€") + c.replace(/\B(?=(\d{3})+(?!\d))/g, LOC === "nl-NL" ? "." : ","); x.groot = veld.value; save();
      }
      duwUit.textContent = w.groter[duw % w.groter.length]; duw++;
      if(!w.nul) veld.focus();
    }});
    const opdracht = h("p", {class:"j-opdracht groot", text:lijst[x.op % lijst.length]});
    const beeld = h("div", {class:"j-foto"});
    const na = h("div", {class:"j-na"});
    function naFoto(quip){
      na.textContent = "";
      na.appendChild(h("p", {class:"j-quip groot", role:"status", text:quip}));
      na.appendChild(h("div", {class:"j-knoppen"}, [h("button", {class:"btn-gold", text:laatste ? t("Naar de eerste zet") : t("Op naar wens ") + (J.i + 2), onclick:verder})]));
    }
    async function toonFoto(){
      beeld.textContent = "";
      if(x.foto === "f"){ const src = await FOTO.get(J.id + ":" + J.i); if(src) beeld.appendChild(h("img", {src:src, alt:t("Jouw foto bij ") + w.naam})); }
    }
    const maak = fotoKnop(x.foto === "f" ? t("Andere foto") : t("Maak de foto"), "btn-gold j-fotoknop", async src=>{
      await FOTO.set(J.id + ":" + J.i, src); const eerste = x.foto !== "f"; x.foto = "f"; save(); buzz([40]);
      maak.querySelector("span").textContent = t("Andere foto"); await toonFoto();
      if(eerste || !na.firstChild) naFoto(kies(D.T.binnenQ));
    });
    function verder(){
      x.groot = veld.value.trim(); if(!x.foto) x.foto = "g";
      if(laatste){ J.fase = "zet"; } else { J.i++; J.fase = "weg"; }
      save(); hervat();
    }
    scherm(true, [
      balk(J),
      h("article", {class:"j-blad punt", style:"--k:" + w.kleur}, [
        wensBeeld(w, "banner"),
        h("div", {class:"j-puntkop"}, [icoon(w, "xl"), h("div", null, [h("p", {class:"eyebrow", text:t("Wens ") + (J.i + 1) + t(" van ") + J.n}), h("h1", {text:w.naam})])]),
        h("p", {class:"j-intro", text:w.intro}),
        h("section", {class:"j-stap"}, [
          h("p", {class:"eyebrow", text:t("1 · Maak hem groot")}),
          h("p", {class:"j-vraag", text:w.vraag}),
          h("div", {class:"j-rij"}, [veld, groter]), duwUit
        ]),
        h("section", {class:"j-stap"}, [
          h("p", {class:"eyebrow", text:t("2 · De jacht")}),
          opdracht, beeld,
          h("div", {class:"j-knoppen links"}, [maak,
            h("button", {class:"linkish", text:t("Andere opdracht"), onclick:()=>{ x.op++; save(); opdracht.textContent = lijst[x.op % lijst.length]; }}),
            h("button", {class:"linkish", text:t("Geen foto, wel gezien"), onclick:()=>{ if(x.foto !== "f") x.foto = "g"; save(); naFoto(x.foto === "f" ? kies(D.T.binnenQ) : D.T.gezienQ); }})
          ]),
          na
        ])
      ])
    ]);
    toonFoto().then(()=>{ if(x.foto) naFoto(x.foto === "f" ? kies(D.T.binnenQ) : D.T.gezienQ); });
  }

  /* ============================================================
     De eerste zet
     ============================================================ */
  function zetScherm(){
    const J = ST.jacht; let wi = J.zet ? J.zet.w : 0, actie = J.zet ? J.zet.a : "";
    const wensBox = h("div", {class:"j-chips"}), actBox = h("div", {class:"j-chips kolom"});
    const eigen = h("input", {class:"j-in", type:"text", maxlength:"110", placeholder:t("Of je eigen zet…"), "aria-label":t("Je eigen eerste zet"), oninput:function(){ actie = this.value; teken(); }});
    function teken(){
      wensBox.textContent = ""; actBox.textContent = "";
      J.w.forEach((x, i)=>{ const w = WENS[x.c];
        wensBox.appendChild(h("button", {class:"j-chip", type:"button", "aria-pressed":String(i === wi), style:"--k:" + w.kleur, onclick:()=>{ wi = i; actie = ""; eigen.value = ""; teken(); }}, [icoon(w, "s"), h("span", {text:x.groot || w.naam})])); });
      WENS[J.w[wi].c].zet.forEach(z => actBox.appendChild(h("button", {class:"j-chip breed", type:"button", "aria-pressed":String(actie === z), onclick:()=>{ actie = actie === z ? "" : z; eigen.value = ""; teken(); }}, z)));
    }
    teken();
    const klaar = metZet => { J.zet = metZet && actie.trim() ? {w:wi, a:actie.trim()} : null; save(); rondAf(); };
    scherm(true, [
      balk(J),
      h("article", {class:"j-blad"}, [
        h("p", {class:"eyebrow", text:t("Alle wensen binnen")}),
        h("h1", {text:D.T.zetKop}),
        h("p", {text:D.T.zetUit}),
        h("section", {class:"j-stap"}, [h("p", {class:"eyebrow", text:t("Voor welke wens?")}), wensBox]),
        h("section", {class:"j-stap"}, [h("p", {class:"eyebrow", text:t("Wat ga je doen?")}), actBox, eigen]),
        h("div", {class:"j-knoppen"}, [
          h("button", {class:"btn-gold", text:t("Maak mijn visiebord"), onclick:()=>klaar(true)}),
          h("button", {class:"linkish", text:t("Zonder zet naar mijn bord"), onclick:()=>klaar(false)})
        ])
      ])
    ]);
  }
  async function rondAf(){
    const J = ST.jacht;
    const a = {id:J.id, datum:J.datum, n:J.n, tekens:J.tekens, zet:J.zet ? {c:J.w[J.zet.w].c, groot:J.w[J.zet.w].groot, a:J.zet.a} : null,
      w:J.w.map(x => ({c:x.c, groot:x.groot, foto:x.foto}))};
    scherm(true, [h("article", {class:"j-blad midden"}, [h("p", {class:"eyebrow", text:t("Even geduld")}), h("h1", {text:t("Je bord wordt ingelijst")})])]);
    try{ const cv = await tekenBord(a); await FOTO.set(a.id + ":bord", cv.toDataURL("image/jpeg", .9)); }catch(e){}
    ST.archief.unshift(a); ST.jacht = null; save();
    bord(a, true);
  }

  /* ============================================================
     Het visiebord
     ============================================================ */
  function laadBeeld(src){ return new Promise(res=>{ if(!src) return res(null); const im = new Image(); im.onload = ()=>res(im); im.onerror = ()=>res(null); im.src = src; }); }
  function regels(c, tekst, max, n){
    const woorden = String(tekst).split(/\s+/), out = []; let r = "";
    for(const wd of woorden){ const p = r ? r + " " + wd : wd; if(c.measureText(p).width <= max || !r) r = p; else { out.push(r); r = wd; } }
    if(r) out.push(r);
    if(out.length > n){ out.length = n; let l = out[n-1]; while(l.length > 3 && c.measureText(l + "…").width > max) l = l.slice(0, -1); out[n-1] = l.replace(/[ ,.;:]+$/, "") + "…"; }
    return out;
  }
  function rond(c, x, y, w, hh, r){ c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  async function tekenBord(a){
    try{ await Promise.all([document.fonts.load('600 60px "Cormorant"'), document.fonts.load('italic 600 60px "Cormorant"'), document.fonts.load('600 20px "Jost"')]); }catch(e){}
    const Wd = 1080, Ht = 1350, cv = document.createElement("canvas"); cv.width = Wd; cv.height = Ht; const c = cv.getContext("2d");
    const DISP = '"Cormorant", Georgia, serif', BODY = '"Jost", "Segoe UI", system-ui, sans-serif';
    const g = c.createLinearGradient(0, 0, 0, Ht); g.addColorStop(0, "#FBE3C4"); g.addColorStop(.45, "#FFF3E0"); g.addColorStop(1, "#F8D9C0"); c.fillStyle = g; c.fillRect(0, 0, Wd, Ht);
    const ach = await laadBeeld(IMG + "bord-achtergrond.webp");
    if(ach){ const s0 = Math.max(Wd / ach.width, Ht / ach.height); c.drawImage(ach, (Wd - ach.width * s0) / 2, (Ht - ach.height * s0) / 2, ach.width * s0, ach.height * s0); }
    const zon = c.createRadialGradient(880, 120, 10, 880, 120, 420); zon.addColorStop(0, "rgba(246,207,142,.95)"); zon.addColorStop(1, "rgba(246,207,142,0)"); c.fillStyle = zon; c.fillRect(0, 0, Wd, 620);
    c.textAlign = "center"; c.fillStyle = "#9A5A22"; c.font = "600 24px " + BODY;
    const kop = (t("De Wensjacht · ") + datum(a.datum)).toUpperCase(); try{ c.letterSpacing = "5px"; }catch(e){}
    c.fillText(kop, Wd / 2, 78); try{ c.letterSpacing = "0px"; }catch(e){}
    c.fillStyle = "#3A2320"; c.font = "italic 600 104px " + DISP; c.fillText(D.T.bordKop, Wd / 2, 178);

    const n = a.w.length, cols = n <= 4 ? 2 : 3, cellen = n === 8 ? 9 : n, rijen = Math.ceil(cellen / cols);
    const X0 = 56, Y0 = 232, AW = Wd - 2 * X0, AH = 1150 - Y0, gap = 26;
    const tw = (AW - gap * (cols - 1)) / cols, th = (AH - gap * (rijen - 1)) / rijen;
    const fotos = await Promise.all(a.w.map((x, i) => x.foto === "f" ? FOTO.get(a.id + ":" + i).then(laadBeeld) : laadBeeld(IMG + "wens-" + x.c + ".webp").then(im => im ? Object.assign(im, {wens:true}) : null)));
    for(let i = 0; i < cellen; i++){
      const cx = X0 + (i % cols) * (tw + gap) + tw / 2, cy = Y0 + Math.floor(i / cols) * (th + gap) + th / 2;
      const rot = ((i * 37) % 7 - 3) * .009;
      c.save(); c.translate(cx, cy); c.rotate(rot);
      c.shadowColor = "rgba(120,60,40,.35)"; c.shadowBlur = 26; c.shadowOffsetY = 12; c.fillStyle = "#FFFDF8"; rond(c, -tw / 2, -th / 2, tw, th, 10); c.fill();
      c.shadowColor = "transparent";
      if(i >= n){
        c.fillStyle = "#9A5A22"; c.font = "italic 600 46px " + DISP; c.fillText(t("Alles kan."), 0, -8); c.fillText(t("Alles mag."), 0, 44);
        c.restore(); continue;
      }
      const x = a.w[i], w = WENS[x.c], pad = 14, cap = cols === 2 ? Math.max(132, th * .28) : Math.max(92, th * .25), fw = tw - 2 * pad, fh = th - pad - cap, fx = -tw / 2 + pad, fy = -th / 2 + pad;
      c.save(); rond(c, fx, fy, fw, fh, 6); c.clip();
      const im = fotos[i];
      if(im){ const s = Math.max(fw / im.width, fh / im.height), dw = im.width * s, dh = im.height * s; c.drawImage(im, fx + (fw - dw) / 2, fy + (fh - dh) / 2, dw, dh); }
      else {
        const kg = c.createLinearGradient(fx, fy, fx + fw, fy + fh); kg.addColorStop(0, w.kleur); kg.addColorStop(1, "#F6CF8E"); c.fillStyle = kg; c.fillRect(fx, fy, fw, fh);
        const s = Math.min(fw, fh) * .5 / 24; c.save(); c.translate(fx + fw / 2 - 12 * s, fy + fh / 2 - 12 * s); c.scale(s, s);
        c.strokeStyle = "#FFFDF8"; c.lineWidth = 1.5; c.lineCap = "round"; c.lineJoin = "round"; try{ c.stroke(new Path2D(w.ic)); }catch(e){} c.restore();
      }
      c.restore();
      const ty = fy + fh; c.textAlign = "center";
      c.fillStyle = w.kleur; c.font = "600 " + (cols === 2 ? 17 : 15) + "px " + BODY; try{ c.letterSpacing = "2.500px"; }catch(e){}
      c.fillText(w.naam.toUpperCase(), 0, ty + 30); try{ c.letterSpacing = "0px"; }catch(e){}
      c.fillStyle = "#3A2320"; const fs = cols === 2 ? 36 : 28; c.font = "600 " + fs + "px " + DISP;
      const rs = regels(c, x.groot || w.kort, tw - 2 * pad - 8, cap > 110 ? 2 : 1);
      rs.forEach((r, k) => c.fillText(r, 0, ty + 30 + fs * (k + 1) * 1.02 + 4));
      c.restore();
    }
    /* voet: tekens, eerste zet, stempel */
    const tk = await Promise.all(Array.from({length:a.tekens || 0}, (_, k) => FOTO.get(a.id + ":t" + k).then(laadBeeld)));
    let tx = 70; const tyc = 1250;
    tk.forEach(im=>{ if(!im) return; c.save(); c.beginPath(); c.arc(tx + 48, tyc, 48, 0, 7); c.closePath(); c.fillStyle = "#FFFDF8"; c.shadowColor = "rgba(120,60,40,.3)"; c.shadowBlur = 12; c.fill(); c.shadowColor = "transparent"; c.beginPath(); c.arc(tx + 48, tyc, 43, 0, 7); c.clip();
      const s = Math.max(86 / im.width, 86 / im.height); c.drawImage(im, tx + 48 - im.width * s / 2, tyc - im.height * s / 2, im.width * s, im.height * s); c.restore(); tx += 84; });
    const links = tx + (tk.length ? 30 : 0), breed = Wd - links - 230;
    c.textAlign = "left";
    if(a.zet){
      c.fillStyle = "#9A5A22"; c.font = "600 19px " + BODY; try{ c.letterSpacing = "3px"; }catch(e){} c.fillText(t("MIJN EERSTE ZET"), links, 1218); try{ c.letterSpacing = "0px"; }catch(e){}
      c.fillStyle = "#3A2320"; c.font = "600 32px " + DISP; regels(c, a.zet.a, breed, 2).forEach((r, k) => c.fillText(r, links, 1258 + k * 36));
    } else { c.fillStyle = "#3A2320"; c.font = "italic 600 38px " + DISP; c.fillText(D.T.slot, links, 1258); }
    c.save(); c.translate(Wd - 122, 1240); c.rotate(-.16); c.strokeStyle = "#C2495B"; c.fillStyle = "#C2495B"; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 84, 0, 7); c.stroke(); c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 74, 0, 7); c.stroke();
    c.textAlign = "center"; c.font = "700 30px " + BODY; c.fillText(t("BESTELD"), 0, 6); c.font = "600 11.500px " + BODY; c.fillText(t("BIJ HET UNIVERSUM"), 0, 28); c.font = "600 14px " + BODY; c.fillText("★ ★ ★", 0, -30); c.restore();
    c.textAlign = "center"; c.fillStyle = "rgba(74,47,42,.55)"; c.font = "500 17px " + BODY; c.fillText("manifestationtool.nl", Wd / 2, Ht - 18);
    return cv;
  }

  function bord(a, vers){
    const im = h("img", {class:"j-bord", alt:t("Je visiebord van ") + datum(a.datum)});
    let cvP = null;
    const maak = ()=>{ cvP = cvP || tekenBord(a); return cvP; };
    FOTO.get(a.id + ":bord").then(src=>{ if(src) im.src = src; else maak().then(cv => { im.src = cv.toDataURL("image/jpeg", .9); }); });
    const naam = (D.BESTAND || "wensjacht") + "-" + a.datum.slice(0, 10) + ".png";
    async function blob(){ const cv = await maak(); return new Promise(res => cv.toBlob(res, "image/png")); }
    const kanDelen = !!(navigator.share && navigator.canShare);
    scherm(false, [
      h("header", {class:"page-head"}, [
        h("p", {class:"eyebrow", text:vers ? D.T.slot : t("De Wensjacht · ") + datum(a.datum)}),
        h("h1", {text:D.T.bordKop}),
        h("p", {text:D.T.bordUit})
      ]),
      h("div", {class:"j-bordwrap"}, [
        im,
        a.zet ? h("div", {class:"j-kaartje zet", style:"--k:" + WENS[a.zet.c].kleur}, [h("p", {class:"eyebrow", text:t("Je eerste zet, binnen 24 uur")}), h("p", {class:"j-groot", text:a.zet.a})]) : null,
        h("div", {class:"j-knoppen"}, [
          h("button", {class:"btn-gold", text:t("Bewaar als afbeelding"), onclick:async ()=>{ const b = await blob(); const u = URL.createObjectURL(b); const l = h("a", {href:u, download:naam}); document.body.appendChild(l); l.click(); l.remove(); setTimeout(()=>URL.revokeObjectURL(u), 4000); }}),
          kanDelen ? h("button", {class:"btn-line", text:t("Delen"), onclick:async ()=>{ try{ const f = new File([await blob()], naam, {type:"image/png"}); if(navigator.canShare({files:[f]})) await navigator.share({files:[f], title:t("Mijn wensjacht")}); else V.toast(t("Delen lukt hier niet. Bewaar de afbeelding en deel die.")); }catch(e){} }}) : null,
          h("button", {class:"btn-line", text:t("Foto's naar mijn moodboard"), onclick:async function(){
            const B = (await V.board.get()) || {v:1, items:[]}; let k = 0;
            for(let i = 0; i < a.w.length; i++){ if(a.w[i].foto !== "f") continue; const src = await FOTO.get(a.id + ":" + i), bi = await laadBeeld(src); if(!bi) continue;
              B.items.push({id:Math.random().toString(36).slice(2, 9), type:"foto", src:src, ar:bi.height / bi.width, w:.3, x:.2 + .6 * Math.random(), y:.12 + .6 * Math.random(), rot:Math.round(Math.random() * 8 - 4)}); k++; }
            if(!k){ V.toast(t("Deze jacht heeft geen foto's.")); return; }
            const ok = await V.board.set(B); V.toast(ok === false ? t("Dat lukte niet. Je moodboard zit misschien vol.") : k + t(" foto's staan op je moodboard.")); this.disabled = true;
          }})
        ]),
        h("div", {class:"j-knoppen"}, [
          h("button", {class:"btn-line", text:t("Nieuwe jacht"), onclick:thuis}),
          h("button", {class:"linkish", text:t("Wis dit bord"), onclick:function(){ zeker(this, t("Tik nog eens om dit bord en de foto's te wissen"), ()=>{ FOTO.wis(a.id); ST.archief = ST.archief.filter(q => q.id !== a.id); save(); thuis(); }); }})
        ])
      ])
    ]);
  }

  thuis();
  window.JACHT_APP = {state:()=>ST, tekenBord, thuis};
})();
