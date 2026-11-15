/* Kaartgegevens uit vectortegels: OpenStreetMap-data in OpenMapTiles-vorm, van OpenFreeMap (gratis, geen sleutel, via een CDN).
   Veel sneller en betrouwbaarder dan de Overpass-servers: één tot vier tegels van een paar honderd kB, wereldwijd gecachet.
   Gedeeld door Enigma Mystery (wandel/) en MiniMystery; losstaand, geen andere bestanden nodig.
     MW.Tiles.world({lat,lon,R,ms}) → Promise<{pois:[{x,y,type,name}], ways:[{p,w,n,ns?}]}>
       x naar het oosten en y naar het zuiden, in meters vanaf (lat,lon), zoals fetchWorld in walk.js.
       ways: w 3 = hoofdweg, 2 = straat, 1 = pad; w "water"/"park" = vlak (ns:1 = ligt tegen de tegelrand, geen omlijning).
       Faalt als de tegel waar de speler staat niet binnen ms (standaard 8000) binnen is.
     MW.Tiles.attr: bronvermelding die bij de kaart hoort.
   Andere bron of eigen tegelserver: window.SS_TILES = "https://…/{z}/{x}/{y}.pbf". */
(function(){
"use strict";
var MW=window.MW=window.MW||{};
var URL0="https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf",Z=14;
var LG=(document.documentElement.lang||"en").slice(0,2)==="nl"?"nl":"en";
var ATTR=LG==="nl"?"© OpenStreetMap-bijdragers · © OpenMapTiles":"© OpenStreetMap contributors · © OpenMapTiles";
var MEM={};/* tegels die deze sessie al binnen zijn */
var TD=window.TextDecoder?new TextDecoder():{decode:function(){return""}};

/* ---------- protobuf / Mapbox Vector Tile ---------- */
function decode(b){var p=0,L={};
  function vi(){var r=0,s=1,x;do{x=b[p++];r+=(x&127)*s;s*=128}while(x>=128);return r}
  function skip(t){if(t===0)vi();else if(t===1)p+=8;else if(t===2)p+=vi();else if(t===5)p+=4;else throw new Error("pbf")}
  function str(e){var s="";try{s=TD.decode(b.subarray(p,e))}catch(_){}p=e;return s}
  function value(e){var v=null;while(p<e){var k=vi(),f=k>>3,t=k&7;
      if(f===1&&t===2){var n=vi();v=str(p+n)}else if(f===2&&t===5){v=new DataView(b.buffer,b.byteOffset+p,4).getFloat32(0,true);p+=4}
      else if(f===3&&t===1){v=new DataView(b.buffer,b.byteOffset+p,8).getFloat64(0,true);p+=8}
      else if((f===4||f===5)&&t===0)v=vi();else if(f===6&&t===0){var z=vi();v=z%2?-(z+1)/2:z/2}else if(f===7&&t===0)v=!!vi();else skip(t)}return v}
  function packed(e){var a=[];while(p<e)a.push(vi());return a}
  function layer(e){var o={name:"",keys:[],vals:[],ext:4096,f:[]};while(p<e){var k=vi(),f=k>>3,t=k&7,n;
      if(f===1&&t===2){n=vi();o.name=str(p+n)}else if(f===2&&t===2){n=vi();o.f.push([p,p+n]);p+=n}
      else if(f===3&&t===2){n=vi();o.keys.push(str(p+n))}else if(f===4&&t===2){n=vi();o.vals.push(value(p+n))}
      else if(f===5&&t===0)o.ext=vi();else skip(t)}return o}
  function feature(s,e){p=s;var o={tags:[],type:0,g:[]};while(p<e){var k=vi(),f=k>>3,t=k&7,n;
      if(f===2&&t===2){n=vi();o.tags=packed(p+n)}else if(f===3&&t===0)o.type=vi();else if(f===4&&t===2){n=vi();o.g=packed(p+n)}else skip(t)}return o}
  while(p<b.length){var k=vi(),f=k>>3,t=k&7;if(f===3&&t===2){var n=vi(),e=p+n,ly=layer(e);p=e;L[ly.name]=ly}else skip(t)}
  /* elke laag: each(fn(props,lines,type)) */
  Object.keys(L).forEach(function(nm){var ly=L[nm];ly.each=function(fn){ly.f.forEach(function(r){var ft=feature(r[0],r[1]),pr={};
    for(var i=0;i+1<ft.tags.length;i+=2)pr[ly.keys[ft.tags[i]]]=ly.vals[ft.tags[i+1]];
    var g=ft.g,j=0,x=0,y=0,lines=[],cur=null;
    while(j<g.length){var c=g[j++],id=c&7,cnt=c>>3;if(id===1||id===2){for(var q=0;q<cnt&&j+1<g.length;q++){var dx=g[j++],dy=g[j++];x+=(dx>>>1)^-(dx&1);y+=(dy>>>1)^-(dy&1);if(id===1||!cur){cur=[];lines.push(cur)}cur.push(x,y)}}else if(id!==7)break}
    fn(pr,lines,ft.type)})}});
  return L}

/* ---------- ophalen ---------- */
function gunzip(b){if(!window.DecompressionStream)return Promise.reject(new Error("gzip"));
  return new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer().then(function(x){return new Uint8Array(x)})}
function getTile(x,y,sig){var key=Z+"/"+x+"/"+y;if(MEM[key])return Promise.resolve(MEM[key]);
  var u=(window.SS_TILES||URL0).replace("{z}",Z).replace("{x}",x).replace("{y}",y);
  return fetch(u,{signal:sig,credentials:"omit"}).then(function(r){if(r.status===204||r.status===404)return new ArrayBuffer(0);if(!r.ok)throw new Error("tile "+r.status);return r.arrayBuffer()})
    .then(function(buf){var b=new Uint8Array(buf);return b.length>1&&b[0]===0x1f&&b[1]===0x8b?gunzip(b):b})
    .then(function(b){var L=decode(b);MEM[key]=L;return L})}

/* ---------- omzetten ---------- */
var ROAD={motorway:0,trunk:3,primary:3,secondary:3,tertiary:3,minor:2,service:2,busway:2,track:1,path:1};
var PATH2={pedestrian:2,living_street:2};
var POI={place_of_worship:"kerk",bank:"bank",atm:"bank",cafe:"cafe",pub:"cafe",bar:"cafe",restaurant:"cafe",pharmacy:"apotheek",post_box:"post",post_office:"post",
  library:"bieb",school:"school",fuel:"tank",bench:"bankje",hotel:"hotel",artwork:"kunst",museum:"kunst",supermarket:"winkel",bakery:"winkel",convenience:"winkel",
  bus_stop:"halte",park:"park",playground:"park"};
var GREEN={park:1,garden:1,village_green:1,recreation_ground:1,playground:1,wood:1,forest:1};
function roadW(pr){if(pr.brunnel==="tunnel"||pr.indoor===1||pr.indoor===true)return 0;var c=pr["class"]||"";
  if(c==="path"||c==="minor")return PATH2[pr.subclass]||ROAD[c];return ROAD[c]||0}
/* oppervlak in m²; in tegelvolgorde (y naar beneden) is een buitenrand positief, een gat negatief */
function area(p){var a=0,n=p.length;for(var i=0;i<n;i+=2){var j=(i+2)%n;a+=p[i]*p[j+1]-p[j]*p[i+1]}return a/2}

function world(o){var lat=o.lat,lon=o.lon,R=o.R||700,ms=o.ms||8000,n=Math.pow(2,Z);
  var kx=111320*Math.cos(lat*Math.PI/180),ky=110540,B=R+250;
  var tx=function(lo){return Math.floor((lo+180)/360*n)},ty=function(la){var r=la*Math.PI/180;return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n)};
  var x0=tx(lon-B/kx),x1=tx(lon+B/kx),y0=ty(lat+B/ky),y1=ty(lat-B/ky),me=[tx(lon),ty(lat)],list=[];
  for(var X=x0;X<=x1;X++)for(var Y=y0;Y<=y1;Y++)list.push([X,Y]);
  if(!list.length||list.length>9)return Promise.reject(new Error("tiles"));
  var ac=window.AbortController?new AbortController():null,sig=ac?ac.signal:undefined;
  return new Promise(function(res,rej){var got={},left=list.length,done=false;
    var tm=setTimeout(function(){finish()},ms);
    function finish(){if(done)return;done=true;clearTimeout(tm);if(ac)try{ac.abort()}catch(e){}
      var mk=me[0]+"/"+me[1];if(!got[mk])return rej(new Error("tile timeout"));
      try{res(build(got))}catch(e){rej(e)}}
    list.forEach(function(t){getTile(t[0],t[1],sig).then(function(L){got[t[0]+"/"+t[1]]={L:L,x:t[0],y:t[1]}},function(){}).then(function(){if(--left<=0)finish()})})});

  function build(got){var pois=[],named=[],plain=[],areas=[],seen={};
    Object.keys(got).forEach(function(k){var T=got[k],L=T.L;
      var conv=function(ly,line){var e=ly.ext,out=[],lx=1e9,lyy=1e9,edge=false;
        for(var i=0;i+1<line.length;i+=2){var px=line[i],py=line[i+1];if(px<=0||py<=0||px>=e||py>=e)edge=true;
          var lo=(T.x+px/e)/n*360-180,la=Math.atan(Math.sinh(Math.PI*(1-2*(T.y+py/e)/n)))*180/Math.PI;
          var mx=Math.round((lo-lon)*kx),my=Math.round(-(la-lat)*ky);
          if(Math.abs(mx-lx)+Math.abs(my-lyy)<2&&i+2<line.length)continue;out.push(mx,my);lx=mx;lyy=my}
        out.edge=edge;return out};
      var near=function(p){var a=1e9,b=-1e9,c=1e9,d=-1e9;for(var i=0;i<p.length;i+=2){if(p[i]<a)a=p[i];if(p[i]>b)b=p[i];if(p[i+1]<c)c=p[i+1];if(p[i+1]>d)d=p[i+1]}return a<B&&b>-B&&c<B&&d>-B};
      /* straten: met naam uit transportation_name, zonder naam uit transportation */
      if(L.transportation_name)L.transportation_name.each(function(pr,lines,ty){if(ty!==2)return;var w=roadW(pr);if(!w)return;var nm=pr.name||pr["name:nl"]||pr.ref||"";
        lines.forEach(function(l){var p=conv(L.transportation_name,l);if(p.length>=4&&near(p))named.push({p:p,w:w,n:String(nm)})})});
      if(L.transportation)L.transportation.each(function(pr,lines,ty){if(ty!==2)return;var w=roadW(pr);if(!w)return;
        lines.forEach(function(l){var p=conv(L.transportation,l);if(p.length>=4&&near(p))plain.push({p:p,w:w,n:""})})});
      /* water en groen */
      if(L.water)L.water.each(function(pr,lines,ty){if(ty!==3||pr["class"]==="swimming_pool"||pr.brunnel==="tunnel")return;
        lines.forEach(function(l){var p=conv(L.water,l);if(p.length>=8&&area(p)>120&&near(p))areas.push({p:p.slice(),w:"water",n:"",ns:p.edge?1:0})})});
      var green=function(ly,pick){if(ly)ly.each(function(pr,lines,ty){if(ty!==3||!pick(pr))return;
        lines.forEach(function(l){var p=conv(ly,l);if(p.length>=8&&area(p)>500&&near(p))areas.push({p:p.slice(),w:"park",n:pr.name?String(pr.name):"",ns:p.edge?1:0})})})};
      green(L.park,function(){return true});green(L.landcover,function(pr){return GREEN[pr.subclass]||GREEN[pr["class"]]});
      /* plekken */
      if(L.poi)L.poi.each(function(pr,lines,ty){if(ty!==1||!lines.length)return;var t=POI[pr.subclass]||POI[pr["class"]];if(!t)return;
        var p=conv(L.poi,lines[0]);if(p.length<2)return;var d=Math.hypot(p[0],p[1]);if(d>R+80)return;
        var nm=pr.name?String(pr.name):"",key=t+"|"+nm+"|"+Math.round(p[0]/12)+"|"+Math.round(p[1]/12);if(seen[key])return;seen[key]=1;
        pois.push({x:p[0],y:p[1],type:t,name:nm})})});
    /* straten zonder naam overslaan als er al een straat met naam op dezelfde plek ligt */
    var C=30,grid={},cell=function(x,y){return Math.floor(x/C)+","+Math.floor(y/C)};
    named.forEach(function(w,wi){for(var i=0;i+3<w.p.length;i+=2){var ax=w.p[i],ay=w.p[i+1],bx=w.p[i+2],by=w.p[i+3],st=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/C));
      for(var s=0;s<=st;s++){var k=cell(ax+(bx-ax)*s/st,ay+(by-ay)*s/st);(grid[k]=grid[k]||[]).push([ax,ay,bx,by])}}});
    var segD=function(px,py,g){var ax=g[0],ay=g[1],dx=g[2]-ax,dy=g[3]-ay,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l)):0;return Math.hypot(px-ax-t*dx,py-ay-t*dy)};
    var covered=function(x,y){var cx=Math.floor(x/C),cy=Math.floor(y/C);for(var a=-1;a<=1;a++)for(var b=-1;b<=1;b++){var gs=grid[(cx+a)+","+(cy+b)];if(gs)for(var i=0;i<gs.length;i++)if(segD(x,y,gs[i])<7)return true}return false};
    var mid=function(p,f){var k=Math.min(p.length/2-1,Math.max(0,Math.round((p.length/2-1)*f)));return[p[k*2],p[k*2+1]]};
    var ways=areas.concat(named,plain.filter(function(w){var a=mid(w.p,.3),b=mid(w.p,.7);return!(covered(a[0],a[1])&&covered(b[0],b[1]))}));
    return{pois:pois,ways:ways}}}

/* bronvermelding op de kaart: klein, rechts, net boven het onderpaneel (#low). Alleen bij echte kaartgegevens, niet bij de getekende stad. */
var CR={t:0,y:0};
function credit(cx,cw,ch,col,ways){if(!ways||!ways.length)return;for(var i=0;i<ways.length;i++)if(ways[i].w==="block")return;
  var now=Date.now();if(now-CR.t>1000){CR.t=now;var el=document.getElementById("low"),cv=cx.canvas,top=cv?cv.getBoundingClientRect().top:0;CR.y=el&&el.offsetParent!==null?el.getBoundingClientRect().top-top:ch}
  cx.save();cx.globalAlpha=.6;cx.font="10px 'Barlow Condensed','Arial Narrow',sans-serif";cx.textAlign="right";cx.textBaseline="bottom";cx.fillStyle=col||"#8a96a8";cx.fillText(ATTR,cw-8,Math.min(ch,CR.y)-5);cx.restore()}
MW.Tiles={world:world,attr:ATTR,credit:credit,decode:decode};
})();
