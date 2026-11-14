/* ============================================================
   De weg naar morgen — motor van de wandelreis
   Teksten: data/wandeling.js · stijl: css/wandeling.css
   Opslag: V.store "wandeling" (localStorage, alleen op dit apparaat;
   gaat mee in de back-up van Mijn ruimte).

   Techniek uit de wandelingen van Enigma Mystery (Onderweg):
   scherm aan houden (wake lock), zakstand, seintje met trillen/geluid,
   voortgang per moment bewaren en hervatten. Geen stappenteller of gps:
   elk wandelstuk heeft alleen een richttijd.
   ============================================================ */
"use strict";
(function(){
  const D = window.WANDEL, V = window.V;
  const app = document.getElementById("wandelApp");
  const KEY = "wandeling";
  const ALLES = /[?&]alles\b/.test(location.search);      /* test: alle wandelingen open */
  const SNEL = /[?&]snel\b/.test(location.search);        /* test: richttijd in seconden */
  const SEG = {15:2, 25:4, 35:6};                         /* minuten per wandelstuk */

  /* ---------- opslag ---------- */
  function nieuweReis(){ return {id:Date.now().toString(36), start:new Date().toISOString(), A:{}, eerder:[], gevolgd:[], blz:{}}; }
  let ST = V.store.get(KEY, null);
  if(!ST || ST.v !== 1 || !Array.isArray(ST.reizen) || !ST.reizen.length)
    ST = {v:1, plek:"buiten", duur:25, sein:true, actief:0, reizen:[nieuweReis()], run:null};
  if(!ST.reizen[ST.actief]) ST.actief = ST.reizen.length - 1;
  /* hervatten start niet ongemerkt een wandelstuk: een lopende klok staat na opnieuw openen op pauze */
  if(ST.run && ST.run.t0){ ST.run.t0 = null; }
  const save = () => V.store.set(KEY, ST);
  const reis = () => ST.reizen[ST.actief];
  save();

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
  const leeg = v => v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === "");
  const tekstVan = v => Array.isArray(v) ? v.join(" · ") : String(v);
  const datum = iso => { try{ return new Date(iso).toLocaleDateString("nl-NL", {day:"numeric", month:"long", year:"numeric"}); }catch(e){ return ""; } };
  function antwoorden(){
    const A = Object.assign({}, reis().A);
    if(ST.run) for(const k in ST.run.D){ if(ST.run.D[k] === null) delete A[k]; else A[k] = ST.run.D[k]; }
    return A;
  }
  function sleutels(w){
    const ks = [], niet = ["verlangen_bevestiging", "slotrichting"];   /* keuzes over de wens zelf: niet als antwoord tonen */
    D.W[w-1].m.forEach(m => m.r.forEach(f => { if(f.key && ks.indexOf(f.key) < 0 && niet.indexOf(f.key) < 0) ks.push(f.key); }));
    return ks;
  }
  function stage(){ return reis().gevolgd.length ? Math.max.apply(null, reis().gevolgd) : 0; }
  function volgende(){ const g = reis().gevolgd; for(let n = 1; n <= 7; n++) if(g.indexOf(n) < 0) return n; return 0; }
  function open(n){ return ALLES || n === 1 || reis().gevolgd.indexOf(n-1) >= 0 || reis().gevolgd.indexOf(n) >= 0; }
  function zetWens(R, nieuw){
    const oud = R.A.verlangen;
    if(oud && oud !== nieuw && R.eerder.indexOf(oud) < 0) R.eerder.push(oud);
    if(leeg(nieuw)) delete R.A.verlangen; else R.A.verlangen = nieuw;
  }
  /* tweemaal tikken om iets onomkeerbaars te bevestigen */
  function zeker(btn, vraag, doe){
    if(btn.classList.contains("armed")){ doe(); return; }
    const oud = btn.textContent;
    btn.textContent = vraag; btn.classList.add("armed");
    setTimeout(()=>{ if(btn.isConnected){ btn.textContent = oud; btn.classList.remove("armed"); } }, 5000);
  }
  function scherm(inWalk, kids){
    stopKlok();
    document.body.classList.toggle("in-walk", !!inWalk);
    app.textContent = "";
    kids.forEach(k => k && app.appendChild(k));
    window.scrollTo(0, 0);
    const kop = app.querySelector("h1");
    if(kop){ kop.setAttribute("tabindex", "-1"); kop.focus({preventScroll:true}); }
  }

  /* ---------- scherm aan, seintje ---------- */
  let wake = null, ac = null;
  function lock(){ try{ if(navigator.wakeLock) navigator.wakeLock.request("screen").then(w=>{ wake = w; }).catch(()=>{}); }catch(e){} }
  function release(){ try{ if(wake) wake.release(); }catch(e){} wake = null; }
  function geluidKlaar(){ try{ ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if(ac.state === "suspended") ac.resume(); }catch(e){} }
  function sein(){
    try{ if(navigator.vibrate) navigator.vibrate([90, 70, 90]); }catch(e){}
    if(!ST.sein || !ac) return;
    try{
      [523.25, 659.25].forEach((f, i)=>{
        const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * .38;
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.1, t + .06); g.gain.exponentialRampToValueAtTime(.0001, t + 1.5);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 1.6);
      });
    }catch(e){}
  }
  document.addEventListener("visibilitychange", ()=>{
    if(document.hidden){ if(ST.run && ST.run.fase === "loop") bewaarTijd(); }
    else if(ST.run && ST.run.fase === "loop" && ST.run.t0) lock();
  });

  /* ============================================================
     De wintertuin (getekend; verandert per gevolgde wandeling)
     ============================================================ */
  function tuin(s){
    const schoon = i => s >= 7 || (s >= 6 && i !== 6) || (s >= 4 && i <= 2) || (s >= 2 && i === 1);
    let ruit = "";
    for(let i = 0; i < 7; i++){
      if(i === 3) continue;
      const x = 40 + i * 40;
      ruit += '<rect x="'+x+'" y="78" width="40" height="92" fill="'+(s >= 7 ? "#F7E3B4" : schoon(i) ? "#DCEBDD" : "#B4AD98")+'" opacity="'+(schoon(i) ? .55 : .93)+'"/>';
      if(schoon(i) && s < 7) ruit += '<path d="M'+(x+6)+' 84 l10 0 l-14 40z" fill="#fff" opacity=".5"/>';
    }
    const binnen =
      (s < 4 ? '<rect x="52" y="140" width="26" height="30" fill="#8C7A5E"/><rect x="60" y="124" width="22" height="16" fill="#9C8A6B"/><rect x="94" y="146" width="24" height="24" fill="#857256"/>' : "") +
      (s < 7 ? '<rect x="250" y="138" width="30" height="32" fill="#8C7A5E"/><rect x="284" y="150" width="24" height="20" fill="#9C8A6B"/>' : "") +
      (s >= 4 ? '<g stroke="#6B4A2E" stroke-width="3" stroke-linecap="round" fill="none"><path d="M92 170 v-42 M92 150 h18 v20 M92 128 h4"/></g>' : "") +
      (s >= 5 ? '<g><rect x="122" y="144" width="36" height="4" rx="1" fill="#7A5A3C"/><path d="M126 148 v22 M154 148 v22" stroke="#7A5A3C" stroke-width="3"/><rect x="133" y="138" width="14" height="6" fill="#FBF6EA" transform="rotate(-6 140 141)"/></g>' : "") +
      (s >= 6 ? '<g><path d="M60 170 v-20 M60 152 q-10 -8 -6 -18 M60 156 q10 -8 8 -20 M60 160 q-12 -2 -14 -10" stroke="#4E7D5E" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="53" y="162" width="14" height="8" fill="#B5673F"/>' +
                 '<path d="M226 170 v-26 M226 148 q-9 -8 -5 -17 M226 152 q9 -7 9 -18" stroke="#4E7D5E" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="219" y="162" width="14" height="8" fill="#B5673F"/>' +
                 '<g stroke="#6B4A2E" stroke-width="3" stroke-linecap="round" fill="none"><path d="M188 170 v-20 h-18 v20 M188 150 v-22"/></g>' +
                 '<path d="M148 138 q-2 -10 3 -14 M150 138 q4 -6 8 -6" stroke="#4E7D5E" stroke-width="2" fill="none" stroke-linecap="round"/></g>' : "");
    const deur = s >= 7
      ? '<rect x="160" y="96" width="40" height="74" fill="#F9D98F"/><path d="M200 96 l22 8 v62 l-22 4z" fill="#3F6B52" stroke="#2C4E3B" stroke-width="1.5"/><path d="M150 190 L160 170 H200 L226 190Z" fill="#F9D98F" opacity=".55"/>'
      : '<rect x="160" y="96" width="40" height="74" fill="#3F6B52" stroke="#2C4E3B" stroke-width="1.5"/><rect x="166" y="102" width="28" height="30" fill="'+(s >= 2 ? "#CFE0D2" : "#A9A790")+'" opacity=".8"/><circle cx="193" cy="140" r="2" fill="#D9B45A"/>';
    return '<svg class="tuin-svg" viewBox="0 0 360 214" role="img" aria-label="De wintertuin achter het pension">' +
      '<rect width="360" height="214" rx="16" fill="'+(s >= 7 ? "#F8EBCB" : "#EAE3CF")+'"/>' +
      '<circle cx="300" cy="44" r="20" fill="#F6CF8E" opacity="'+(.25 + s * .1)+'"/>' +
      '<path d="M0 190 H360 V198 a16 16 0 0 1 -16 16 H16 a16 16 0 0 1 -16 -16Z" fill="#C9C39D"/>' +
      '<rect x="40" y="78" width="280" height="92" fill="'+(s >= 7 ? "#E3C27E" : "#5D5646")+'"/>' + binnen + ruit +
      '<path d="M40 78 L180 26 L320 78Z" fill="'+(s >= 7 ? "#F3DDA8" : s >= 2 ? "#CBD6C4" : "#B8B19C")+'" opacity=".9"/>' +
      '<g stroke="#4A5A4C" stroke-width="2.5" fill="none"><path d="M40 78 L180 26 L320 78 M40 78 V170 M320 78 V170 M80 78 V170 M120 78 V170 M160 78 V170 M200 78 V170 M240 78 V170 M280 78 V170 M40 78 H320 M110 52 V78 M180 26 V78 M250 52 V78"/></g>' +
      '<rect x="36" y="170" width="288" height="20" fill="#A8704F"/><path d="M36 180 H324" stroke="#8E5B3F" stroke-width="1"/>' + deur +
      '<text x="180" y="91" text-anchor="middle" font-family="Jost,system-ui,sans-serif" font-weight="600" font-size="9.5" letter-spacing="3.2" fill="#B8923A">MORGEN</text>' +
      '<g><path d="M22 190 v-40" stroke="#7A5A3C" stroke-width="3"/><rect x="10" y="132" width="24" height="20" rx="2" fill="#9A7650"/><rect x="14" y="136" width="16" height="12" fill="'+(s >= 1 ? "#FBF6EA" : "none")+'" stroke="#FBF6EA" stroke-width="1" stroke-dasharray="'+(s >= 1 ? "0" : "2 2")+'"/></g>' +
      (s >= 3 ? '<g transform="rotate(-7 338 172)"><rect x="324" y="160" width="30" height="16" rx="2" fill="#9A7650"/><text x="327" y="172" font-family="Jost,system-ui,sans-serif" font-weight="600" font-size="8" fill="#FBF6EA">OPE<tspan dy="1.2" rotate="9">N</tspan></text></g>' : "") +
      '</svg>';
  }
  function tuinBlok(s, metWoorden){
    const A = reis().A, kaartjes = [];
    if(metWoorden){
      if(A.wenstitel) kaartjes.push(A.wenstitel);
      (A.richtingwoorden || A.gevoelswoorden || []).forEach(w => kaartjes.push(w));
    }
    return h("figure", {class:"tuin"}, [
      h("div", {html:tuin(s)}),
      kaartjes.length ? h("div", {class:"tuin-kaartjes", "aria-label":"Jouw woorden op de kaarten"}, kaartjes.map(k => h("span", {text:k}))) : null,
      h("figcaption", {text:D.TUIN[s]})
    ]);
  }

  /* ============================================================
     Overzicht
     ============================================================ */
  function thuis(){
    const R = reis(), run = ST.run, nx = volgende();
    let hoofd;
    if(run){
      const m = D.W[run.w-1].m[run.i];
      hoofd = h("button", {class:"btn-groen", text:"Verder bij " + m.id + " · " + m.t, onclick:hervat});
    } else if(nx){
      hoofd = h("button", {class:"btn-groen", text:(R.gevolgd.length ? "Begin wandeling " + nx : "Begin bij het hek"), onclick:()=>vooraf(nx)});
    } else {
      hoofd = h("button", {class:"btn-groen", text:"Bekijk mijn toekomstkaart", onclick:kaartScherm});
    }
    const lijst = h("ol", {class:"w-lijst"}, D.W.map(w=>{
      const klaar = R.gevolgd.indexOf(w.n) >= 0, bezig = run && run.w === w.n, kan = open(w.n);
      const b = h("button", {class:"w-item" + (klaar ? " klaar" : "") + (bezig ? " bezig" : ""), disabled:!kan,
        onclick:function(){
          if(bezig) return hervat();
          if(run) return zeker(this.querySelector(".w-staat"), "Je bent nog bezig met wandeling " + run.w + ". Tik nog eens om toch deze te beginnen.", ()=>{ ST.run = null; save(); vooraf(w.n); });
          vooraf(w.n);
        }}, [
        h("span", {class:"w-nr", text:String(w.n), "aria-hidden":"true"}),
        h("span", {class:"w-tekst"}, [h("b", {text:w.t}), h("small", {text:w.sub})]),
        h("span", {class:"w-staat", text: bezig ? "Bezig" : klaar ? "Gelopen" : kan ? "Open" : "Volgt"})
      ]);
      return h("li", null, b);
    }));
    scherm(false, [
      h("header", {class:"page-head"}, [
        h("p", {class:"eyebrow", text:"Een manifestatiereis in zeven wandelingen"}),
        h("h1", {text:"De weg naar morgen"}),
        h("p", {class:"w-onder", text:"Het huis met de groene deur"}),
        h("p", {text:D.T.belofte})
      ]),
      h("div", {class:"w-thuis"}, [
        h("div", {class:"w-links"}, [
          tuinBlok(stage(), true),
          h("p", {class:"w-verhaal", text:"Aan het einde van een denkbeeldig pad staat een oud pension met een groene deur. Op het hek hangt een bord: “Voor mensen die ruimte willen maken voor wat ertoe doet.”"}),
          h("div", {class:"w-knoppen"}, [hoofd,
            !nx && !run ? h("button", {class:"btn-line", text:"Een volgende wandeling beginnen", onclick:boek}) : null]),
          h("p", {class:"w-linkjes"}, [
            h("button", {class:"linkish", text:"Mijn toekomstkaart", onclick:kaartScherm}),
            h("button", {class:"linkish", text:"Mijn wandelboek", onclick:boek}),
            h("button", {class:"linkish", text:"Over deze reis", onclick:()=>V.openOverlay(document.getElementById("overOverlay"))})
          ])
        ]),
        h("div", null, [
          lijst,
          h("p", {class:"soft w-klein", text:"Zeven losse wandelingen, in je eigen tempo. Elke wandeling heeft zes korte leesmomenten en vijf wandelstukken: ongeveer 15, 25 of 35 minuten. Buiten, binnen of op de plaats."})
        ])
      ])
    ]);
  }

  /* ============================================================
     Voor je begint
     ============================================================ */
  function seg(naam, opties, huidig, zet){
    const box = h("div", {class:"w-seg", role:"group", "aria-label":naam});
    opties.forEach(o=>{
      box.appendChild(h("button", {type:"button", "aria-pressed":String(o[0] === huidig()), text:o[1], onclick:()=>{
        zet(o[0]); save();
        box.querySelectorAll("button").forEach((b, i)=>b.setAttribute("aria-pressed", String(opties[i][0] === huidig())));
      }}));
    });
    return box;
  }
  function vooraf(w){
    const W = D.W[w-1];
    scherm(true, [
      balk(null),
      h("article", {class:"moment"}, [
        h("p", {class:"eyebrow", text:"Wandeling " + w + " · " + W.t}),
        h("h1", {text:"Een stukje voor jezelf"}),
        h("div", {class:"scene"}, D.T.vooraf.map(p => h("p", {text:p}))),
        h("section", {class:"refl"}, [
          h("p", {class:"vraag", text:"Waar wandel je?"}),
          seg("Waar wandel je", [["buiten","Buiten wandelen"],["binnen","Binnen of op de plaats"]], ()=>ST.plek, v=>{ ST.plek = v; }),
          h("p", {class:"vraag", text:"Hoe lang ongeveer?"}),
          seg("Richtduur", [[15,"± 15 min"],[25,"± 25 min"],[35,"± 35 min"]], ()=>ST.duur, v=>{ ST.duur = v; }),
          h("p", {class:"w-klein soft", text:"De richttijd is een suggestie. Je kunt altijd pauzeren, eerder verdergaan of langer doorlopen. Niets wordt verstuurd; wat je bewaart, blijft op dit apparaat."})
        ]),
        h("div", {class:"w-knoppen"}, [
          h("button", {class:"btn-groen", text:"Begin mijn wandeling", onclick:()=>{
            const A = reis().A;
            ST.run = {w:w, i:0, fase:(w !== 6 && (A.kleine_stap || A.volgende_stap)) ? "terug" : "lees", el:0, t0:null, D:{}, stil:{}};
            save(); geluidKlaar(); hervat();
          }})
        ])
      ])
    ]);
  }

  /* ---------- balk bovenaan tijdens een wandeling ---------- */
  function balk(run){
    const kids = [h("button", {class:"linkish", text:"← Overzicht", onclick:()=>{ verzamelHuidig(); if(ST.run && ST.run.fase === "loop") pauze(); release(); thuis(); }})];
    if(run){
      const dots = h("div", {class:"w-dots", role:"img", "aria-label":"Moment " + (run.i+1) + " van 6"});
      for(let i = 0; i < 6; i++) dots.appendChild(h("i", {class:i < run.i ? "af" : i === run.i ? "nu" : ""}));
      kids.push(dots);
      const naar = i => { verzamelHuidig(); if(run.fase === "loop") bewaarTijd(); run.i = i; run.fase = "lees"; run.el = 0; run.t0 = null; save(); release(); hervat(); };
      kids.push(h("details", {class:"w-meer"}, [
        h("summary", {text:"Meer"}),
        h("div", null, [
          run.i > 0 ? h("button", {class:"linkish", text:"Eén moment terug", onclick:()=>naar(run.i - 1)}) : null,
          h("button", {class:"linkish", text:"Naar het begin van deze wandeling", onclick:()=>naar(0)}),
          h("button", {class:"linkish", text:"Naar de afronding van deze wandeling", onclick:()=>naar(5)}),
          h("button", {class:"linkish", text:"Zacht seintje bij de richttijd: " + (ST.sein ? "aan" : "uit"), onclick:function(){ ST.sein = !ST.sein; save(); this.textContent = "Zacht seintje bij de richttijd: " + (ST.sein ? "aan" : "uit"); }}),
          h("button", {class:"linkish", text:"Deze wandeling stoppen", onclick:function(){ zeker(this, "Tik nog eens: de antwoorden van deze wandeling worden niet bewaard.", ()=>{ ST.run = null; save(); release(); thuis(); }); }})
        ])
      ]));
    }
    return h("div", {class:"w-balk"}, kids);
  }

  function hervat(){
    const run = ST.run;
    if(!run) return thuis();
    if(run.fase === "terug") return terugScherm();
    if(run.fase === "loop") return loopScherm();
    momentScherm();
  }

  /* ============================================================
     Terugkomen na een wandeling (alleen als er een stap bestaat)
     ============================================================ */
  function terugScherm(){
    const run = ST.run, A = antwoorden();
    const uit = h("p", {class:"w-terug", role:"status"});
    const box = h("div", {class:"chips"});
    D.TERUG.map(x=>x).concat([{v:"ik wil het voor mezelf houden", tx:D.TERUG_PRIVE, prive:true}]).forEach(o=>{
      box.appendChild(h("button", {class:"chip", type:"button", "aria-pressed":"false", text:o.v, onclick:function(){
        box.querySelectorAll(".chip").forEach(b=>b.setAttribute("aria-pressed", String(b === this)));
        if(o.prive) delete run.D.terugkomst; else run.D.terugkomst = o.v;
        uit.textContent = o.tx; save();
      }}));
    });
    scherm(true, [
      balk(null),
      h("article", {class:"moment"}, [
        h("p", {class:"eyebrow", text:"Voor we verdergaan"}),
        h("h1", {text:"Terug bij de groene deur"}),
        h("div", {class:"scene"}, [h("p", {text:"De vorige keer koos je een kleine stap. Hoe is het daarmee gegaan? Elk antwoord is hier welkom."})]),
        h("section", {class:"refl"}, [
          h("div", {class:"toon"}, [h("div", null, [h("span", {text:"Mijn stap"}), h("p", {text:tekstVan(A.volgende_stap || A.kleine_stap)})])]),
          box, uit
        ]),
        h("div", {class:"w-knoppen"}, [h("button", {class:"btn-groen", text:"Verder", onclick:()=>{ run.fase = "lees"; save(); hervat(); }})])
      ])
    ]);
  }

  /* ============================================================
     Leesmoment
     ============================================================ */
  let verzamelHuidig = function(){};

  function momentScherm(){
    const run = ST.run, W = D.W[run.w-1], m = W.m[run.i], laatste = run.i === 5;
    const basis = reis().A, A0 = antwoorden();
    const loc = {}, eig = {}, eigAan = {};
    const invoer = m.r.filter(f => f.t !== "toon");

    /* beginwaarden */
    invoer.forEach(f=>{
      if(f.key in loc) return;
      let v = run.D[f.key] !== undefined ? run.D[f.key] : (f.nieuw ? undefined : basis[f.key]);
      if(leeg(v) && f.voor && !(f.key in run.D)) v = f.voor(A0);
      if(f.t === "kies"){
        const opts = typeof f.opts === "function" ? f.opts(A0) : f.opts;
        const arr = (Array.isArray(v) ? v : leeg(v) ? [] : [v]);
        loc[f.key] = arr.filter(x => opts.indexOf(x) >= 0);
        const rest = arr.filter(x => opts.indexOf(x) < 0);
        if(rest.length){ eig[f.key] = rest.join(", "); eigAan[f.key] = true; }
      } else loc[f.key] = leeg(v) ? "" : String(v);
    });
    function waarde(f){
      if(f.t !== "kies") return (loc[f.key] || "").trim();
      const own = eigAan[f.key] ? (eig[f.key] || "").trim() : "";
      if(f.multi){ const a = loc[f.key].slice(); if(own) a.push(own); return f.max ? a.slice(-f.max) : a; }
      return own || loc[f.key][0] || "";
    }
    function nu(){ const A = Object.assign({}, A0); invoer.forEach(f=>{ if(f.t === "kies" && f.key !== "verlangen"){ const v = waarde(f); if(leeg(v)) delete A[f.key]; else A[f.key] = v; } }); return A; }
    const zichtbaar = f => !f.als || f.als(nu());

    verzamelHuidig = function(){
      if(!ST.run || ST.run !== run || run.fase !== "lees") return;
      const gedaan = {};
      invoer.forEach(f=>{
        if(run.stil[m.id]){ delete run.D[f.key]; return; }
        if(!zichtbaar(f) || gedaan[f.key]) return;
        gedaan[f.key] = true;
        const v = waarde(f);
        if(!leeg(v)) run.D[f.key] = v;
        else if(!leeg(basis[f.key]) && !(f.key === "verlangen" && !f.nieuw && f.als)) run.D[f.key] = null;
        else delete run.D[f.key];
      });
      /* “mijn wens meenemen”: de wens zelf blijft onaangeroerd */
      if(!gedaan.verlangen && invoer.some(f=>f.key === "verlangen")) delete run.D.verlangen;
      save();
    };

    /* ---- velden tekenen ---- */
    const velden = h("div", {class:"velden"});
    function teken(){
      velden.textContent = "";
      const A = nu();
      m.r.forEach(f=>{
        if(f.t === "toon"){
          const rows = f.keys.filter(k => !leeg(A[k]));
          if(!rows.length) return;
          velden.appendChild(h("div", {class:"toon" + (f.naast ? " naast" : "")}, [f.kop ? h("p", {class:"vraag", text:f.kop}) : null].concat(
            rows.map(k => h("div", null, [h("span", {text:D.LABEL[k]}), h("p", {text:tekstVan(A[k])})])))));
          return;
        }
        if(!zichtbaar(f)) return;
        if(f.t === "kies"){
          const opts = typeof f.opts === "function" ? f.opts(A0) : f.opts;
          const box = h("div", {class:"chips"});
          const kies = (o)=>{
            const a = loc[f.key], i = a.indexOf(o);
            if(f.multi){ if(i >= 0) a.splice(i, 1); else { a.push(o); const lim = (f.max || 99) - (eigAan[f.key] && (eig[f.key] || "").trim() ? 1 : 0); while(a.length > Math.max(lim, 1)) a.shift(); } }
            else { loc[f.key] = i >= 0 ? [] : [o]; eigAan[f.key] = false; }
            /* wens aanpassen of opnieuw beginnen: veld klaarzetten */
            m.r.forEach(g=>{ if(g.nieuw){ const k = loc[f.key][0] || ""; loc[g.key] = /aanpassen/.test(k) ? (basis[g.key] || "") : ""; } });
            teken();
          };
          opts.forEach(o => box.appendChild(h("button", {class:"chip", type:"button", "aria-pressed":String(loc[f.key].indexOf(o) >= 0), text:o, onclick:()=>kies(o)})));
          if(f.leeg) box.appendChild(h("button", {class:"chip stil", type:"button", text:f.leeg, onclick:()=>{ loc[f.key] = []; eigAan[f.key] = false; teken(); }}));
          if(f.eigen) box.appendChild(h("button", {class:"chip", type:"button", "aria-pressed":String(!!eigAan[f.key]), text:f.eigen + "…", onclick:()=>{
            eigAan[f.key] = !eigAan[f.key]; if(eigAan[f.key] && !f.multi) loc[f.key] = []; teken();
            const inp = velden.querySelector('[data-eig="'+f.key+'"]'); if(inp) inp.focus();
          }}));
          velden.appendChild(box);
          if(f.eigen && eigAan[f.key]) velden.appendChild(h("input", {class:"w-in", type:"text", maxlength:"80", "data-eig":f.key, "aria-label":f.eigen, placeholder:"In je eigen woorden", value:eig[f.key] || "", oninput:function(){ eig[f.key] = this.value; }}));
          if(f.terug){
            const hit = D.TERUG.filter(x => x.v === loc[f.key][0])[0];
            if(hit) velden.appendChild(h("p", {class:"w-terug", role:"status", text:hit.tx}));
          }
          return;
        }
        const id = "f_" + f.key + (f.nieuw ? "_n" : "");
        const inp = f.kort
          ? h("input", {class:"w-in", id:id, type:"text", maxlength:"120", placeholder:f.ph || "", value:loc[f.key], oninput:function(){ loc[f.key] = this.value; }})
          : h("textarea", {class:"w-in", id:id, rows:"2", maxlength:"400", placeholder:f.ph || "", oninput:function(){ loc[f.key] = this.value; this.style.height = "auto"; this.style.height = this.scrollHeight + 2 + "px"; }});
        if(!f.kort) inp.value = loc[f.key];
        velden.appendChild(h("label", {class:"w-label", for:id, text:f.label}));
        velden.appendChild(inp);
        if(f.hint) velden.appendChild(h("p", {class:"w-klein soft", text:f.hint}));
        if(f.alt) velden.appendChild(h("div", {class:"chips"}, f.alt.map(a => h("button", {class:"chip stil", type:"button", "aria-pressed":String(loc[f.key] === a), text:a, onclick:()=>{ loc[f.key] = loc[f.key] === a ? "" : a; teken(); }}))));
      });
    }
    teken();

    /* ---- reflectieblok met “voor mezelf” en “past nu niet” ---- */
    const stilUit = h("p", {class:"w-terug", role:"status"});
    const refl = h("section", {class:"refl"});
    function tekenRefl(){
      refl.textContent = "";
      const stil = run.stil[m.id];
      if(!m.r.length){ refl.hidden = true; return; }
      if(stil){
        stilUit.textContent = stil === "past" ? D.T.pastNa : (m.r.some(f=>f.terug) ? D.TERUG_PRIVE : D.T.priveNa);
        refl.appendChild(stilUit);
        refl.appendChild(h("button", {class:"linkish", text:"Toch iets invullen", onclick:()=>{ delete run.stil[m.id]; save(); tekenRefl(); }}));
        return;
      }
      if(m.vr) refl.appendChild(h("p", {class:"vraag", text:m.vr}));
      refl.appendChild(velden);
      if(invoer.length){
        if(invoer.some(f => f.t === "tekst")) refl.appendChild(h("p", {class:"w-klein soft", text:D.T.hint}));
        refl.appendChild(h("p", {class:"w-linkjes"}, [
          h("button", {class:"linkish", text:D.T.prive, onclick:()=>{ run.stil[m.id] = "prive"; save(); tekenRefl(); }}),
          h("button", {class:"linkish", text:D.T.past, onclick:()=>{ run.stil[m.id] = "past"; save(); tekenRefl(); }}),
          m.beeld ? h("button", {class:"linkish", text:D.T.beeldKnop, onclick:()=>V.openOverlay(document.getElementById("beeldOverlay"))}) : null
        ]));
      }
    }
    tekenRefl();

    /* ---- verhaaltekst ---- */
    const scene = h("div", {class:"scene"}, m.tx.map(p => /^“[^”]*”$/.test(p) ? h("p", {class:"briefje", text:p.slice(1, -1)}) : h("p", {text:p})));
    const th = m.thema && D.THEMAS.filter(x => x.label === A0.thema)[0];
    if(th) scene.appendChild(h("p", {class:"aanvulling", text:th[m.thema]}));
    const beeld = m.img && D.BEELDEN.indexOf(m.img) >= 0 ? h("img", {class:"w-beeld", alt:"", hidden:true, src:"../assets/wandeling/" + m.img + ".webp", onload:function(){ this.hidden = false; }, onerror:function(){ this.remove(); }}) : null;

    const kids = [
      h("p", {class:"eyebrow", text:"Wandeling " + run.w + " · moment " + (run.i+1) + " van 6"}),
      h("h1", {text:m.t}), beeld, scene, refl
    ];
    if(m.kaart){ verzamelHuidig(); kids.push(kaartBlok(antwoorden(), false)); }
    if(!laatste){
      kids.push(h("section", {class:"opdracht"}, [
        h("p", {class:"eyebrow", text:"Voor het wandelstuk"}),
        h("p", {text:m.op}),
        ST.plek === "binnen" ? h("p", {class:"w-klein soft", text:"Binnen kun je door de kamer lopen of op de plaats wandelen."}) : null
      ]));
      kids.push(h("div", {class:"w-knoppen"}, [h("button", {class:"btn-groen", text:"Ik ga wandelen", onclick:()=>{
        verzamelHuidig(); geluidKlaar();
        run.fase = "loop"; run.el = 0; run.t0 = Date.now(); run.gemeld = false; save(); lock(); loopScherm();
      }})]));
      kids.push(h("p", {class:"w-klein soft midden", text:"Berg daarna je telefoon op. Tijdens het lopen blijven je ogen open."}));
    } else {
      kids.push(h("div", {class:"w-knoppen"}, [
        h("button", {class:"btn-groen", text:"Bewaar mijn kaart", onclick:()=>rondAf(true)}),
        h("button", {class:"btn-line", text:"Rond af zonder antwoorden te bewaren", onclick:()=>rondAf(false)})
      ]));
      kids.push(h("p", {class:"w-klein soft midden", text:"Bewaren doe je alleen op dit apparaat. Je kunt je antwoorden later bekijken, aanpassen en wissen."}));
    }
    scherm(true, [balk(run), h("article", {class:"moment"}, kids)]);
    app.querySelectorAll("textarea.w-in").forEach(t=>{ if(t.value){ t.style.height = t.scrollHeight + 2 + "px"; } });
  }

  /* ============================================================
     Wandelstuk
     ============================================================ */
  let klok = null;
  function stopKlok(){ if(klok){ clearInterval(klok); klok = null; } }
  function verstreken(){ const r = ST.run; return r.el + (r.t0 ? Date.now() - r.t0 : 0); }
  function bewaarTijd(){ const r = ST.run; if(r && r.t0){ r.el = verstreken(); r.t0 = Date.now(); save(); } }
  function pauze(){ const r = ST.run; if(r && r.t0){ r.el = verstreken(); r.t0 = null; save(); } release(); }
  function loopScherm(){
    const run = ST.run, m = D.W[run.w-1].m[run.i];
    const doel = SEG[ST.duur] * (SNEL ? 1000 : 60000), C = 2 * Math.PI * 54;
    const boog = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const ring = h("div", {class:"w-ring", html:'<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="spoor"/></svg>'});
    boog.setAttribute("cx", "60"); boog.setAttribute("cy", "60"); boog.setAttribute("r", "54"); boog.setAttribute("class", "boog");
    boog.setAttribute("stroke-dasharray", C.toFixed(1)); boog.setAttribute("transform", "rotate(-90 60 60)");
    ring.firstChild.appendChild(boog);
    const groot = h("b"), klein = h("small");
    ring.appendChild(h("div", {class:"w-ring-tekst"}, [groot, klein]));
    const status = h("p", {class:"w-status", role:"status"});
    const pBtn = h("button", {class:"btn-line", onclick:()=>{ if(run.t0) pauze(); else { run.t0 = Date.now(); save(); lock(); geluidKlaar(); } tik(); }});
    const zak = document.getElementById("zak"), zakTekst = document.getElementById("zakTekst");
    function tik(){
      const el = verstreken(), min = Math.floor(el / 60000), sec = Math.floor(el / 1000) % 60;
      boog.setAttribute("stroke-dashoffset", (C * (1 - Math.min(1, el / doel))).toFixed(1));
      groot.textContent = min + ":" + (sec < 10 ? "0" : "") + sec;
      klein.textContent = "richttijd ± " + SEG[ST.duur] + " min";
      pBtn.textContent = run.t0 ? "Pauze" : "Verder wandelen";
      ring.classList.toggle("stil", !run.t0);
      if(el >= doel){
        status.textContent = "Je richttijd is om. Loop gerust nog even door, of kom terug voor het volgende moment.";
        zakTekst.textContent = "Je richttijd is om. Kom verder wanneer je wilt.";
        if(!run.gemeld){ run.gemeld = true; save(); sein(); }
      } else {
        status.textContent = run.t0 ? "Wandel in je eigen tempo. Je hoeft niet op je scherm te kijken." : "Gepauzeerd. Ga verder wanneer het past.";
        zakTekst.textContent = "";
      }
      if(run.t0 && Math.floor(el / 1000) % 10 === 0) bewaarTijd();
    }
    scherm(true, [
      balk(run),
      h("article", {class:"moment loop"}, [
        h("p", {class:"eyebrow", text:"Wandeling " + run.w + " · wandelstuk " + (run.i+1) + " van 5"}),
        h("h1", {text:"Onderweg"}),
        ring, status,
        h("section", {class:"opdracht"}, [h("p", {class:"eyebrow", text:"Je opdracht, als je hem nog eens wilt lezen"}), h("p", {text:m.op})]),
        h("div", {class:"w-knoppen"}, [pBtn, h("button", {class:"btn-line", text:"Telefoon wegbergen", onclick:()=>{ zak.hidden = false; }})]),
        h("div", {class:"w-knoppen"}, [h("button", {class:"btn-groen", text:"Ik ben klaar voor het volgende moment", onclick:()=>{
          stopKlok(); release(); run.i++; run.fase = "lees"; run.el = 0; run.t0 = null; run.gemeld = false; save(); momentScherm();
        }})]),
        h("p", {class:"w-klein soft midden", text:"Je scherm blijft aan zolang deze pagina open is. Met ‘Telefoon wegbergen’ wordt het scherm donker en tik je niets per ongeluk aan."})
      ])
    ]);
    tik(); klok = setInterval(tik, 1000);
  }
  /* zakstand: vasthouden om terug te komen */
  (function(){
    const zak = document.getElementById("zak"); let t = null;
    zak.addEventListener("pointerdown", ()=>{ t = setTimeout(()=>{ zak.hidden = true; }, 800); });
    ["pointerup","pointercancel","pointerleave"].forEach(n => zak.addEventListener(n, ()=>clearTimeout(t)));
    zak.addEventListener("contextmenu", e=>e.preventDefault());
  })();

  /* ============================================================
     Afronden van een wandeling
     ============================================================ */
  function rondAf(bewaar){
    verzamelHuidig();
    const run = ST.run, R = reis(), w = run.w;
    let bewaard = [];
    if(bewaar){
      for(const k in run.D){
        const v = run.D[k];
        if(k === "verlangen"){ zetWens(R, v); }
        else if(v === null) delete R.A[k]; else R.A[k] = v;
      }
      R.blz[w] = {datum:new Date().toISOString()};
      bewaard = sleutels(w).concat(["terugkomst"]).filter(k => !leeg(run.D[k]));
    }
    if(R.gevolgd.indexOf(w) < 0) R.gevolgd.push(w);
    ST.run = null; save(); release();
    const nx = volgende();
    scherm(true, [
      balk(null),
      h("article", {class:"moment"}, [
        h("p", {class:"eyebrow", text:"Wandeling " + w + " · afgerond"}),
        h("h1", {text:w === 7 ? "Je neemt jouw kaart mee" : "Je kaart ligt op tafel"}),
        bewaard.length
          ? h("div", {class:"w-kaart klein"}, [h("p", {class:"eyebrow", text:D.W[w-1].t})].concat(bewaard.map(k => h("div", {class:"rij"}, [h("span", {text:D.LABEL[k]}), h("p", {text:tekstVan(R.A[k] != null ? R.A[k] : run.D[k])})]))))
          : h("p", {class:"scene", text:bewaar ? D.T.leeg : "Je hebt deze wandeling gelopen zonder antwoorden te bewaren. Wat je ontdekte, neem je zelf mee."}),
        tuinBlok(stage(), true),
        w === 7 ? h("p", {class:"w-slot", text:D.T.slot}) : null,
        h("div", {class:"w-knoppen"}, [
          w === 7 ? h("button", {class:"btn-groen", text:"Bekijk mijn toekomstkaart", onclick:kaartScherm}) : h("button", {class:"btn-groen", text:"Naar het overzicht", onclick:thuis}),
          w === 7 ? h("button", {class:"btn-line", text:"Bekijk mijn reis", onclick:boek}) : null
        ]),
        w < 7 && nx ? h("p", {class:"w-klein soft midden", text:"De volgende wandeling ligt klaar wanneer jij er tijd voor hebt: “" + D.W[nx-1].t + "”. Er is geen haast en geen reeks om bij te houden."}) : null
      ])
    ]);
  }

  /* ============================================================
     De persoonlijke toekomstkaart
     ============================================================ */
  function bewerk(R, k, klaar){
    const arr = Array.isArray(R.A[k]);
    const inp = h("input", {class:"w-in", type:"text", maxlength:"400", "aria-label":D.LABEL[k], value:arr ? R.A[k].join(", ") : (R.A[k] || "")});
    const ok = ()=>{
      const v = inp.value.trim();
      const nieuw = arr ? v.split(",").map(x=>x.trim()).filter(Boolean).slice(0, 3) : v;
      if(k === "verlangen") zetWens(R, nieuw); else if(leeg(nieuw)) delete R.A[k]; else R.A[k] = nieuw;
      save(); klaar();
    };
    inp.addEventListener("keydown", e=>{ if(e.key === "Enter") ok(); });
    return h("div", {class:"w-bewerk"}, [inp, h("button", {class:"btn-line", text:"Klaar", onclick:ok})]);
  }
  function kaartBlok(A, bewerkbaar, opnieuw){
    const R = reis(), rijen = [];
    D.KAART.forEach(veld=>{
      const beschikbaar = veld.k.filter(k => !leeg(A[k]));
      if(!beschikbaar.length) return;
      let k = beschikbaar[0];
      if(veld.kies && R.inzicht && beschikbaar.indexOf(R.inzicht) >= 0) k = R.inzicht;
      const rij = h("div", {class:"rij"}, [h("span", {text:veld.l}), h("p", {text:tekstVan(A[k])})]);
      if(bewerkbaar){
        const acties = h("div", {class:"w-acties"});
        if(veld.kies && beschikbaar.length > 1) acties.appendChild(h("button", {class:"linkish", text:"Kies een ander inzicht", onclick:()=>{ R.inzicht = beschikbaar[(beschikbaar.indexOf(k) + 1) % beschikbaar.length]; save(); opnieuw(); }}));
        acties.appendChild(h("button", {class:"linkish", text:"Wijzig", onclick:()=>{ rij.replaceChild(bewerk(R, k, opnieuw), rij.children[1]); acties.remove(); rij.querySelector("input").focus(); }}));
        acties.appendChild(h("button", {class:"linkish", text:"Wis", onclick:function(){ zeker(this, "Tik nog eens om te wissen", ()=>{ delete R.A[k]; save(); opnieuw(); }); }}));
        rij.appendChild(acties);
      }
      rijen.push(rij);
    });
    const kids = [h("p", {class:"eyebrow", text:"Een kaart om op terug te komen"}), h("h2", {text:"Mijn leven, mijn richting"})];
    if(!rijen.length) kids.push(h("p", {text:D.T.leeg}));
    else {
      rijen.forEach(r => kids.push(r));
      if(!leeg(A.startgevoel) && !leeg(A.slotgevoel)) kids.push(h("p", {class:"w-gevoel", text:"Bij de start: " + tekstVan(A.startgevoel) + ". Nu: " + tekstVan(A.slotgevoel) + "."}));
      kids.push(h("p", {class:"w-slot", text:D.T.slot}));
    }
    return h("div", {class:"w-kaart"}, kids);
  }
  function kaartScherm(){
    scherm(false, [
      h("header", {class:"page-head"}, [h("p", {class:"eyebrow", text:"De weg naar morgen"}), h("h1", {text:"Mijn toekomstkaart"}),
        h("p", {text:"Alleen wat je zelf hebt gekozen of ingevuld staat erop. Je kunt alles wijzigen of wissen."})]),
      h("div", {class:"w-smal"}, [
        kaartBlok(reis().A, true, kaartScherm),
        h("div", {class:"w-knoppen"}, [h("button", {class:"btn-groen", text:"Naar het overzicht", onclick:thuis}), h("button", {class:"btn-line", text:"Mijn wandelboek", onclick:boek})])
      ])
    ]);
  }

  /* ============================================================
     Het persoonlijke wandelboek
     ============================================================ */
  function boek(){
    const R = reis(), paginas = [];
    D.W.forEach(W=>{
      if(R.gevolgd.indexOf(W.n) < 0) return;
      const b = R.blz[W.n], ks = sleutels(W.n).concat(W.n === 6 ? [] : ["terugkomst"]).filter(k => !leeg(R.A[k]) && (k !== "terugkomst" || W.n === 7));
      const kids = [h("p", {class:"eyebrow", text:"Wandeling " + W.n + (b ? " · " + datum(b.datum) : "")}), h("h2", {text:W.t})];
      if(!b || !ks.length) kids.push(h("p", {class:"soft", text:"Gelopen, zonder antwoorden te bewaren."}));
      else ks.forEach(k=>{
        const rij = h("div", {class:"rij"}, [h("span", {text:D.LABEL[k]}), h("p", {text:tekstVan(R.A[k])})]);
        const acties = h("div", {class:"w-acties"}, [
          h("button", {class:"linkish", text:"Wijzig", onclick:()=>{ rij.replaceChild(bewerk(R, k, boek), rij.children[1]); acties.remove(); rij.querySelector("input").focus(); }}),
          h("button", {class:"linkish", text:"Wis", onclick:function(){ zeker(this, "Tik nog eens om te wissen", ()=>{ delete R.A[k]; save(); boek(); }); }})
        ]);
        rij.appendChild(acties); kids.push(rij);
      });
      paginas.push(h("div", {class:"w-kaart blz"}, kids));
    });
    const wensBox = h("div");
    const andere = ST.reizen.map((r, i)=>({r, i})).filter(x => x.i !== ST.actief);
    scherm(false, [
      h("header", {class:"page-head"}, [h("p", {class:"eyebrow", text:"De weg naar morgen"}), h("h1", {text:"Mijn wandelboek"}),
        h("p", {text:"Elke wandeling geeft een bladzijde. Dit boek laat zien welke weg je hebt afgelegd; het meet niets."})]),
      h("div", {class:"w-smal"}, [
        paginas.length ? null : h("p", {class:"scene midden", text:"Je boek is nog leeg. Na je eerste wandeling ligt hier een bladzijde."}),
      ].concat(paginas, [
        R.eerder.length ? h("div", {class:"w-kaart blz"}, [h("p", {class:"eyebrow", text:"Hoe mijn wens eerder klonk"})].concat(R.eerder.map(t => h("p", {class:"soft", text:t})))) : null,
        h("div", {class:"w-kaart blz"}, [
          h("p", {class:"eyebrow", text:"Hoe wil je verder?"}),
          h("div", {class:"w-knoppen links"}, [
            h("button", {class:"btn-groen", text:"Verder met mijn wens", onclick:thuis}),
            h("button", {class:"btn-line", text:"Mijn wens aanpassen", onclick:()=>{ wensBox.textContent = ""; wensBox.appendChild(h("label", {class:"w-label", text:"Ik verlang naar…"})); wensBox.appendChild(bewerk(R, "verlangen", boek)); wensBox.querySelector("input").focus(); }}),
            h("button", {class:"btn-line", text:"Een nieuwe wens verkennen", onclick:function(){ zeker(this, "Tik nog eens: je begint een nieuwe reis. Deze reis blijft apart bewaard.", ()=>{ ST.reizen.push(nieuweReis()); ST.actief = ST.reizen.length - 1; ST.run = null; save(); thuis(); }); }})
          ]),
          wensBox
        ]),
        andere.length ? h("div", {class:"w-kaart blz"}, [h("p", {class:"eyebrow", text:"Andere reizen"})].concat(andere.map(x => h("div", {class:"rij"}, [
          h("span", {text:"Begonnen op " + datum(x.r.start)}),
          h("p", {text:x.r.A.wenstitel || x.r.A.verlangen || "Een reis zonder bewaarde wens"}),
          h("div", {class:"w-acties"}, [
            h("button", {class:"linkish", text:"Open deze reis", onclick:()=>{ ST.actief = x.i; ST.run = null; save(); boek(); }}),
            h("button", {class:"linkish", text:"Wis deze reis", onclick:function(){ zeker(this, "Tik nog eens om deze reis te wissen", ()=>{ ST.reizen.splice(x.i, 1); if(ST.actief > x.i) ST.actief--; save(); boek(); }); }})
          ])
        ])))) : null,
        h("p", {class:"w-linkjes midden"}, [
          h("button", {class:"linkish", text:"Wis alle antwoorden van deze reis", onclick:function(){ zeker(this, "Tik nog eens: alle antwoorden van deze reis worden gewist.", ()=>{ R.A = {}; R.eerder = []; R.blz = {}; delete R.inzicht; save(); boek(); }); }}),
          h("button", {class:"linkish", text:"Naar het overzicht", onclick:thuis})
        ])
      ]))
    ]);
  }

  /* ---------- start ---------- */
  document.getElementById("overTekst").append(...D.T.over.map(p => h("p", {text:p})), h("p", {class:"soft", text:D.T.site}));
  document.getElementById("beeldTekst").textContent = D.T.beeld;
  thuis();
  window.WANDEL_APP = {thuis, state:()=>ST};
})();
