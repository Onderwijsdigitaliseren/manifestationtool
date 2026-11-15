/* Kaartlaag voor de wandelingen met plattegrond (De Wensjacht).
   tiles.js, plan.js en walk.js zijn ongewijzigd overgenomen uit de wandelmotor van Enigma Mystery
   (repo test, wandel/shared/). Dit bestand vervangt daar platform.js: de kaartlaag heeft alleen MW.LS nodig.
   Laadvolgorde: mw.js → tiles.js → plan.js → walk.js. Bijwerken = de drie bestanden opnieuw kopiëren. */
"use strict";
window.MW = window.MW || {};
window.MW.LS = {
  get:function(k, d){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set:function(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del:function(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
