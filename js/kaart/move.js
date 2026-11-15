/* Moordwandeling – punten verleggen (gedeeld door alle wandelingen).
   Ligt een punt op een plek waar je niet kunt of wilt komen, dan wijst de speler op de kaart een andere plek aan.
   Losstaand (geen walk.js nodig); walk.js gebruikt het vanzelf als dit bestand vóór walk.js geladen is
   en createMap de optie `move` krijgt:

     Wk.createMap(cv,{…, move:true})                       // alle open plekken uit items() (ref met x/y, niet done, tap niet false)
     Wk.createMap(cv,{…, move:{can:fn(p), target:fn(), done:fn(p,info), points:fn(), snap:60, gap:20}})
       can(p)        mag dit punt verlegd worden? (standaard: ja)
       target()      het punt dat als eerste gekozen is (bijv. het volgende of het aangetikte punt)
       done(p,info)  na het verleggen: opslaan. info = {old:{x,y}, name:straatnaam of "", snapped:bool}
       points()      eigen lijst met punten ({x,y} in meters, worden ter plekke aangepast)
       snap          zoekafstand naar de dichtstbijzijnde straat in meters (standaard 60; 0 = niet naar de straat trekken)
       gap           minimale afstand tot een ander punt in meters (standaard 20)

   De knop "✥ Verleg punt" komt in #zoom (als dat er is). Zonder #zoom: map.move.toggle() aan een eigen knop hangen.
   Verloop: knop → het doelpunt krijgt een ring → tik op een ander punt om dat te kiezen, of tik op de kaart:
   het punt springt naar de dichtstbijzijnde straat bij je vinger. Daarna staat de stand weer uit.

   Los gebruiken (oude Moordwandeling-motor): var mv=MW.Move.ctl({points,can,target,done,ways,R,toast});
     mv.mount(); in de tik-afhandeling: if(mv.on()){mv.tap({mx,my,wx,wy,sx,sy});return}   // mx/my scherm, wx/wy wereld
     na het tekenen van de kaart: mv.fg(cx,{sx,sy,cw,ch,t,top}). */
