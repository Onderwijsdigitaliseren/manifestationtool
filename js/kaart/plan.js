/* Moordwandeling – virtuele plattegrond (gedeeld door alle wandelingen, ook de oude Moordwandeling-motor).
   Als de kaartdienst (OpenStreetMap/Overpass) niet antwoordt, krijgt de zaak een getekende stad rond de speler:
   echte afstanden in meters, echte gps, straten, bouwblokken, een gracht en een park. Is de echte kaart er wel,
   dan blijft hij de standaard en is de plattegrond een tweede weergave achter de knop ▦ (en andersom).
   Losstaand (geen walk.js nodig). Gebruik:
     var v=MW.Plan.city(seed,R)           → {pois,ways,virt:true}  (ways bevat ook w:"block"; de nachtkaart slaat die over)
     var pv=MW.Plan.ctl({W:()=>W, th:{bg,label,water,waterEdge,park,parkEdge,me,font}, toast:fn});
     pv.mount();                           // knop "▦ Plattegrond" / "Kaart" in #zoom
     pv.on()                               // true = teken de plattegrond
     pv.bg(cx,{sx,sy,s,cw,ch,t,R}) vóór de spelfiguren, pv.fg(cx,{sx,sy,s,cw,ch,P}) erna. */
(function(){
"use strict";
var MW=window.MW=window.MW||{};
var LG=(document.documentElement.lang||"en").slice(0,2)==="nl"?"nl":"en";
var X={nl:{plan:"Plattegrond",vak:"Vak",btn:"Plattegrond of kaart",virt:"Geen kaart: je speelt op de plattegrond.",
    noReal:"De kaartdienst gaf geen kaart. Je speelt op de plattegrond.",wait:"De kaart laadt nog.",
    loaded:"De kaart is er. Met de knop rechtsboven wissel je tussen kaart en plattegrond.",toPlan:"Plattegrond",toMap:"Kaart",
    st:["Lindelaan","Kerkstraat","Molenweg","Nieuwe Gracht","Schoolstraat","Raadhuisstraat","Bleekveld","Oude Haven","Wilgenhof","Lange Dijk","Torenstraat","Brouwerssteeg","Kloosterlaan","Veldstraat","Marktstraat","Prinsenkade","Zuiderpad","Beukenlaan","Ketelstraat","Ridderhof","Smidsteeg","Hoogstraat","Vismarkt","Lijnbaan"],
    water:"Stille Gracht",park:"Stadspark",
    nm:{kerk:["Sint-Janskerk","Oude Kerk"],cafe:["Café De Zwaan","Eetcafé Het Anker","Café 't Hoekje"],halte:["Bushalte Marktplein","Bushalte Kerkstraat","Halte Lindelaan"],winkel:["Bakkerij Verhoeven","Buurtsuper","Slijterij De Ton"],
      bankje:["Bankje bij de gracht","Bankje op het plein"],school:["De Regenboog"],bieb:["Bibliotheek"],apotheek:["Apotheek Centrum"],post:["Brievenbus"],bank:["Geldautomaat"],hotel:["Hotel De Kroon"],kunst:["Beeld De Wachter"],park:["Stadspark"]}},
  en:{plan:"Street plan",vak:"Square",btn:"Street plan or map",virt:"No map: you're playing on the street plan.",
    noReal:"The map service sent no map. You're playing on the street plan.",wait:"The map is still loading.",
    loaded:"The map is here. Use the button top right to switch between map and street plan.",toPlan:"Street plan",toMap:"Map",
    st:["Linden Avenue","Church Street","Mill Road","New Canal","School Lane","Town Hall Street","Bleach Field","Old Harbour","Willow Court","Long Dyke","Tower Street","Brewers Alley","Cloister Lane","Field Street","Market Street","Princes Quay","South Path","Beech Avenue","Kettle Street","Knights Court","Smith Alley","High Street","Fish Market","Ropewalk"],
    water:"Still Canal",park:"Town Park",
    nm:{kerk:["St John's Church","Old Church"],cafe:["The Swan","The Anchor","The Corner Café"],halte:["Market Square stop","Church Street stop","Linden Avenue stop"],winkel:["Baker's","Corner Shop","Wine Merchant"],
      bankje:["Bench by the canal","Bench on the square"],school:["Rainbow School"],bieb:["Library"],apotheek:["Town Pharmacy"],post:["Postbox"],bank:["Cash machine"],hotel:["Crown Hotel"],kunst:["The Watchman statue"],park:["Town Park"]}}}[LG];

function rng(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function seedOf(lat,lon){var s=Math.round(lat*1000)+"|"+Math.round(lon*1000),h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}

/* ---------- getekende stad ---------- */
function city(seed,R){
  var r=rng(seed),E=Math.max(900,(R||650)+450),ang=(r()-.5)*.55,ca=Math.cos(ang),sa=Math.sin(ang);
  var W=function(u,v){return[Math.round(u*ca-v*sa),Math.round(u*sa+v*ca)]};
  var lines=function(){var a=[],x=-(r()*60);while(x>-E){a.unshift(Math.round(x));x-=85+r()*80}var y=a[a.length-1];while(y<E){y+=85+r()*80;a.push(Math.round(y))}return a};
  var xs=lines(),ys=lines(),nx=xs.length,ny=ys.length;
  /* gracht: één rij cellen op enige afstand van de start */
  var oi=0,oj=0;xs.forEach(function(q,i){if(q<=0)oi=i});ys.forEach(function(q,j){if(q<=0)oj=j});
  var cj=oj+(r()<.5?-1:1)*(2+Math.floor(r()*2));if(cj<1)cj=oj+3;if(cj>ny-3)cj=oj-3;
  /* park: blok van 2×2 cellen, niet bij de start en niet aan de gracht */
  var pi=oi+(r()<.5?-3:2),pj=oj+(cj>oj?-3:2);pi=Math.max(1,Math.min(nx-3,pi));pj=Math.max(1,Math.min(ny-3,pj));
  var inPark=function(i,j){return i>=pi&&i<pi+2&&j>=pj&&j<pj+2},inCanal=function(j){return j===cj};
  var main={},k;for(k=0;k<nx;k++)if(((k-oi)%4+4)%4===0)main["x"+k]=1;for(k=0;k<ny;k++)if(((k-oj)%4+4)%4===2)main["y"+k]=1;
  var names=X.st.slice(),name=function(){return names.length?names.splice(Math.floor(r()*names.length),1)[0]:""};
  var ways=[];
  /* water en park eerst (vlakken) */
  var c0=ys[cj]+10,c1=ys[cj+1]-10;ways.push({w:"water",n:X.water,p:[].concat(W(-E,c0),W(E,c0),W(E,c1),W(-E,c1))});
  var u0=xs[pi]+9,u1=xs[pi+2]-9,v0=ys[pj]+9,v1=ys[pj+2]-9;ways.push({w:"park",n:X.park,p:[].concat(W(u0,v0),W(u1,v0),W(u1,v1),W(u0,v1))});
  /* bouwblokken: per cel, soms in tweeën */
  for(var i=0;i<nx-1;i++)for(var j=0;j<ny-1;j++){if(inCanal(j)||inPark(i,j))continue;
    var a0=xs[i]+9,a1=xs[i+1]-9,b0=ys[j]+9,b1=ys[j+1]-9,blk=function(p,q,s,t){ways.push({w:"block",p:[].concat(W(p,s),W(q,s),W(q,t),W(p,t))})};
    if(a1-a0>110&&r()<.55){var m=a0+(a1-a0)*(.4+r()*.2);blk(a0,m-3,b0,b1);blk(m+3,a1,b0,b1)}
    else if(b1-b0>110&&r()<.55){var m2=b0+(b1-b0)*(.4+r()*.2);blk(a0,a1,b0,m2-3);blk(a0,a1,m2+3,b1)}
    else blk(a0,a1,b0,b1)}
  /* straten: lijnen door het raster, met gaten voor gracht en park; elke derde kruising over de gracht is een brug */
  var push=function(seg,wd,n){if(seg.length>=4)ways.push({w:wd,n:n,p:seg})};
  for(i=0;i<nx;i++){var nmx=name(),wd=main["x"+i]?3:2,seg=[];
    for(j=0;j<ny-1;j++){var gap=inCanal(j)||(i>pi&&i<pi+2&&j>=pj&&j<pj+2);
      if(gap){push(seg,wd,nmx);seg=[];if(inCanal(j)&&(main["x"+i]||((i-oi)%3+3)%3===1))ways.push({w:4,n:"",p:[].concat(W(xs[i],ys[j]),W(xs[i],ys[j+1]))});continue}
      if(!seg.length)seg=W(xs[i],ys[j]);seg=seg.concat(W(xs[i],ys[j+1]))}push(seg,wd,nmx)}
  for(j=0;j<ny;j++){var nmy=name(),wy=main["y"+j]?3:2,sg=[];
    for(i=0;i<nx-1;i++){var gp=j>pj&&j<pj+2&&i>=pi&&i<pi+2;if(gp){push(sg,wy,nmy);sg=[];continue}if(!sg.length)sg=W(xs[i],ys[j]);sg=sg.concat(W(xs[i+1],ys[j]))}push(sg,wy,nmy)}
  /* parkpaden */
  var pm=(xs[pi]+xs[pi+2])/2,qm=(ys[pj]+ys[pj+2])/2;ways.push({w:1,n:"",p:[].concat(W(xs[pi],ys[pj]),W(pm,qm),W(xs[pi+2],ys[pj+2]))});ways.push({w:1,n:"",p:[].concat(W(xs[pi+2],ys[pj]),W(pm,qm),W(xs[pi],ys[pj+2]))});
  /* plekken: op hoeken van blokken, binnen R */
  var TY=["kerk","cafe","halte","winkel","bankje","school","bieb","apotheek","post","cafe","halte","winkel","bank","hotel","kunst","bankje"],used={},pois=[];
  var cand=[];for(i=1;i<nx-1;i++)for(j=1;j<ny-1;j++){if(inCanal(j)||inCanal(j-1))continue;var q=W(xs[i]+(r()<.5?14:-14),ys[j]+(r()<.5?14:-14)),d=Math.hypot(q[0],q[1]);if(d>70&&d<=(R||650))cand.push(q)}
  for(i=cand.length-1;i>0;i--){var jj=Math.floor(r()*(i+1)),tt=cand[i];cand[i]=cand[jj];cand[jj]=tt}
  cand.slice(0,TY.length).forEach(function(q,n){var ty=TY[n],l=X.nm[ty]||[""],u=used[ty]=(used[ty]||0)+1;pois.push({x:q[0],y:q[1],type:ty,name:l[(u-1)%l.length]})});
  var pc=W(pm,ys[pj]-14);if(Math.hypot(pc[0],pc[1])<=(R||650))pois.push({x:pc[0],y:pc[1],type:"park",name:X.park});
  return{pois:pois,ways:ways,virt:true}}

/* ---------- kleuren ---------- */
function rgb(c){if(!c)return[128,128,128];c=String(c).trim();var m=c.match(/^#([0-9a-f]{3,8})$/i);if(m){var h=m[1];if(h.length===3)h=h.split("").map(function(x){return x+x}).join("");return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
  m=c.match(/rgba?\(([^)]+)\)/);if(m){var p=m[1].split(",").map(parseFloat);return[p[0],p[1],p[2]]}return[128,128,128]}
function mix(a,b,t,al){var A=rgb(a),B=rgb(b),o=[0,1,2].map(function(i){return Math.round(A[i]+(B[i]-A[i])*t)});return al==null?"rgb("+o.join(",")+")":"rgba("+o.join(",")+","+al+")"}
function light(c){var A=rgb(c);return(A[0]*.3+A[1]*.59+A[2]*.11)>128}

/* ---------- weergave ---------- */
function ctl(o){var th=o.th||{},pref=null,cache={w:null,n:-1,virt:false,str:false},was=null,shown=null,btn=null;
  try{pref=localStorage.getItem("ss_plan")}catch(e){}
  function info(){var W=o.W()||[];if(W!==cache.w||W.length!==cache.n){var v=false,s=false;for(var i=0;i<W.length;i++){if(W[i].w==="block")v=true;else if(typeof W[i].w==="number")s=true}cache={w:W,n:W.length,virt:v,str:s}}return cache}
  function forced(){var c=info();return c.virt||!c.str}
  function on(){var f=forced(),res=f||pref==="plan";
    if(was!==null&&was!==res){if(was&&!res&&!info().virt&&o.toast)o.toast(X.loaded)}
    var c=info();if(c.virt&&shown!==c.w){shown=c.w;if(o.toast)setTimeout(function(){o.toast(X.virt)},400)}
    was=res;ui(res);return res}
  /* de knop zegt waar hij naartoe wisselt: op de kaart "▦ Plattegrond", op de plattegrond "Kaart" (zonder echte kaart gedimd) */
  function ui(res){if(!btn)return;var c=info(),lab=res?X.toMap:"▦ "+X.toPlan;btn.setAttribute("aria-pressed",res?"true":"false");
    var dim=res&&(c.virt||!c.str),key=lab+(dim?"·":"");if(btn.dataset.k!==key){btn.dataset.k=key;btn.innerHTML=dim?'<span style="opacity:.5">'+lab+'</span>':lab}btn.title=res?X.toMap:X.toPlan}
  function mount(){var z=document.getElementById("zoom");if(!z||document.getElementById("zPlan"))return;btn=document.createElement("button");btn.type="button";btn.id="zPlan";btn.textContent="▦ "+X.toPlan;btn.setAttribute("aria-label",X.btn);
    var bs=btn.style;bs.width="auto";bs.minWidth="42px";bs.padding="0 11px";bs.alignSelf="flex-end";bs.whiteSpace="nowrap";bs.fontSize="13px";bs.lineHeight="1";bs.letterSpacing=".02em";
    var me=document.getElementById("zMe");if(me&&me.nextSibling)z.insertBefore(btn,me.nextSibling);else z.appendChild(btn);
    btn.onclick=function(){var c=info();if(c.virt){o.toast&&o.toast(X.noReal);return}if(!c.str){o.toast&&o.toast(X.wait);return}
      pref=pref==="plan"?"map":"plan";try{localStorage.setItem("ss_plan",pref)}catch(e){}was=null;o.toast&&o.toast(pref==="plan"?X.toPlan:X.toMap)}}
  function wx(a,X0){return(X0-a.cw/2)/a.s+(-(a.sx(0)-a.cw/2)/a.s)}
  function wy(a,Y0){return(Y0-a.ch/2)/a.s+(-(a.sy(0)-a.ch/2)/a.s)}
  function poly(cx,a,p){cx.beginPath();for(var k=0;k<p.length;k+=2){var X0=a.sx(p[k]),Y0=a.sy(p[k+1]);k?cx.lineTo(X0,Y0):cx.moveTo(X0,Y0)}}
  function bg(cx,a){var W=o.W()||[],c=info(),B=th.bg||"#0c0a0b",LB=th.label||"#b8aca0",lt=light(B),s=a.s,i,w;
    var base=mix(B,LB,lt?.05:.035),ink=mix(B,lt?"#000":LB,lt?.55:.5),inkS=mix(B,lt?"#000":LB,lt?.32:.3);
    cx.fillStyle=base;cx.fillRect(0,0,a.cw,a.ch);
    /* raster: 50 m fijn, 250 m vet (zoals een stadsatlas) */
    var x0=wx(a,0),x1=wx(a,a.cw),y0=wy(a,0),y1=wy(a,a.ch),step=s<.25?250:50,g;
    cx.lineWidth=1;for(g=Math.floor(x0/step)*step;g<=x1;g+=step){var maj=g%250===0;cx.strokeStyle=mix(B,LB,maj?(lt?.16:.12):(lt?.07:.05));cx.beginPath();cx.moveTo(Math.round(a.sx(g))+.5,0);cx.lineTo(Math.round(a.sx(g))+.5,a.ch);cx.stroke()}
    for(g=Math.floor(y0/step)*step;g<=y1;g+=step){var mj=g%250===0;cx.strokeStyle=mix(B,LB,mj?(lt?.16:.12):(lt?.07:.05));cx.beginPath();cx.moveTo(0,Math.round(a.sy(g))+.5);cx.lineTo(a.cw,Math.round(a.sy(g))+.5);cx.stroke()}
    /* vlakken */
    for(i=0;i<W.length;i++){w=W[i];if(w.w==="water"){poly(cx,a,w.p);cx.closePath();cx.fillStyle=mix(B,th.waterEdge||"#3a5a78",lt?.35:.3);cx.fill();cx.save();cx.clip();cx.strokeStyle=mix(B,th.waterEdge||"#3a5a78",lt?.6:.55,.6);cx.lineWidth=1;
        for(var h=-a.ch;h<a.cw+a.ch;h+=9){cx.beginPath();cx.moveTo(h,0);cx.lineTo(h-a.ch,a.ch);cx.stroke()}cx.restore();if(!w.ns){poly(cx,a,w.p);cx.closePath();cx.strokeStyle=ink;cx.lineWidth=1.4;cx.stroke()}}
      else if(w.w==="park"){poly(cx,a,w.p);cx.closePath();cx.fillStyle=mix(B,th.parkEdge||"#3a5a3a",lt?.35:.32);cx.fill();cx.save();cx.clip();cx.fillStyle=mix(B,th.parkEdge||"#3a5a3a",lt?.75:.7);var sp=Math.max(10,22*s*2);
        for(var gx=Math.floor(a.sx(-2000)%sp);gx<a.cw;gx+=sp)for(var gy=Math.floor(a.sy(-2000)%sp);gy<a.ch;gy+=sp){cx.beginPath();cx.arc(gx+((gy/sp)%2?sp/2:0),gy,Math.max(1.4,3.2*s*2),0,7);cx.fill()}cx.restore();if(!w.ns){poly(cx,a,w.p);cx.closePath();cx.strokeStyle=ink;cx.lineWidth=1;cx.stroke()}}}
    /* bouwblokken met een schaduwrand */
    if(c.virt){var sh=mix(B,"#000",lt?.18:.4),bf=mix(B,LB,lt?.18:.16);
      for(i=0;i<W.length;i++){w=W[i];if(w.w!=="block")continue;cx.save();cx.translate(2,2);poly(cx,a,w.p);cx.closePath();cx.fillStyle=sh;cx.fill();cx.restore();
        poly(cx,a,w.p);cx.closePath();cx.fillStyle=bf;cx.fill();cx.strokeStyle=inkS;cx.lineWidth=1;cx.stroke();
        if(s>.7){cx.save();cx.clip();cx.strokeStyle=mix(B,LB,lt?.24:.17);cx.lineWidth=1;var bx=a.sx(w.p[0]),by=a.sy(w.p[1]);for(var q=-300;q<300;q+=7){cx.beginPath();cx.moveTo(bx+q,by-150);cx.lineTo(bx+q+150,by+150);cx.stroke()}cx.restore()}}}
    /* straten */
    for(i=0;i<W.length;i++){w=W[i];if(typeof w.w!=="number")continue;var lw=(w.w===4?12:w.w===3?13:w.w===2?9:w.w===9?28:3)*s;
      if(w.w===1){cx.strokeStyle=ink;cx.lineWidth=1;cx.setLineDash([3,4]);poly(cx,a,w.p);cx.stroke();cx.setLineDash([]);continue}
      if(c.virt&&w.w!==4){if(w.w===3){cx.strokeStyle=mix(B,LB,lt?.02:.07);cx.lineWidth=Math.max(2,lw);poly(cx,a,w.p);cx.stroke()}continue}
      cx.strokeStyle=ink;cx.lineWidth=Math.max(2.4,lw+2.4);poly(cx,a,w.p);cx.stroke();cx.strokeStyle=w.w===4?mix(B,LB,lt?.08:.1):base;cx.lineWidth=Math.max(1,lw);poly(cx,a,w.p);cx.stroke()}
    /* geen straten bekend: een geschetste route van de start langs de plekken (dichtstbijzijnde eerst) */
    if(!c.str&&a.spots&&a.spots.length){var left=a.spots.slice(),cur={x:0,y:0};cx.strokeStyle=ink;cx.lineWidth=1.6;cx.setLineDash([2,6]);cx.beginPath();cx.moveTo(a.sx(0),a.sy(0));
      while(left.length){var bi=0,bd=1e12;left.forEach(function(p,n){var d=Math.hypot(p.x-cur.x,p.y-cur.y);if(d<bd){bd=d;bi=n}});cur=left.splice(bi,1)[0];cx.lineTo(a.sx(cur.x),a.sy(cur.y))}cx.stroke();cx.setLineDash([])}
    /* straatnamen langs de straat, elke naam één keer */
    if(s>.38){var seen={},nmc=0;cx.save();cx.font="italic "+(s>.9?13:11)+"px Georgia,serif";cx.fillStyle=mix(B,LB,lt?.75:.62);cx.textAlign="center";cx.textBaseline="middle";
      for(i=0;i<W.length&&nmc<40;i++){w=W[i];if(typeof w.w!=="number"||!w.n||seen[w.n]||w.w===1)continue;var best=-1,bl=0;for(var k=0;k+3<w.p.length;k+=2){var l=Math.hypot(w.p[k+2]-w.p[k],w.p[k+3]-w.p[k+1]);if(l>bl){bl=l;best=k}}
        if(best<0||bl*s<70)continue;var mx=(w.p[best]+w.p[best+2])/2,my=(w.p[best+1]+w.p[best+3])/2,X0=a.sx(mx),Y0=a.sy(my);if(X0<-50||X0>a.cw+50||Y0<-20||Y0>a.ch+20)continue;
        var an=Math.atan2(w.p[best+3]-w.p[best+1],w.p[best+2]-w.p[best]);if(an>Math.PI/2)an-=Math.PI;if(an<-Math.PI/2)an+=Math.PI;seen[w.n]=1;nmc++;
        cx.save();cx.translate(X0,Y0);cx.rotate(an);if(c.virt){cx.fillText(w.n,0,0)}else{cx.fillText(w.n,0,-(w.w===3?13:10)*s-6)}cx.restore()}
      for(i=0;i<W.length;i++){w=W[i];if((w.w==="water"||w.w==="park")&&w.n&&!seen[w.n]){var sx0=0,sy0=0,n2=w.p.length/2;for(k=0;k<w.p.length;k+=2){sx0+=w.p[k];sy0+=w.p[k+1]}
        if(w.w==="water"){var px=a.P?a.P.x:0,py=a.P?a.P.y:0,bd2=1e12;for(k=0;k<w.p.length;k+=2){var d2=Math.hypot(w.p[k]-px,w.p[k+1]-py);if(d2<bd2){bd2=d2;sx0=w.p[k];sy0=w.p[k+1]}}
          cx.save();cx.font="italic 15px Georgia,serif";cx.fillStyle=mix(B,th.waterEdge||"#3a5a78",lt?.9:.9);var X1=Math.max(60,Math.min(a.cw-60,a.sx(sx0))),Y1=a.sy(sy0);cx.fillText(w.n,X1,Y1);cx.restore()}
        else{cx.save();cx.font="italic 13px Georgia,serif";cx.fillText(w.n,a.sx(sx0/n2),a.sy(sy0/n2));cx.restore()}seen[w.n]=1}}
      cx.restore()}}
  /* cartouche met titel, vak, schaalstok en noordpijl (links boven, onder de balk) */
  function fg(cx,a){var B=th.bg||"#0c0a0b",LB=th.label||"#b8aca0",lt=light(B),ink=mix(B,lt?"#000":LB,lt?.75:.8),p=a.P||{x:0,y:0};
    var col=Math.floor((p.x+1250)/250),row=Math.floor((p.y+1250)/250),vak="ABCDEFGHIJKL".charAt(Math.max(0,Math.min(11,col)))+(Math.max(0,row)+1);
    cx.save();cx.font="600 12px 'Barlow Condensed','Arial Narrow',sans-serif";var tw=cx.measureText(X.plan.toUpperCase()).width;cx.restore();var x=12,y=(a.top||64)+8,w=Math.max(124,Math.ceil(tw)+50),h=60,m=100*a.s;while(m>90){m/=2}var lab=Math.round(m/a.s);if(lab>=95&&lab<=105)lab=100;
    cx.save();cx.fillStyle=mix(B,lt?"#fff":"#000",lt?.55:.45,.82);cx.fillRect(x,y,w,h);cx.strokeStyle=ink;cx.lineWidth=1;cx.strokeRect(x+.5,y+.5,w-1,h-1);cx.strokeRect(x+3.5,y+3.5,w-7,h-7);
    cx.fillStyle=ink;cx.textAlign="left";cx.textBaseline="alphabetic";cx.font="600 12px 'Barlow Condensed','Arial Narrow',sans-serif";cx.fillText(X.plan.toUpperCase(),x+10,y+20);
    cx.font="11px 'Special Elite','Courier New',monospace";cx.fillText(X.vak+" "+vak,x+10,y+34);
    var sbx=x+10,sby=y+46;cx.fillRect(sbx,sby,m/2,4);cx.strokeRect(sbx+.5,sby+.5,m-1,3);cx.font="10px 'Barlow Condensed','Arial Narrow',sans-serif";cx.fillText(lab+" m",sbx+m+5,sby+5);
    var nx=x+w-22,ny=y+30;cx.beginPath();cx.moveTo(nx,ny-15);cx.lineTo(nx+6,ny+6);cx.lineTo(nx,ny+2);cx.closePath();cx.fill();cx.beginPath();cx.moveTo(nx,ny-15);cx.lineTo(nx-6,ny+6);cx.lineTo(nx,ny+2);cx.closePath();cx.stroke();
    cx.textAlign="center";cx.font="600 11px 'Barlow Condensed','Arial Narrow',sans-serif";cx.fillText("N",nx,ny+19);cx.restore()}
  return{on:on,bg:bg,fg:fg,mount:mount,virt:function(){return info().virt}}}

MW.Plan={city:city,ctl:ctl,seedOf:seedOf,mix:mix,T:X};
})();
