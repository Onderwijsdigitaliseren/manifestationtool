/* Moordwandeling / Murder Walk – gedeelde wandelmotor voor nieuwe wandelspellen.
   Wereld ophalen (OpenStreetMap via vectortegels of Overpass, met cache), plekken kiezen, nachtkaart tekenen, gps volgen, oefenwereld,
   vellen/toasts/geluid. Vereist platform.js. Spel 1 (Moordwandeling) heeft nog zijn eigen, oudere kopie hiervan.
   Plattegrond: laad shared/plan.js vóór dit bestand; zonder kaartdienst komt de zaak op een getekende stad, en de kaart krijgt de knop ▦. */
(function(){
"use strict";
var MW=window.MW,LS=MW.LS,$=function(s){return document.querySelector(s)};
function rngOf(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function shuffle(a,r){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}

/* ---------- plekken ---------- */
var PRI=["kerk","hotel","bank","apotheek","cafe","bieb","park","school","kunst","tank","winkel","halte","post","bankje","hoek"];
function poiType(t){
  if(!t)return null;var a=t.amenity,s=t.tourism;
  if(a==="place_of_worship")return"kerk";if(a==="bank"||a==="atm")return"bank";if(/^(cafe|pub|bar|restaurant)$/.test(a||""))return"cafe";
  if(a==="pharmacy")return"apotheek";if(a==="post_box")return"post";if(a==="library")return"bieb";if(a==="school")return"school";if(a==="fuel")return"tank";if(a==="bench")return"bankje";
  if(s==="hotel")return"hotel";if(s==="artwork"||s==="museum")return"kunst";if(t.shop)return"winkel";if(t.highway==="bus_stop")return"halte";
  if(t.leisure==="park"||t.leisure==="playground")return"park";return null}
var HOSTS=["https://overpass.private.coffee/api/interpreter","https://maps.mail.ru/osm/tools/overpass/api/interpreter","https://overpass-api.de/api/interpreter"];
/* eerst één server; na 4 en 8 s zonder antwoord (of meteen bij een fout) de volgende erbij */
function ask(q,ms){var hosts=window.SS_MAP||HOSTS;return new Promise(function(res,rej){var ac=new AbortController(),ts=[],nx=0,left=hosts.length,done=false;
  var fin=function(ok,v){if(done)return;done=true;ts.forEach(clearTimeout);ac.abort();ok?res(v):rej(v)};
  var start=function(){if(done||nx>=hosts.length)return;var h=hosts[nx++];
    fetch(h,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"data="+encodeURIComponent(q),signal:ac.signal}).then(function(r){if(!r.ok)throw new Error("server "+r.status);return r.json()}).then(function(d){fin(true,d)},function(e){if(--left<=0)fin(false,e);else start()})};
  start();ts.push(setTimeout(start,4000),setTimeout(start,8000),setTimeout(function(){fin(false,new Error("timeout"))},ms))})}
/* fetchWorld({lat,lon,R,status}) → Promise<{pois,ways,origin,later}>; later = Promise met straten (komen op de achtergrond)
   Volgorde: 1) deze buurt staat al in de cache → meteen; 2) vectortegels (shared/tiles.js, snel, via een CDN);
   3) de Overpass-servers (traag en vaak druk); 4) niets bereikbaar → getekende plattegrond (shared/plan.js). */
var POIQ=function(A){return'[out:json][timeout:12];(nwr'+A+'[amenity~"^(place_of_worship|bank|atm|cafe|pub|bar|restaurant|pharmacy|post_box|library|school|fuel)$"];nwr'+A+'[tourism~"^(hotel|artwork|museum)$"];nwr'+A+'[shop~"^(supermarket|bakery|convenience)$"];node'+A+'[highway=bus_stop];nwr'+A+'[leisure~"^(park|playground)$"];);out center qt 400;'};
function shiftW(w,ox,oy){var o={w:w.w,n:w.n,p:w.p.map(function(v,i){return Math.round(v+(i%2?oy:ox))})};if(w.ns)o.ns=1;return o}
function tilesWorld(lat,lon,R,ms){return MW.Tiles?MW.Tiles.world({lat:lat,lon:lon,R:R+150,ms:ms}):Promise.reject(new Error("notiles"))}
/* straten erbij halen: eerst uit de tegels, anders via Overpass */
function moreStreets(lat,lon,R,xy){return tilesWorld(lat,lon,R,9000).then(function(t){if(!t.ways.length)throw new Error("noways");return t.ways}).catch(function(){return streets(lat,lon,R,xy)})}
function fetchWorld(o){var lat=o.lat,lon=o.lon,R=o.R,st=o.status||function(){};
  var kx=111320*Math.cos(lat*Math.PI/180),ky=110540,xy=function(la,lo){return[(lo-lon)*kx,-(la-lat)*ky]},A="(around:"+R+","+lat+","+lon+")",origin={lat:lat,lon:lon,kx:kx,ky:ky};
  var c=LS.get("ss_map",null);
  if(c&&c.R>=R&&c.pois&&c.pois.length&&Math.hypot((c.lon-lon)*kx,(c.lat-lat)*ky)<150){var ox=(c.lon-lon)*kx,oy=-(c.lat-lat)*ky;
    var cw=(c.ways||[]).map(function(w){return shiftW(w,ox,oy)}),cp=c.pois.map(function(p){return{x:p.x+ox,y:p.y+oy,type:p.type,name:p.name}});
    /* stond de buurt zonder straten in de cache (straten kwamen toen niet), dan nu opnieuw proberen */
    return Promise.resolve({origin:origin,cached:true,pois:cp,ways:cw,later:cw.length?Promise.resolve(null):moreStreets(lat,lon,R,xy).then(function(ws){if(ws&&ws.length)LS.set("ss_map",{lat:c.lat,lon:c.lon,R:c.R,pois:c.pois,ways:ws.map(function(w){return shiftW(w,-ox,-oy)})});return ws&&ws.length?ws:null}).catch(function(){return null})})}
  st("pois");
  var save=function(pois,ways){if(pois.length)LS.set("ss_map",{lat:lat,lon:lon,R:R,pois:pois,ways:ways})};
  var addPois=function(d,pois){(d.elements||[]).forEach(function(e){var ty=poiType(e.tags),q=e.type==="node"?[e.lat,e.lon]:e.center?[e.center.lat,e.center.lon]:null;if(!ty||!q)return;var p=xy(q[0],q[1]);pois.push({x:p[0],y:p[1],type:ty,name:e.tags.name||""})})};
  return tilesWorld(lat,lon,R,8000).then(function(t){
    var inR=t.pois.filter(function(p){return Math.hypot(p.x,p.y)<=R}).length,done=function(pois){save(pois,t.ways);return{origin:origin,cached:false,pois:pois,ways:t.ways,later:Promise.resolve(null)}};
    if(inR>=4||!t.ways.length&&inR)return done(t.pois);
    /* weinig plekken in de tegels (buitengebied): Overpass mag er nog wat bij zoeken; lukt dat niet, dan spelen we met de hoeken van de straten */
    var more=[];return ask(POIQ(A),9000).then(function(d){addPois(d,more)},function(){}).then(function(){return done(more.length>t.pois.length?more:t.pois)})},
  function(){
    var pois=[],ways=[],failed=false;
    return ask(POIQ(A),12000).then(function(d){addPois(d,pois)},function(){failed=true;st("nomap")})
    .then(function(){
      /* kaartdienst onbereikbaar: de zaak komt op een getekende plattegrond rond de speler (shared/plan.js); gps en afstanden blijven echt */
      if(failed&&MW.Plan){var v=MW.Plan.city(MW.Plan.seedOf(lat,lon),R);return{origin:origin,cached:false,virt:true,pois:v.pois,ways:v.ways,later:Promise.resolve(null)}}
      var later=streets(lat,lon,R,xy).then(function(ws){ws.forEach(function(w){ways.push(w)});save(pois,ways);return ways}).catch(function(){save(pois,[]);return null});
      return{origin:origin,cached:false,pois:pois,ways:ways,later:later}})})}
function streets(lat,lon,R,xy){return ask('[out:json][timeout:25];way(around:'+(R+150)+','+lat+','+lon+')[highway~"^(residential|tertiary|secondary|primary|unclassified|living_street|pedestrian|footway|path|cycleway|service)$"];out geom qt;',45000).then(function(d){var ws=[];
  (d.elements||[]).forEach(function(e){if(!e.geometry)return;var p=[];e.geometry.forEach(function(g){var q=xy(g.lat,g.lon);p.push(Math.round(q[0]),Math.round(q[1]))});var h=(e.tags&&e.tags.highway)||"";ws.push({p:p,w:/primary|secondary|tertiary/.test(h)?3:/footway|path|cycleway/.test(h)?1:2,n:(e.tags&&e.tags.name)||""})});return ws})}
/* locate(cb(err,pos)) met nette foutafhandeling */
function locate(){return new Promise(function(res,rej){if(!navigator.geolocation)return rej("nogps");navigator.geolocation.getCurrentPosition(function(p){res(p)},function(){rej("denied")},{enableHighAccuracy:true,timeout:20000})})}
/* oefenwereld: een fictief stuk Londen rond de rivier. names = [[type,naam],...] (13 stuks) per taal.
   Vlakken (water, park) zitten als ways met w:"water"/"park" (gesloten polygoon) zodat ze meegaan in cache en opslag. */
function demoWorld(names){
  var ways=[],line=function(p,w,n){ways.push({p:p,w:w,n:n||""})};
  // rivier: band van west naar oost, licht slingerend, ten zuiden van de speler
  var top=[],bot=[];for(var x=-1300;x<=1300;x+=50){var cy=330+110*Math.sin(x/520)+30*Math.sin(x/170);top.push(x,Math.round(cy-70));bot.unshift(x,Math.round(cy+70))}
  ways.push({p:top.concat(bot),w:"water",n:"Thames"});
  // parken
  ways.push({p:[-1050,-420,-520,-440,-500,-130,-1040,-110],w:"park",n:""});
  ways.push({p:[520,-760,930,-740,960,-470,560,-450],w:"park",n:""});
  ways.push({p:[-900,620,-480,600,-470,860,-890,880],w:"park",n:""});
  // hoofdstraten noord van de rivier
  line([-1300,-80,-700,-90,-350,-80,0,-70,380,-80,750,-60,1300,-70],3,"Strand Lane");
  line([-1300,-430,-520,-440,0,-420,560,-450,1300,-440],3,"Oxbridge Street");
  line([-700,-430,-350,-260,0,-70],3,"Shaftesbury Row");
  // zijstraten noord
  [-700,-350,0,380,750].forEach(function(x){line([x,-900,x,-440,x,-80,x,180],2,"")});
  [-1050,-520,190,560,930].forEach(function(x){line([x,-900,x,-440],1,"")});
  line([-1300,-700,1300,-700],2,"Nightingale Road");
  line([-350,-260,380,-260],1,"Lantern Mews");line([-180,-80,-180,180],1,"");line([190,-80,190,180],1,"");
  // kade langs het water
  var q=[];for(x=-1300;x<=1300;x+=100){cy=330+110*Math.sin(x/520)+30*Math.sin(x/170);q.push(x,Math.round(cy-100))}line(q,2,"Embankment");
  q=[];for(x=-1300;x<=1300;x+=100){cy=330+110*Math.sin(x/520)+30*Math.sin(x/170);q.push(x,Math.round(cy+100))}line(q,2,"Southbank Walk");
  // bruggen
  [[-350,"Lantern Bridge"],[380,"Nightingale Bridge"],[930,"Ironmonger Bridge"]].forEach(function(b){var x=b[0],cy=330+110*Math.sin(x/520)+30*Math.sin(x/170);line([x,Math.round(cy-130),x,Math.round(cy+130)],4,b[1])});
  // zuid van de rivier
  line([-1300,600,-480,600,0,580,560,600,1300,590],3,"Borough Road");
  line([-1300,880,1300,870],2,"Kennington Lane");
  [-350,0,380,930].forEach(function(x){line([x,420,x,600,x,880,x,1100],2,"")});
  [-700,190,750].forEach(function(x){line([x,600,x,880],1,"")});
  // rotonde / circus bij de speler
  var c=[];for(var a=0;a<=360;a+=20){var t=a*Math.PI/180;c.push(Math.round(55*Math.cos(t)),Math.round(-70+55*Math.sin(t)))}line(c,2,"Piccadilly Circle");
  // plekken
  var L=[[-350,230],[190,-250],[-180,-430],[560,-40],[520,-420],[-520,-90],[-560,-280],[380,-460],[-350,-430],[0,590],[380,80],[380,600],[-480,470]];
  return{ways:ways,pois:L.map(function(l,i){var nm=names[i]||["hoek",""];return{x:l[0],y:l[1],type:nm[0],name:nm[1]}})}}
/* pickSpots(pois,ways,R,n,r) → n goed gespreide plekken binnen R; vult aan met straathoeken ("hoek") op echte wegen */
function pickSpots(pois,ways,R,n,r,cornerLabel){
  var far=function(p,l,m){return l.every(function(q){return Math.hypot(q.x-p.x,q.y-p.y)>=m})},min=Math.max(90,R*.24),ch=[];
  var cand=shuffle(pois.filter(function(p){var d=Math.hypot(p.x,p.y);return d>70&&d<=R}),r).sort(function(a,b){return PRI.indexOf(a.type)-PRI.indexOf(b.type)});
  for(var pass=0;pass<2&&ch.length<n;pass++)for(var i=0;i<cand.length&&ch.length<n;i++){var p=cand[i],k=ch.filter(function(q){return q.type===p.type}).length;if(ch.indexOf(p)>=0||k>pass||(p.type==="bankje"&&pass===0&&cand.length>12))continue;if(far(p,ch,min))ch.push(p)}
  var nodes=[];ways.forEach(function(w){if(typeof w.w!=="number")return;for(var i=0;i<w.p.length;i+=2)nodes.push([w.p[i],w.p[i+1],w.n])});
  for(var t=0;ch.length<n&&t<600;t++){if(t%80===79)min*=.8;var a=r()*6.283,d=R*(.4+.55*r()),q={x:Math.cos(a)*d,y:Math.sin(a)*d,type:"hoek",name:""},b=null,bd=140;
    for(var j=0;j<nodes.length;j++){var dd=Math.hypot(nodes[j][0]-q.x,nodes[j][1]-q.y);if(dd<bd){bd=dd;b=nodes[j]}}if(b){q.x=b[0];q.y=b[1];if(b[2])q.name=(cornerLabel||"Hoek")+" "+b[2]}
    if(far(q,ch,min))ch.push(q)}
  return ch.map(function(p){return{x:Math.round(p.x),y:Math.round(p.y),type:p.type,name:p.name||""}})}

/* ---------- kaart ---------- */
function ghost(c,x,y,s,col,al){c.save();c.globalAlpha=al;
  var h=c.createRadialGradient(x,y,s*.1,x,y,s*.85);h.addColorStop(0,"rgba(147,166,198,.28)");h.addColorStop(1,"rgba(147,166,198,0)");c.fillStyle=h;c.beginPath();c.arc(x,y,s*.85,0,7);c.fill();
  c.fillStyle="rgba(4,7,12,.6)";c.beginPath();c.ellipse(x+s*.22,y+s*.52,s*.5,s*.09,-.12,0,7);c.fill();
  c.fillStyle="#05080e";c.strokeStyle=col;c.lineWidth=Math.max(1,s*.035);c.lineJoin="round";
  c.beginPath();c.moveTo(x-s*.09,y-s*.3);c.lineTo(x-s*.24,y-s*.24);c.lineTo(x-s*.3,y+s*.5);c.lineTo(x+s*.3,y+s*.5);c.lineTo(x+s*.24,y-s*.24);c.lineTo(x+s*.09,y-s*.3);c.closePath();c.fill();c.stroke();
  c.beginPath();c.arc(x,y-s*.4,s*.13,0,7);c.fill();c.stroke();
  c.beginPath();c.moveTo(x-s*.27,y-s*.47);c.lineTo(x+s*.27,y-s*.47);c.lineTo(x+s*.27,y-s*.52);c.lineTo(x+s*.14,y-s*.53);c.lineTo(x+s*.12,y-s*.7);c.lineTo(x-s*.12,y-s*.7);c.lineTo(x-s*.14,y-s*.53);c.lineTo(x-s*.27,y-s*.52);c.closePath();c.fill();c.stroke();
  c.fillStyle=col;c.beginPath();c.arc(x-s*.05,y-s*.41,s*.022,0,7);c.arc(x+s*.05,y-s*.41,s*.022,0,7);c.fill();c.restore()}
/* icon(cx,kind,X,Y,size,col): sprekende pictogrammen voor spoortypes */
function icon(c,kind,X,Y,s,col){c.save();c.translate(X,Y);c.scale(s/24,s/24);c.strokeStyle=col;c.fillStyle=col;c.lineWidth=2.2;c.lineCap="round";c.lineJoin="round";
  if(kind==="cam"){c.beginPath();c.roundRect?c.roundRect(-10,-6,20,14,2):c.rect(-10,-6,20,14);c.stroke();c.beginPath();c.moveTo(-4,-6);c.lineTo(-2,-10);c.lineTo(2,-10);c.lineTo(4,-6);c.stroke();c.beginPath();c.arc(0,1,4.2,0,7);c.stroke();c.beginPath();c.arc(6.5,-3,1.2,0,7);c.fill()}
  else if(kind==="msg"){c.beginPath();c.moveTo(-10,-8);c.lineTo(10,-8);c.lineTo(10,4);c.lineTo(-2,4);c.lineTo(-7,9);c.lineTo(-6,4);c.lineTo(-10,4);c.closePath();c.stroke();c.beginPath();c.moveTo(-5,-3);c.lineTo(5,-3);c.moveTo(-5,1);c.lineTo(2,1);c.stroke()}
  else if(kind==="obj"){c.beginPath();c.arc(-2,-2,6.5,0,7);c.stroke();c.beginPath();c.moveTo(3,3);c.lineTo(9,9);c.lineWidth=3.2;c.stroke()}
  else if(kind==="time"){c.beginPath();c.arc(0,0,9.5,0,7);c.stroke();c.beginPath();c.moveTo(0,-5);c.lineTo(0,0.5);c.lineTo(4,3);c.stroke();c.beginPath();c.arc(0,0,1.2,0,7);c.fill()}
  else if(kind==="open"){c.beginPath();c.roundRect?c.roundRect(-6,-11,12,22,2.5):c.rect(-6,-11,12,22);c.stroke();c.beginPath();c.moveTo(-2,8);c.lineTo(2,8);c.stroke();c.beginPath();c.moveTo(-3,-5);c.lineTo(3,-5);c.moveTo(-3,-1);c.lineTo(1,-1);c.stroke()}
  else if(kind==="epi"){c.beginPath();c.moveTo(0,10);c.bezierCurveTo(-9,0,-9,-10,0,-10);c.bezierCurveTo(9,-10,9,0,0,10);c.stroke();c.beginPath();c.arc(0,-3,3,0,7);c.fill()}
  else if(kind==="echo"){c.beginPath();for(var i=0;i<8;i++){var a=i*Math.PI/4,r=i%2?4:11;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath();c.fill()}
  else if(kind==="check"){c.beginPath();c.moveTo(-7,0);c.lineTo(-2,5);c.lineTo(8,-6);c.lineWidth=3;c.stroke()}
  c.restore()}
/* badge(cx,X,Y,kind,col,alpha,done): rond plaatje met pictogram, zoals de spelden op de kaart */
function badge(c,X,Y,kind,col,al,done){c.save();c.globalAlpha=al;
  if(!done){c.shadowColor=col;c.shadowBlur=14}c.fillStyle="#101a2b";c.beginPath();c.arc(X,Y,16,0,7);c.fill();c.strokeStyle=col;c.lineWidth=2.5;c.stroke();
  icon(c,done?"check":kind,X,Y,22,done?"#5f7090":col);c.restore()}

/* createMap(canvas,{player:()=>P, ways:()=>W, R:()=>R, items:()=>[{x,y,draw(cx,X,Y,t,api)}], onTap(hit,worldXY), theme:{bg,road,…} (optioneel: eigen kaartkleuren per spel)}) */
function createMap(cv,o){var TH={bg:"#101a2b",water:"#0c2036",waterEdge:"#1f4a6e",ripple:"rgba(95,143,176,.18)",park:"#14302a",parkEdge:"#1f4a3c",river:"#173f5c",major:"#4a5b79",minor:"#22324f",road:"#2c3f62",label:"#5f8fb0",waterLabel:"#3f7ca8",ring:"rgba(147,166,198,.25)",me:"#f0a63a",meHalo:"rgba(240,166,58,.12)",meRing:"rgba(240,166,58,.5)",font:"600 12px 'Barlow Condensed','Arial Narrow',sans-serif"},tk;if(o.theme)for(tk in o.theme)TH[tk]=o.theme[tk];var cx=cv.getContext("2d"),dpr=1,cw=0,ch=0,V={s:.5,ox:0,oy:0,follow:true},still=matchMedia("(prefers-reduced-motion: reduce)").matches,pd=null;
  function resize(){dpr=window.devicePixelRatio||1;cw=cv.clientWidth;ch=cv.clientHeight;cv.width=cw*dpr;cv.height=ch*dpr}
  addEventListener("resize",resize);
  var P=function(){return o.player()},sx=function(x){return(x-(V.follow?P().x:V.ox))*V.s+cw/2},sy=function(y){return(y-(V.follow?P().y:V.oy))*V.s+ch/2};
  var api={V:V,sx:sx,sy:sy,ghost:ghost,still:still,cx:cx,resize:resize,fit:function(R){V.follow=true;V.s=Math.min(innerWidth,innerHeight)/(R*1.5)},zoom:function(f){V.s=Math.min(4,Math.max(.1,V.s*f))},follow:function(){V.follow=true},
    size:function(){return[cw,ch]}};
  /* tweede weergave: de plattegrond (shared/plan.js); vanzelf aan als er geen straten zijn of de stad getekend is */
  var PV=MW.Plan?MW.Plan.ctl({W:function(){return o.ways()},th:TH,toast:function(m){toast(m)}}):null;if(PV)PV.mount();
  api.plan=function(){return !!(PV&&PV.on())};
  api.draw=function(t){var W=o.ways(),p=P(),pl=PV&&PV.on(),A=pl?{sx:sx,sy:sy,s:V.s,cw:cw,ch:ch,t:t,P:p,R:o.R(),spots:o.spots?o.spots():o.items().filter(function(it){return it.ref&&it.tap!==false}),top:(function(){var h=document.getElementById("hud");return h?h.getBoundingClientRect().height:56})()}:null;
    cx.setTransform(dpr,0,0,dpr,0,0);cx.fillStyle=TH.bg;cx.fillRect(0,0,cw,ch);cx.lineCap="round";cx.lineJoin="round";
    var i,w,k,X,Y;if(pl){PV.bg(cx,A);W=[]}
    for(i=0;i<W.length;i++){w=W[i];if(w.w!=="water"&&w.w!=="park")continue;cx.beginPath();for(k=0;k<w.p.length;k+=2){X=sx(w.p[k]);Y=sy(w.p[k+1]);k?cx.lineTo(X,Y):cx.moveTo(X,Y)}cx.closePath();
      cx.fillStyle=w.w==="water"?TH.water:TH.park;cx.fill();if(!w.ns){cx.strokeStyle=w.w==="water"?TH.waterEdge:TH.parkEdge;cx.lineWidth=Math.max(1,2*V.s);cx.stroke()}
      if(w.w==="water"&&V.s>.25){cx.save();cx.clip();cx.strokeStyle=TH.ripple;cx.lineWidth=1;for(var r=0;r<6;r++){cx.beginPath();for(k=0;k<w.p.length/2;k+=2){X=sx(w.p[k]);Y=sy(w.p[k+1])+(r+1)*22*V.s+Math.sin((w.p[k]+t/40)/60)*3*V.s;k?cx.lineTo(X,Y):cx.moveTo(X,Y)}cx.stroke()}cx.restore()}}
    for(i=0;i<W.length;i++){w=W[i];if(typeof w.w!=="number")continue;cx.strokeStyle=w.w===9?TH.river:w.w===4?TH.major:w.w===1?TH.minor:TH.road;cx.lineWidth=Math.max(1.2,(w.w===9?30:w.w===4?11:w.w===3?9:w.w===2?6:2.5)*V.s);cx.beginPath();for(k=0;k<w.p.length;k+=2){X=sx(w.p[k]);Y=sy(w.p[k+1]);k?cx.lineTo(X,Y):cx.moveTo(X,Y)}cx.stroke();
      if(w.w===4){cx.strokeStyle=TH.bg;cx.lineWidth=Math.max(1,7*V.s);cx.setLineDash([4*V.s,6*V.s]);cx.stroke();cx.setLineDash([])}}
    cx.font="italic 12px Georgia,serif";cx.textAlign="center";cx.fillStyle=TH.label;for(i=0;i<W.length;i++){w=W[i];if((w.w===9||w.w==="water"||w.w===4)&&w.n&&V.s>.3){var m=Math.floor(w.p.length/4)*2;if(w.w==="water"){var n2=w.p.length/2;m=Math.floor(n2/4)*2;cx.save();cx.font="italic 15px Georgia,serif";cx.fillStyle=TH.waterLabel;cx.fillText(w.n,sx(w.p[m]),sy(w.p[m+1])+70*V.s);cx.restore()}else cx.fillText(w.n,sx(w.p[m]),sy(w.p[m+1])+4)}}
    cx.strokeStyle=TH.ring;cx.setLineDash([4,8]);cx.lineWidth=1;cx.beginPath();cx.arc(sx(0),sy(0),o.R()*V.s,0,7);cx.stroke();cx.setLineDash([]);
    cx.font=TH.font;cx.textAlign="center";
    o.items().forEach(function(it){it.draw(cx,sx(it.x),sy(it.y),t,api)});
    var X=sx(p.x),Y=sy(p.y);cx.fillStyle=TH.meHalo;cx.beginPath();cx.arc(X,Y,35*V.s,0,7);cx.fill();cx.strokeStyle=TH.meRing;cx.lineWidth=1;cx.stroke();
    cx.fillStyle=TH.me;cx.beginPath();cx.arc(X,Y,7,0,7);cx.fill();cx.strokeStyle=TH.bg;cx.lineWidth=2;cx.stroke();
    if(pl){cx.lineCap="butt";PV.fg(cx,A)}
    if(MW.Tiles)MW.Tiles.credit(cx,cw,ch,TH.label,o.ways())};
  cv.addEventListener("pointerdown",function(e){pd={x:e.clientX,y:e.clientY,ox:V.follow?P().x:V.ox,oy:V.follow?P().y:V.oy,drag:false};try{cv.setPointerCapture(e.pointerId)}catch(err){}});
  cv.addEventListener("pointermove",function(e){if(!pd)return;var dx=e.clientX-pd.x,dy=e.clientY-pd.y;if(!pd.drag&&Math.hypot(dx,dy)>8)pd.drag=true;if(pd.drag){V.follow=false;V.ox=pd.ox-dx/V.s;V.oy=pd.oy-dy/V.s}});
  cv.addEventListener("pointerup",function(e){if(!pd)return;if(!pd.drag){var b=cv.getBoundingClientRect(),mx=e.clientX-b.left,my=e.clientY-b.top,hit=null;
    o.items().forEach(function(it){if(it.tap!==false&&Math.hypot(sx(it.x)-mx,sy(it.y)-my)<30)hit=it});
    var wx=(mx-cw/2)/V.s+(V.follow?P().x:V.ox),wy=(my-ch/2)/V.s+(V.follow?P().y:V.oy);o.onTap&&o.onTap(hit,{x:wx,y:wy})}pd=null});
  resize();return api}

/* ---------- gps ---------- */
var watchId=null;
function watch(origin,P,onMove){stopWatch();if(!navigator.geolocation)return;
  watchId=navigator.geolocation.watchPosition(function(p){var x=(p.coords.longitude-origin.lon)*origin.kx,y=-(p.coords.latitude-origin.lat)*origin.ky,d=Math.hypot(x-P.x,y-P.y);if(d>3){P.x=x;P.y=y}P.acc=p.coords.accuracy||0;onMove&&onMove(d)},function(){},{enableHighAccuracy:true,maximumAge:2000});
  try{navigator.wakeLock&&navigator.wakeLock.request("screen").catch(function(){})}catch(e){}}
function stopWatch(){if(watchId!=null&&navigator.geolocation){navigator.geolocation.clearWatch(watchId)}watchId=null}

/* ---------- ui: vellen, toast, laadscherm, geluid ---------- */
function toast(t){var e=$("#toast");if(!e)return;e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){e.hidden=true},2600)}
function sheet(html,lock){var b=$("#sheetBody");b.onclick=null;b.innerHTML=html;$("#sheet").hidden=false;b.scrollTop=0;if(lock)$("#sheet").dataset.lock="1";else delete $("#sheet").dataset.lock;return b}
function closeSheet(){var b=$("#sheetBody");if(b)b.onclick=null;$("#sheet").hidden=true;delete $("#sheet").dataset.lock}
function loading(txt){var l=$("#load");if(!l)return;l.hidden=!txt;if(txt)$("#loadT").textContent=txt}
function buzz(p){try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}}
var AC=null,sndOn=LS.get("ss_snd",true);
function beep(f,d){if(!sndOn)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();var o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;o.type="triangle";g.gain.value=.08;g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d)}catch(e){}}
function sound(v){if(v===undefined)return sndOn;sndOn=!!v;LS.set("ss_snd",sndOn);return sndOn}
document.addEventListener("DOMContentLoaded",function(){var s=$("#sheet");if(s)s.addEventListener("click",function(e){if(e.target.id==="sheet"&&!s.dataset.lock)closeSheet()})});

MW.Walk={icon:icon,badge:badge,rngOf:rngOf,shuffle:shuffle,PRI:PRI,poiType:poiType,fetchWorld:fetchWorld,locate:locate,demoWorld:demoWorld,pickSpots:pickSpots,createMap:createMap,ghost:ghost,
  watch:watch,stopWatch:stopWatch,toast:toast,sheet:sheet,closeSheet:closeSheet,loading:loading,buzz:buzz,beep:beep,sound:sound};
})();