(function(){
"use strict";
var MW=window.MW=window.MW||{};
var LG=(document.documentElement.lang||"en").slice(0,2)==="nl"?"nl":"en";
var X={nl:{btn:"Verleg punt",stop:"Klaar",aria:"Een punt op de kaart verleggen",hint:"Tik waar het punt moet komen",pick:"Ander punt? Tik dat eerst aan",
    none:"Er is nu geen punt om te verleggen.",moved:"Punt verlegd",sel:"Dit punt gekozen. Tik nu waar het moet komen.",
    far:"Dat is te ver weg. Kies een plek dichterbij.",near:"Daar ligt al een punt. Kies een andere plek."},
  en:{btn:"Move point",stop:"Done",aria:"Move a point on the map",hint:"Tap where the point should go",pick:"Another point? Tap that one first",
    none:"There is no point to move right now.",moved:"Point moved",sel:"This point is selected. Now tap where it should go.",
    far:"That's too far away. Pick a spot closer by.",near:"There's already a point there. Pick another spot."}}[LG];

/* dichtstbijzijnde plek op een straat (w is een getal; 9 = rivier telt niet) binnen max meter */
function snap(ways,x,y,max){var best=null,bd=max;
  for(var i=0;i<ways.length;i++){var w=ways[i];if(typeof w.w!=="number"||w.w===9)continue;var p=w.p;
    for(var k=0;k+3<p.length;k+=2){var ax=p[k],ay=p[k+1],dx=p[k+2]-ax,dy=p[k+3]-ay,l=dx*dx+dy*dy,t=l?((x-ax)*dx+(y-ay)*dy)/l:0;t=t<0?0:t>1?1:t;
      var qx=ax+t*dx,qy=ay+t*dy,d=Math.hypot(qx-x,qy-y);if(d<bd){bd=d;best={x:qx,y:qy,n:w.n||""}}}}
  return best}

function ctl(o){
  var act=false,sel=null,btn=null;
  function all(){return(o.points?o.points():[]).filter(function(p){return p&&typeof p.x==="number"&&typeof p.y==="number"})}
  function pts(){return all().filter(function(p){return !o.can||o.can(p)})}
  function say(m){if(o.toast)o.toast(m)}
  function ui(){if(btn){btn.textContent=act?X.stop:"✥ "+X.btn;btn.setAttribute("aria-pressed",act?"true":"false")}if(o.onState)o.onState(act)}
  function set(v){
    if(v){var a=pts();if(!a.length){say(X.none);return false}var t=o.target?o.target():null;sel=a.indexOf(t)>=0?t:a[0]}else sel=null;
    act=!!v;ui();return act}
  function toggle(){return set(!act)}
  function mount(z){z=z||document.getElementById("zoom");if(!z||btn)return;
    btn=document.createElement("button");btn.type="button";btn.id="zMove";btn.setAttribute("aria-label",X.aria);
    var bs=btn.style;bs.width="auto";bs.minWidth="42px";bs.padding="0 11px";bs.alignSelf="flex-end";bs.whiteSpace="nowrap";bs.fontSize="13px";bs.lineHeight="1";bs.letterSpacing=".02em";
    z.appendChild(btn);btn.onclick=toggle;ui()}
  /* e: {mx,my (scherm), wx,wy (wereld, meters), sx(x), sy(y)} → true als de tik is afgehandeld */
  function tap(e){
    if(!act)return false;
    var a=pts(),hit=null,i;for(i=0;i<a.length;i++)if(Math.hypot(e.sx(a[i].x)-e.mx,e.sy(a[i].y)-e.my)<28)hit=a[i];
    if(hit){if(hit!==sel){sel=hit;say(X.sel)}return true}
    if(!sel||a.indexOf(sel)<0){set(false);return true}
    var R=o.R?o.R():0;if(R&&Math.hypot(e.wx,e.wy)>R*1.15){say(X.far);return true}
    var mx=o.snap==null?60:o.snap,s=mx?snap(o.ways?o.ways():[],e.wx,e.wy,mx):null,nx=s?s.x:e.wx,ny=s?s.y:e.wy,gap=o.gap==null?20:o.gap,q=all();
    for(i=0;i<q.length;i++)if(q[i]!==sel&&Math.hypot(q[i].x-nx,q[i].y-ny)<gap){say(X.near);return true}
    var p=sel,info={old:{x:p.x,y:p.y},name:s?s.n:"",snapped:!!s};p.x=Math.round(nx);p.y=Math.round(ny);
    set(false);if(o.done)o.done(p,info);
    try{navigator.vibrate&&navigator.vibrate(40)}catch(err){}
    say(X.moved+(info.name?" · "+info.name:""));return true}
  /* over de kaart heen: ring om het gekozen punt en de aanwijzing bovenin */
  function fg(cx,a){
    if(!act)return;var t=a.t||0;
    cx.save();
    if(sel){var X0=a.sx(sel.x),Y0=a.sy(sel.y);cx.lineWidth=3;cx.setLineDash([7,6]);cx.lineDashOffset=-(t/60)%13;
      cx.strokeStyle="rgba(0,0,0,.55)";cx.beginPath();cx.arc(X0,Y0,31,0,7);cx.stroke();
      cx.strokeStyle="#fff";cx.lineDashOffset=-(t/60)%13+6.5;cx.beginPath();cx.arc(X0,Y0,31,0,7);cx.stroke();cx.setLineDash([])}
    var two=pts().length>1,l1=X.hint,l2=two?X.pick:"";
    cx.font="600 14px system-ui,-apple-system,'Segoe UI',sans-serif";var w=cx.measureText(l1).width;
    if(l2){cx.font="12px system-ui,-apple-system,'Segoe UI',sans-serif";w=Math.max(w,cx.measureText(l2).width)}
    var bw=Math.min(a.cw-16,w+28),bh=l2?48:32,bx=(a.cw-bw)/2,by=(a.top==null?10:a.top)+8,r=12;
    cx.fillStyle="rgba(18,18,20,.88)";cx.beginPath();cx.moveTo(bx+r,by);cx.arcTo(bx+bw,by,bx+bw,by+bh,r);cx.arcTo(bx+bw,by+bh,bx,by+bh,r);cx.arcTo(bx,by+bh,bx,by,r);cx.arcTo(bx,by,bx+bw,by,r);cx.closePath();cx.fill();
    cx.textAlign="center";cx.textBaseline="middle";cx.fillStyle="#fff";cx.font="600 14px system-ui,-apple-system,'Segoe UI',sans-serif";cx.fillText(l1,a.cw/2,by+(l2?16:16));
    if(l2){cx.fillStyle="rgba(255,255,255,.75)";cx.font="12px system-ui,-apple-system,'Segoe UI',sans-serif";cx.fillText(l2,a.cw/2,by+35)}
    cx.restore()}
  return{mount:mount,on:function(){return act},set:set,toggle:toggle,tap:tap,fg:fg,sel:function(){return sel}}}

MW.Move={ctl:ctl,snap:snap};
})();
