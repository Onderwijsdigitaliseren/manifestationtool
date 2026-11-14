/* ============================================================
   De weg naar morgen — Het huis met de groene deur
   Alle teksten van de zeven wandelingen. De motor staat in js/wandeling.js.

   Per moment:
     id, t (titel), img (optioneel beeld uit assets/wandeling/<img>.webp)
     tx   schermtekst; een alinea die helemaal tussen “ ” staat wordt een briefje
     vr   de centrale reflectievraag (kopje boven de velden)
     r    velden: kies (keuzes), tekst (invullen), toon (eerdere antwoorden)
     op   opdracht voor het wandelstuk (het laatste moment heeft er geen)
   Velden mogen `als(A)` hebben: alleen tonen als de functie waar is.
   A = alle antwoorden tot nu toe (bewaard + van deze wandeling).
   ============================================================ */
"use strict";
window.WANDEL = (function(){

  const GEVOEL = ["onrustig","moe","nieuwsgierig","hoopvol","vol in mijn hoofd"];
  const WOORDEN = ["vrij","rustig","geliefd","zeker","creatief","verbonden","avontuurlijk"];
  const heeft = k => A => { const v = A[k]; return Array.isArray(v) ? v.length > 0 : !!v; };
  const uniek = a => a.filter((x,i)=>x && a.indexOf(x) === i);
  const lijst = v => Array.isArray(v) ? v : (v ? [v] : []);

  /* ---------- thema's (1.02) en hun aanvullingen ---------- */
  const THEMAS = [
    {id:"rust", label:"rust en eigen tijd",
      b:"Wat zou meer rust jou teruggeven: aandacht, energie voor iets leuks, eigen tijd of iets anders?",
      d:"Misschien neem je tijd voor je ontbijt of kies je één moment waarop je even onbereikbaar bent.",
      s:"Een klein rustmoment afspreken, één taak vereenvoudigen of bespreken wat je kunt verdelen."},
    {id:"vertrouwen", label:"vertrouwen en durven",
      b:"Wat zou je willen doen als je jezelf wat meer vertrouwde?",
      d:"Misschien spreek je een idee uit of geef je jezelf ruimte om iets te leren.",
      s:"Eén vraag stellen, een eerste versie maken of een idee met iemand delen."},
    {id:"vrijheid", label:"vrijheid en mogelijkheden",
      b:"Waarin wil je meer keuze ervaren? Wat betekent vrijheid in jouw eigen omstandigheden?",
      d:"Misschien bepaal je bewuster waar je tijd naartoe gaat of onderzoek je iets nieuws.",
      s:"Eén mogelijkheid onderzoeken of een klein moment voor jouw eigen plan reserveren."},
    {id:"liefde", label:"liefde en verbinding",
      b:"Welke vorm van contact verlang je: aandacht, wederkerigheid, nabijheid, vriendschap of iets anders?",
      d:"Misschien luister je met aandacht, spreek je een behoefte uit of maak je ruimte voor een ontmoeting.",
      s:"Een uitnodiging sturen, een gesprek voorstellen of opschrijven wat jij belangrijk vindt in contact."},
    {id:"geld", label:"geld en ruimte",
      b:"Wat hoop je dat meer financiële ruimte mogelijk maakt: rust, keuze, zekerheid of een concrete wens?",
      d:"Misschien neem je rustiger een besluit of heb je tijd voor iets wat jij belangrijk vindt.",
      s:"Eén praktische vraag uitzoeken of iemand met passende kennis om informatie vragen."}
  ];

  /* ---------- terugkomen na een wandeling ---------- */
  const TERUG = [
    {v:"ik heb mijn stap geprobeerd", tx:"Je hebt iets uitgeprobeerd. Wat gebeurde er werkelijk, en wat wil je daarvan onthouden?"},
    {v:"ik heb iets anders gedaan", tx:"Je plan en je dag zijn elkaar ergens anders tegengekomen. Wat bleek in de praktijk passend of nodig?"},
    {v:"het is er niet van gekomen", tx:"Dat is informatie over hoe jouw leven nu loopt. Was de stap te groot, het moment onhandig of iets anders belangrijker?"},
    {v:"ik had geen concrete stap gekozen", tx:"Je kunt vandaag verder onderzoeken wat je verlangt. Er hoeft nog geen afspraak met jezelf klaar te liggen."}
  ];
  const TERUG_PRIVE = "Neem jouw ervaring in gedachten mee. We beginnen vanaf waar je vandaag bent.";

  /* ---------- labels voor kaart en wandelboek ---------- */
  const LABEL = {
    startgevoel:"Zo kwam ik aan", thema:"Mijn thema", verlangen:"Ik verlang naar", gevoelswoorden:"Wat ik vaker wil ervaren",
    wenstitel:"Titel van mijn wens", inzicht_1:"Wat ik over mijn wens ontdekte",
    verlangen_bevestiging:"Mijn wens vandaag", toekomst_ochtend:"Mijn ochtend begint dan met", toekomst_dag:"Overdag geef ik meer ruimte aan",
    toekomst_tegenslag:"Als iets tegenzit, wil ik mezelf", al_aanwezig:"Een klein stukje is er al wanneer", toekomst_detail:"Dit detail wil ik onthouden",
    tegenstem:"De gedachte die vaak verschijnt", tegenstem_herkomst:"Waar die gedachte vandaan komt", praktische_behoefte:"Wat praktisch nodig is",
    helpende_zin:"Mijn helpende zin", inzicht_3:"Wat ik mezelf wil herinneren",
    ruimte_moment:"Een mogelijk moment voor mijn wens", minder_ruimte:"Iets minder ruimte voor", grens_of_verzoek:"Ik wil duidelijker zijn over",
    beschikbare_mogelijkheid:"Wat deze week beschikbaar is", ruimtekeuze:"Ik geef mijn wens ruimte door",
    oefenwoord:"Mijn woord om mee te oefenen", gewenst_gedrag:"Vanuit dit woord wil ik vaker", oefensituatie:"Hier wil ik iets anders proberen",
    kleine_stap:"Mijn kleine stap", actie_anker:"Mijn afspraak", actie_moment:"Mijn moment", plan_b:"Als het lastig wordt, kan ik",
    actie_status:"Wat ik met mijn stap doe", inzicht_5:"Dit wil ik mezelf meegeven",
    actie_ervaring:"Hoe het ging met mijn stap", actie_les:"Wat ik merkte of leerde", waardering:"Vandaag waardeer ik", bijstelling:"Wat ik bijstel",
    steun:"Steun zou ik kunnen vinden bij", inzicht_6:"Wat ik wil behouden of aanpassen",
    slotrichting:"Mijn wens aan het eind", slot_toekomst:"Een leven dat meer bij mij past, heeft meer", richtingwoorden:"Mijn richtingwoorden",
    volgende_stap:"Mijn volgende stap", volgend_moment:"Mijn moment", volgende_steun:"Wat kan helpen",
    slotgevoel:"Zo voel ik me nu", slot_inzicht:"Dit neem ik mee", terugkomst:"Hoe het ging met mijn stap"
  };

  /* ---------- kleine bouwstenen voor velden ---------- */
  const wensAanpassen = (k, waarden) => ({t:"tekst", key:"verlangen", label:"Ik verlang naar…", nieuw:true,
    als:A => waarden.indexOf(A[k]) >= 0});

  const W = [
  /* ============ Wandeling 1 ============ */
  {n:1, t:"Wat wil ik eigenlijk?", sub:"Een eigen verlangen herkennen, en ontdekken wat eronder zit.", m:[
    {id:"1.01", t:"Het hek", img:"pension",
      tx:["Aan het einde van het pad staat een huis met een groene deur. Op het hek hangt een briefje.",
          "“Welkom. Je mag hier beginnen met een vaag idee.”",
          "Daaronder, in kleinere letters:",
          "“Een uitgewerkt vijfjarenplan levert geen betere thee op.”",
          "Je blijft even staan. Hoe kom jij hier vandaag aan?"],
      vr:"Hoe kom jij hier vandaag aan?",
      r:[{t:"kies", key:"startgevoel", multi:true, opts:GEVOEL, eigen:"anders"}],
      op:"Loop een tijdje op een tempo dat vandaag prettig voelt. Merk je voeten, de ruimte om je heen en je gewone ademhaling op."},
    {id:"1.02", t:"Het pad", img:"pad",
      tx:["Het pad loopt langs een sloot en een veld. Er gebeurt weinig. Dat geeft je de gelegenheid om op te merken hoeveel er ondertussen door je hoofd gaat.",
          "Op een paaltje staat:",
          "“Wat zou jij meer ruimte willen geven?”",
          "Laat de eerste antwoorden maar komen. Je hoeft nog niets te kiezen."],
      vr:"Kies een thema, als er een bij je past.",
      r:[{t:"kies", key:"thema", opts:THEMAS.map(x=>x.label), eigen:"mijn eigen thema"}],
      op:"Neem jouw thema mee. Vraag jezelf af wat je eraan aantrekt. Laat het antwoord ontstaan terwijl je loopt."},
    {id:"1.03", t:"Het open raam", img:"raam",
      tx:["Een raam van het pension staat open. Op de vensterbank ligt een kaart:",
          "“Stel dat je wens niet verstandig, indrukwekkend of handig voor anderen hoeft te klinken. Wat zou je dan wensen?”",
          "Je mag klein beginnen. Een rustige ochtend. Een eigen plek. Meer plezier. Of juist een wens die je bijna niet hardop durft te zeggen."],
      r:[{t:"tekst", key:"verlangen", label:"Ik verlang naar…"}],
      op:"Loop verder met jouw wens. Merk op wat er gebeurt als je jezelf toestaat die even serieus te nemen."},
    {id:"1.04", t:"Onder de eik", img:"eik", thema:"b",
      tx:["Onder een oude eik staat een bankje. Op de leuning is een klein zonnetje getekend.",
          "Denk aan jouw wens. Misschien gaat die over een huis, een relatie, tijd of geld. Daaronder kan nog iets anders zitten: veiligheid, vrijheid, gezien worden, avontuur.",
          "Welk gevoel hoop jij door deze wens vaker te ervaren?"],
      vr:"Kies of schrijf maximaal drie woorden.",
      r:[{t:"kies", key:"gevoelswoorden", multi:true, max:3, opts:WOORDEN, eigen:"eigen woord"}],
      op:"Neem één van jouw woorden mee. Hoe zou een gewone dag eruitzien waarop dat gevoel meer ruimte heeft? Een klein beeld is genoeg."},
    {id:"1.05", t:"Het prikbord", img:"tafel",
      tx:["Bij het huis hangt een prikbord. Er staat één lege kaart op.",
          "Daarop mag jouw wens komen. Je hoeft hem hier nog niet te verdedigen of uit te leggen hoe hij haalbaar wordt.",
          "Vanuit de keuken klinkt gerommel. Op de deur hangt een briefje van Lou:",
          "“Vandaag grote plannen gehad. Eerst het potlood gevonden. Het begin is er.”"],
      r:[{t:"tekst", key:"wenstitel", label:"Geef jouw wens een korte titel, als je wilt.", ph:"Bijvoorbeeld: Meer van mijn eigen tijd", kort:true}],
      op:"Laat je aandacht weer naar je omgeving gaan. Merk één ding op dat je prettig vindt. Je wens mag ondertussen op de achtergrond aanwezig blijven."},
    {id:"1.06", t:"Jouw eerste kaart", img:"tafel",
      tx:["Op de schrijftafel ligt jouw eerste kaart klaar.",
          "Vandaag heb je tijd gegeven aan iets wat jij verlangt. Misschien voelde dat fijn, ongemakkelijk of nog onduidelijk. Dat mag allemaal bestaan.",
          "De volgende keer verken je hoe jouw gewenste leven eruitziet op een heel gewone dag.",
          "Lou heeft alvast een potlood klaargelegd. Het is nog steeds hetzelfde. Ze is er trots op."],
      r:[{t:"tekst", key:"inzicht_1", label:"Wat ik vandaag over mijn wens ontdekte…"}]}
  ]},

  /* ============ Wandeling 2 ============ */
  {n:2, t:"Een dag die van mij is", sub:"Een gewoon, herkenbaar beeld van het leven waarnaar je verlangt.", m:[
    {id:"2.01", t:"Ochtendlicht", img:"wintertuin-begin",
      tx:["Er valt ochtendlicht op de groene deur. Achter het raam van de wintertuin is één strook glas schoongemaakt.",
          "Je neemt jouw wens van de vorige wandeling mee. Je mag die ook aanpassen.",
          "Vandaag onderzoek je hoe het leven waarnaar je verlangt zou aanvoelen tijdens een gewone dag."],
      r:[{t:"toon", keys:["verlangen"]},
         {t:"kies", key:"verlangen_bevestiging", opts:["mijn wens meenemen","mijn wens aanpassen","vandaag opnieuw beginnen"], als:heeft("verlangen")},
         wensAanpassen("verlangen_bevestiging", ["mijn wens aanpassen","vandaag opnieuw beginnen"]),
         {t:"tekst", key:"verlangen", label:"Ik verlang naar…", als:A=>!heeft("verlangen")(A) && !A.verlangen_bevestiging}],
      op:"Word je bewust van waar je nu bent. Laat vervolgens een mogelijke toekomstige dag in gedachten ontstaan, met je ogen open."},
    {id:"2.02", t:"De ochtend van later", img:"raam", beeld:true,
      tx:["Stel je voor dat je wakker wordt op een dag waarop jouw wens meer ruimte heeft gekregen.",
          "Hoe begint die dag? Wat zie je? Waar heb je tijd voor? Misschien is het verschil iets kleins: je pakt je telefoon later, ontbijt rustiger of hebt zin in wat je gaat doen.",
          "Zoek een detail dat echt bij jou past."],
      r:[{t:"tekst", key:"toekomst_ochtend", label:"Mijn ochtend begint dan met…"}],
      op:"Loop verder met dat ene ochtenddetail. Je kunt het zien, in woorden beschrijven of alleen het bijbehorende gevoel laten bestaan."},
    {id:"2.03", t:"Een gewone middag", img:"tafel", thema:"d", beeld:true,
      tx:["De denkbeeldige dag gaat verder. Er is werk, huishouden, contact met anderen of tijd alleen.",
          "Wat doe jij op een manier die beter bij je past? Waar zeg je ja tegen? Wat krijgt aandacht?",
          "Je hoeft trouwens geen versie van jezelf te verzinnen die altijd vroeg opstaat en nooit meer afgeleid raakt. Dat zou een nogal vermoeiende huisgenoot zijn."],
      r:[{t:"tekst", key:"toekomst_dag", label:"Overdag geef ik meer ruimte aan…"}],
      op:"Verken één gewone situatie uit die dag. Wat doe je? Wat voelt daarin belangrijk voor jou?"},
    {id:"2.04", t:"Ook op een lastige dag", img:"kruispunt", beeld:true,
      tx:["Op jouw toekomstige dag loopt iets anders dan gepland. Iemand zegt af. Er komt een rekening. Je bent moe.",
          "Hoe zou jij ermee willen omgaan als jouw gekozen waarden meer ruimte krijgen?",
          "Je toekomstbeeld mag ook plek hebben voor een slechte bui. Juist dan kun je ontdekken hoe je voor jezelf wilt kiezen."],
      r:[{t:"tekst", key:"toekomst_tegenslag", label:"Als iets tegenzit, wil ik mezelf…"}],
      op:"Neem één lastige, alledaagse situatie in gedachten. Stel je een reactie voor die vriendelijk én haalbaar voor je voelt."},
    {id:"2.05", t:"Wat al bestaat", img:"water",
      tx:["Aan het water blijf je even staan. In de weerspiegeling zie je de lucht van vandaag.",
          "Denk aan jouw gewenste leven. Waar is daar nu al een klein stukje van aanwezig? Een persoon, een plek, een gewoonte, een moment?",
          "Misschien is het weinig. Ook dat kun je eerlijk opmerken."],
      r:[{t:"tekst", key:"al_aanwezig", label:"Een klein stukje hiervan is er al wanneer…", alt:["Dat weet ik nog niet"]}],
      op:"Loop een tijdje met dat bestaande stukje. Als je nog niets weet, kijk dan nieuwsgierig naar wat je vandaag prettig of belangrijk vindt."},
    {id:"2.06", t:"Een toekomst die herkenbaar voelt", img:"tafel",
      tx:["Terug bij het huis leg je jouw nieuwe kaart naast de eerste.",
          "Je wens heeft nu een ochtend, een gewone situatie en een manier waarop je met jezelf wilt omgaan.",
          "Op de tafel ligt een briefje van Lou:",
          "“Ik wilde eerst een compleet ander mens worden. Ik begin met mezelf iets meer ruimte geven. Scheelt ook een nieuwe garderobe.”"],
      vr:"Kies of bevestig maximaal drie woorden die bij jouw gewenste dag passen.",
      r:[{t:"kies", key:"gevoelswoorden", multi:true, max:3, opts:A=>uniek(lijst(A.gevoelswoorden).concat(WOORDEN)), eigen:"eigen woord"},
         {t:"tekst", key:"toekomst_detail", label:"Dit detail wil ik onthouden…"}]}
  ]},

  /* ============ Wandeling 3 ============ */
  {n:3, t:"Wat houdt me tegen?", sub:"Gedachten en echte omstandigheden herkennen, en een antwoord vinden dat je kunt geloven.", m:[
    {id:"3.01", t:"Het halfgemaakte bord", img:"wintertuin-begin",
      tx:["Bij de wintertuin ligt een houten bord. Lou heeft er “OPEN” op geschilderd. De laatste letter is nog een potloodlijn.",
          "Ernaast ligt een briefje:",
          "“Ik wilde eerst zeker weten dat het goed genoeg werd. Toen was de middag voorbij.”",
          "Misschien herken je er iets in. Vandaag kijk je naar wat er tussen jouw wens en een volgende stap staat."],
      r:[{t:"toon", keys:["verlangen","gevoelswoorden"], kop:"Dit neem je mee"}],
      op:"Wandel met jouw wens in gedachten. Merk op welke gedachte verschijnt zodra je overweegt er iets voor te doen."},
    {id:"3.02", t:"De eerste tegenstem", img:"pad",
      tx:["Bij het pad staat een oud schoolbord. Het is leeg.",
          "Welke zin verschijnt bij jou als je denkt aan jouw wens?",
          "“Ik heb geen tijd.” “Wie zit daarop te wachten?” “Ik weet niet hoe.” Misschien iets heel anders.",
          "Schrijf de zin zoals hij werkelijk klinkt. Je hoeft er nog niet tegenin te gaan."],
      r:[{t:"tekst", key:"tegenstem", label:"De gedachte die vaak verschijnt is…"}],
      op:"Laat de zin een tijdje meelopen. Vraag jezelf af op welke momenten je hem vooral gelooft."},
    {id:"3.03", t:"Van wie is die maatstaf?", img:"kruispunt",
      tx:["Het pad splitst zich. Op beide paden liggen dezelfde herfstbladeren. Het verschil zit vooral in waar jij naartoe wilt.",
          "Denk aan jouw tegenstem. Is het een conclusie uit een eerdere ervaring? Een regel die je hebt geleerd? Of weet je niet waar hij vandaan komt?",
          "Je mag zelf onderzoeken hoeveel zeggenschap die zin vandaag krijgt."],
      vr:"Waar komt die gedachte vooral vandaan?",
      r:[{t:"kies", key:"tegenstem_herkomst", opts:["eigen ervaring","verwachtingen van anderen","voorzichtigheid of angst","een praktische beperking","ik weet het niet"], eigen:"eigen antwoord"}],
      op:"Vraag jezelf af: wanneer is deze gedachte behulpzaam, en wanneer maakt hij mijn wereld kleiner? Je hoeft geen herinnering op te graven."},
    {id:"3.04", t:"Wat is echt nodig?", img:"pad",
      tx:["Sommige obstakels vragen iets praktisch: tijd, geld, ondersteuning, informatie of een kleinere eerste stap.",
          "Kijk eerlijk naar jouw situatie. Welke omstandigheid verdient aandacht? Je hoeft haar niet met een positieve gedachte weg te poetsen.",
          "Misschien kun je vandaag iets beïnvloeden. Misschien heb je eerst hulp of meer tijd nodig."],
      vr:"Kies of schrijf één praktische behoefte.",
      r:[{t:"kies", key:"praktische_behoefte", opts:["tijd","geld","informatie","steun","rust","kleinere stap","nog onduidelijk"], eigen:"iets anders"}],
      op:"Verken wat een klein beetje ruimte of steun zou kunnen geven. Houd het bij iets wat bij jouw omstandigheden past."},
    {id:"3.05", t:"Een zin die je kunt geloven", img:"water",
      tx:["Bij een beschutte plek ligt een kaartje:",
          "“Welke zin helpt mij eerlijk verder?”",
          "Je kunt bijvoorbeeld denken: “Ik mag beginnen terwijl ik nog leer.” Of: “Ik kan eerst informatie verzamelen.”",
          "Kies woorden die geloofwaardig voelen. Je eigen hoofd hoeft niet met een overdreven slogan te worden toegesproken. Het woont tenslotte al bij je."],
      vr:"Schrijf of kies een helpende zin.",
      r:[{t:"kies", key:"helpende_zin", opts:["Ik mag klein beginnen","Ik kan om steun vragen","Ik mag mijn wens serieus nemen"], eigen:"eigen zin", leeg:"later kiezen"}],
      op:"Neem die zin mee. Voel rustig hoe het is om hem op één gewone situatie toe te passen. Niets bijzonders voelen is ook een mogelijke ervaring."},
    {id:"3.06", t:"Naast de twijfel", img:"wintertuin-begin",
      tx:["Lou heeft de laatste letter op haar bord geschilderd. Hij staat een beetje scheef.",
          "Daaronder heeft ze geschreven:",
          "“Blijkbaar kan ik twijfelen en toch een letter afmaken.”",
          "Je legt jouw tegenstem en helpende zin naast elkaar. Beide kunnen nog in je hoofd opkomen. Jij hebt vandaag onderzocht wat je nodig hebt om verder te kunnen."],
      r:[{t:"toon", keys:["tegenstem","helpende_zin"], naast:true},
         {t:"tekst", key:"inzicht_3", label:"Wat ik mezelf wil herinneren als deze gedachte terugkomt…"}]}
  ]},

  /* ============ Wandeling 4 ============ */
  {n:4, t:"Ruimte voor wat ik wil", sub:"Je wens een plek geven in je aandacht, je tijd en je gewone week.", m:[
    {id:"4.01", t:"De kast van later", img:"kast",
      tx:["In de hal staat een kast open. Er liggen stapels spullen op de vloer.",
          "Op een doos staat “OOIT”. Daaronder heeft Lou geschreven: “Deze doos heb ik inmiddels twee keer verhuisd.”",
          "Vandaag onderzoek je waar jouw wens een plek kan krijgen. Een plek in je week, je aandacht of een kleine dagelijkse keuze."],
      r:[{t:"toon", keys:["verlangen","helpende_zin"], kop:"Hier wil ik ruimte voor maken"}],
      op:"Kijk naar wat er nu in jouw dagen past. Wat krijgt vanzelf aandacht en wat schuift vaak door? Observeer zonder meteen iets te veranderen."},
    {id:"4.02", t:"Waar mijn aandacht naartoe gaat", img:"tafel",
      tx:["Op de tafel ligt een lege weekkaart.",
          "Denk aan een gewone week. Sommige dingen liggen vast. Over andere dingen heb je een beetje te kiezen.",
          "Welk klein moment zou jouw wens kunnen krijgen? Een halfuur voor een plan. Een gesprek. Een rustige start. Of eerst tijd om te herstellen en na te denken."],
      r:[{t:"tekst", key:"ruimte_moment", label:"Een mogelijk moment voor mijn wens is…", alt:["Ik moet eerst ruimte of steun zoeken"]}],
      op:"Stel je dat moment in je echte week voor. Wat zou het mogelijk maken? Houd rekening met wat er nu werkelijk speelt."},
    {id:"4.03", t:"Wat mag iets minder?", img:"pad",
      tx:["Buiten ligt een smal tuinpad. Een overhangende tak neemt bijna alle ruimte in.",
          "Waar geef jij uit gewoonte meer tijd of aandacht aan dan je eigenlijk wilt? Misschien steeds bereikbaar zijn, vergelijken of een taak mooier maken dan nodig.",
          "Je mag één klein ding kiezen dat iets minder kan. Een complete levensverbouwing is vandaag niet ingepland."],
      r:[{t:"tekst", key:"minder_ruimte", label:"Ik wil iets minder ruimte geven aan…", alt:["Vandaag hoeft er niets weg"]}],
      op:"Onderzoek wat er zou veranderen als dit één keer wat minder mocht. Wat zou dat jou geven?"},
    {id:"4.04", t:"Een vriendelijke grens", img:"pension",
      tx:["Bij de tuinpoort hangt een briefje:",
          "“Een poort kan open én dicht.”",
          "Welke grens kan jouw wens helpen? Misschien een afspraak met jezelf, een verzoek om hulp of het uitspreken van wat je nodig hebt.",
          "Kies iets wat past bij jouw situatie en bij de mensen met wie je rekening wilt houden."],
      r:[{t:"tekst", key:"grens_of_verzoek", label:"Ik wil duidelijker zijn over…"}],
      op:"Stel je één gewoon gesprek of moment voor. Welke eenvoudige woorden zou je willen gebruiken?"},
    {id:"4.05", t:"De lege stoel", img:"wintertuin-midden",
      tx:["In de wintertuin staat één lege stoel. Er ligt een kaart op:",
          "“Voor wat aandacht verdient.”",
          "Je hoeft nog niet het hele einddoel binnen te halen om er ruimte voor te maken.",
          "Wat is er deze week wél beschikbaar? Een paar minuten, een idee, een telefoontje, iemand die mee kan denken?"],
      vr:"Kies één beschikbare mogelijkheid.",
      r:[{t:"kies", key:"beschikbare_mogelijkheid", opts:["tijd","informatie","een gesprek","steun","een kleine oefening","nog onderzoeken"], eigen:"eigen antwoord"}],
      op:"Loop verder met wat beschikbaar is. Hoe zou je daar iets kleins mee kunnen doen voor jouw wens?"},
    {id:"4.06", t:"Een plek gereserveerd", img:"wintertuin-midden",
      tx:["Lou heeft de stoel bij het raam gezet. De wintertuin is nog rommelig, maar er is nu een hoek waar je kunt zitten.",
          "Je eigen kaart krijgt ook een plek. Wat jij verlangt, mag tussen de gewone dingen van je leven komen te staan.",
          "Op de kast zit een nieuw etiket:",
          "“OOIT. Wordt momenteel uitgezocht.”"],
      r:[{t:"tekst", key:"ruimtekeuze", label:"Ik geef mijn wens ruimte door…", alt:["Eerst onderzoeken welke steun ik nodig heb"]}]}
  ]},

  /* ============ Wandeling 5 ============ */
  {n:5, t:"Lopen als de persoon die ik wil zijn", sub:"Je woorden oefenen in één kleine handeling en een afspraak met jezelf.", m:[
    {id:"5.01", t:"De brug", img:"brug",
      tx:["Een houten brug verbindt twee delen van de tuin. Op de leuning ligt jouw denkbeeldige toekomstkaart.",
          "Je neemt de woorden mee die bij jouw gewenste leven horen. Rust. Vrijheid. Verbinding. Of jouw eigen woorden.",
          "Vandaag oefen je met een kleine keuze die daarbij past. Ook in je huidige leven kun je daar soms al iets van ervaren."],
      vr:"Kies één toekomstwoord voor vandaag.",
      r:[{t:"kies", key:"oefenwoord", opts:A=>uniek(lijst(A.gevoelswoorden).concat(["rust","vrijheid","verbinding"])), eigen:"nieuw woord"}],
      op:"Neem jouw woord mee terwijl je loopt. Wat betekent het voor jou op deze gewone dag?"},
    {id:"5.02", t:"Hoe ik aanwezig wil zijn", img:"pad",
      tx:["Het pad wordt breder. Je hebt even ruimte om je heen.",
          "Hoe wil je aanwezig zijn als jouw gekozen woord meer plek krijgt? Misschien aandachtiger luisteren, rustiger kiezen of een idee uitspreken.",
          "Laat het passen bij jouw lichaam en je eigen manier van bewegen. Je hoeft nergens een indrukwekkende entree van te maken."],
      r:[{t:"tekst", key:"gewenst_gedrag", label:"Als ik vanuit dit woord leef, wil ik vaker…"}],
      op:"Probeer één klein onderdeel hiervan tijdens het lopen. Bijvoorbeeld je aandacht bij één ding houden of jezelf tijd gunnen. Je tempo mag hetzelfde blijven."},
    {id:"5.03", t:"Een situatie van vandaag", img:"kruispunt", beeld:true,
      tx:["Je stelt je een gewone situatie voor waarin je vaak op de automatische piloot reageert.",
          "Een bericht waarop je meteen antwoordt. Een idee dat je inslikt. Een moment waarop je jezelf vergeet.",
          "Wat zou een keuze zijn die beter bij jouw toekomstwoord past? Maak haar klein genoeg voor een echte, soms drukke dag."],
      r:[{t:"tekst", key:"oefensituatie", label:"Bij deze situatie wil ik iets anders proberen…"}],
      op:"Loop verder met die situatie. Stel je jouw kleine andere keuze voor. Hoe zou je beginnen?"},
    {id:"5.04", t:"Een stap die van mij is", img:"eik", thema:"s",
      tx:["Op een bankje ligt een leeg kaartje. Bovenaan staat:",
          "“Dit wil ik proberen.”",
          "Kies één handeling die binnen jouw invloed ligt. Een vraag stellen. Informatie zoeken. Een kwartier vrijhouden. Een gesprek voorstellen.",
          "Het hoeft geen bewijs te worden dat jij nu officieel een compleet vernieuwd mens bent. Een handeling is al een handeling."],
      r:[{t:"tekst", key:"kleine_stap", label:"Mijn kleine stap is…", alt:["Mijn stap is eerst rustig onderzoeken"]}],
      op:"Stel je voor dat je die eerste handeling uitvoert. Wat heb je daarvoor nodig?"},
    {id:"5.05", t:"Wanneer het gewone leven ertussenkomt", img:"pension",
      tx:["Voor de poort staat een gieter midden op het pad. Blijkbaar heeft Lou ook last van een echt huishouden.",
          "Je voornemen komt straks tussen gewone bezigheden terecht. Welk moment kan je eraan herinneren?",
          "Maak een eenvoudige afspraak met jezelf. Bijvoorbeeld: “Na de lunch schrijf ik tien minuten aan mijn idee.”"],
      r:[{t:"tekst", key:"actie_anker", label:"Als/na …, dan …", ph:"Na de lunch …"},
         {t:"tekst", key:"actie_moment", label:"Een dag of tijd, als je wilt.", kort:true},
         {t:"tekst", key:"plan_b", label:"Als het lastig wordt, kan ik…"}],
      op:"Neem je afspraak mee. Maak haar kleiner als dat helpt. Kijk ook of je ergens steun bij wilt vragen."},
    {id:"5.06", t:"Jouw afspraak", img:"tafel",
      tx:["Terug bij de tafel leg je jouw afspraak naast het toekomstbeeld.",
          "Je wens heeft nu een verbinding met een moment in jouw leven. Hoe die stap verloopt, kun je later onderzoeken.",
          "Lou heeft haar bord tegen de muur gezet:",
          "“OPEN. Ook als ik nog niet overal een antwoord op heb.”"],
      r:[{t:"toon", keys:["kleine_stap","actie_anker","actie_moment"]},
         {t:"kies", key:"actie_status", opts:["dit wil ik proberen","ik maak het kleiner","ik bewaar het als idee"]},
         {t:"tekst", key:"inzicht_5", label:"Dit wil ik mezelf meegeven…"}]}
  ]},

  /* ============ Wandeling 6 ============ */
  {n:6, t:"Zien wat er groeit", sub:"Eerlijk kijken hoe het ging, waarderen wat helpt en bijstellen.", m:[
    {id:"6.01", t:"Terug in de tuin", img:"wintertuin-midden",
      tx:["Er staat een raam open in de wintertuin. Op de tafel staan een paar jonge planten. Eén hangt nogal scheef.",
          "Lou heeft erbij geschreven:",
          "“Deze krijgt precies dezelfde aandacht als de rest. Blijkbaar had hij eigen plannen.”",
          "Vandaag kijk je naar jouw ervaring sinds de vorige wandeling. Je mag eerlijk aankomen met hoe het is gegaan."],
      vr:"Hoe is het gegaan?",
      r:[{t:"kies", key:"actie_ervaring", opts:TERUG.map(x=>x.v), terug:true}],
      op:"Merk op hoe je hierop reageert. Welke toon gebruik je tegen jezelf? Wat zou een prettige manier zijn om je ervaring te bekijken?"},
    {id:"6.02", t:"Wat er werkelijk gebeurde", img:"wintertuin-midden",
      tx:["Je loopt langs de planten. Sommige groeien zichtbaar, bij andere gebeurt er nog weinig boven de grond.",
          "Wat gebeurde er toen jij jouw stap probeerde, of eraan dacht? Wat leerde je over je tijd, je wens of wat je nodig hebt?",
          "Ook een voornemen dat niet is uitgevoerd kan iets bruikbaars laten zien."],
      r:[{t:"tekst", key:"actie_les", label:"Wat ik merkte of leerde…"}],
      op:"Neem één concrete ervaring mee. Kijk er nieuwsgierig naar. Wat hielp en wat maakte het lastig?"},
    {id:"6.03", t:"Iets om te waarderen", img:"eik",
      tx:["Op een bankje ligt een kaart:",
          "“Wat wil ik niet zomaar voorbij laten gaan?”",
          "Misschien een klein fijn moment, iemand die meedacht of het feit dat je opnieuw tijd voor jezelf maakt.",
          "Je kunt iets waarderen terwijl andere dingen nog moeilijk zijn. Je hoeft je dag daarvoor geen hoger cijfer te geven dan hij verdient."],
      r:[{t:"tekst", key:"waardering", label:"Vandaag waardeer ik…", alt:["Ik wil vandaag alleen even hier zijn"]}],
      op:"Geef dat ene moment of die ene persoon even aandacht. Als je niets kiest, merk dan eenvoudig op wat je om je heen ziet en hoort."},
    {id:"6.04", t:"Bijstellen hoort erbij", img:"pad",
      tx:["In de tuin is een pad een stukje verlegd. Er stond steeds water op.",
          "Op een paaltje staat:",
          "“Route aangepast. Bestemming nog bespreekbaar.”",
          "Past jouw wens nog? Was de stap passend? Misschien wil je hetzelfde blijven proberen, iets kleiner beginnen, hulp vragen of een andere richting onderzoeken."],
      vr:"Wat past nu het best?",
      r:[{t:"kies", key:"bijstelling", opts:["hetzelfde blijven proberen","een kleinere stap","eerst steun of informatie","mijn wens aanpassen","voorlopig laten rusten"]}],
      op:"Verken wat jouw keuze concreet zou betekenen. Wat wordt daarmee iets beter passend bij jouw leven?"},
    {id:"6.05", t:"Een stoel erbij", img:"wintertuin-midden",
      tx:["Bij de tafel staat een tweede stoel. Lou heeft iemand gevraagd mee te denken over de wintertuin.",
          "Jij hoeft ook niet alles alleen uit te zoeken.",
          "Wie of wat zou jou kunnen helpen? Een vertrouwd persoon, een bron van informatie, een praktische afspraak of iemand die ervaring heeft met jouw plan?"],
      r:[{t:"tekst", key:"steun", label:"Steun zou ik kunnen vinden bij…", hint:"Je kunt een rol invullen, zoals ‘een vriendin’ of ‘iemand met ervaring’. Een naam hoeft niet.", kort:true}],
      op:"Neem één vorm van steun in gedachten. Wat zou je willen vragen of opzoeken? Je kunt ook gewoon verder wandelen zonder een nieuwe opdracht."},
    {id:"6.06", t:"Een eerlijke bladzijde", img:"tafel",
      tx:["Je legt een nieuwe bladzijde op de tafel: wat je probeerde, wat je leerde en wat je wilt aanpassen.",
          "Daarmee wordt jouw reis persoonlijker. De volgende stap mag voortkomen uit jouw ervaring.",
          "Lou heeft bij de scheve plant een stokje gezet. Er staat geen inspirerende spreuk op. Soms is een stokje gewoon precies wat nodig is."],
      r:[{t:"tekst", key:"inzicht_6", label:"Wat ik wil behouden of aanpassen…"}]}
  ]},

  /* ============ Wandeling 7 ============ */
  {n:7, t:"Mijn leven, mijn richting", sub:"Afronden met je eigen toekomstkaart en een stap die bij je past.", m:[
    {id:"7.01", t:"De deur staat open", img:"wintertuin-eind",
      tx:["De deur van de wintertuin staat open. Er staan stoelen, planten en een tafel vol kaarten.",
          "Lou heeft een briefje opgehangen:",
          "“Vandaag begonnen. De andere ramen volgen later.”",
          "Jij komt terug met wat je onderweg hebt ontdekt. Misschien is jouw wens duidelijker. Misschien is hij veranderd. Vandaag geef je jouw eigen richting woorden."],
      r:[{t:"toon", keys:["verlangen"]},
         {t:"kies", key:"slotrichting", opts:["deze wens past nog","ik wil hem aanpassen","ik wil vooral bewaren wat ik heb ontdekt"], als:heeft("verlangen")},
         wensAanpassen("slotrichting", ["ik wil hem aanpassen"]),
         {t:"tekst", key:"verlangen", label:"Ik verlang naar…", als:A=>!heeft("verlangen")(A) && !A.slotrichting}],
      op:"Denk terug aan het begin van jouw reis. Wat zie je nu iets duidelijker? Wat mag nog openblijven?"},
    {id:"7.02", t:"Een dag die bij mij past", img:"tafel", beeld:true,
      tx:["Op de tafel ligt jouw kaart van een gewone toekomstige dag.",
          "Bekijk het detail dat je wilde onthouden, als je dat hebt bewaard. Misschien wil je nu iets anders toevoegen.",
          "Wat zou jouw dagen meer van jou laten voelen? Denk aan hoe je tijd doorbrengt, met jezelf omgaat en verbonden bent met wat jij belangrijk vindt."],
      r:[{t:"toon", keys:["toekomst_detail"]},
         {t:"tekst", key:"slot_toekomst", label:"Een leven dat meer bij mij past, heeft meer…"}],
      op:"Laat één passende situatie ontstaan. Kijk, voel of beschrijf in gedachten hoe jij daarin wilt handelen. Houd je aandacht ook bij het lopen en je omgeving."},
    {id:"7.03", t:"Wat ik zelf wil kiezen", img:"raam",
      tx:["Bij het raam liggen drie lege kaartjes. Er is plaats voor jouw belangrijkste woorden.",
          "Welke waarden wil jij vaker terugzien in jouw keuzes? Kies wat je werkelijk belangrijk vindt, ook als het bescheiden klinkt.",
          "Je kunt verlangen naar rust én avontuur. Je hoeft geen merkidentiteit van jezelf te maken."],
      vr:"Kies of bevestig maximaal drie richtingwoorden.",
      r:[{t:"kies", key:"richtingwoorden", multi:true, max:3, voor:A=>lijst(A.gevoelswoorden).slice(0,3),
          opts:A=>uniek(lijst(A.gevoelswoorden).concat(lijst(A.oefenwoord), WOORDEN)), eigen:"eigen woord"}],
      op:"Neem één woord mee. Welke keuze in jouw komende dagen zou daar een klein beetje meer bij passen?"},
    {id:"7.04", t:"De volgende haalbare stap", img:"kruispunt",
      tx:["Je komt opnieuw bij het kruispunt. Er ligt een blanco kaart op de wegwijzer.",
          "Wat wil je vanaf hier proberen? Je mag een eerdere stap herhalen, aanpassen of eerst om steun vragen.",
          "Kies iets binnen jouw invloed. Benoem wanneer je eraan wilt denken en wat je helpt als de week anders loopt dan gepland."],
      r:[{t:"tekst", key:"volgende_stap", label:"Mijn volgende stap", voor:A=>A.kleine_stap},
         {t:"tekst", key:"volgend_moment", label:"Mijn moment", voor:A=>A.actie_moment, kort:true},
         {t:"tekst", key:"volgende_steun", label:"Wat kan helpen", voor:A=>A.steun || A.plan_b}],
      op:"Loop een tijdje met jouw gekozen stap. Maak hem zo klein of duidelijk als nodig is. Je mag ook besluiten dat je eerst wilt rusten of onderzoeken."},
    {id:"7.05", t:"Een moment dat van mij is", img:"tafel",
      tx:["Bij de tafel brandt een kleine lamp. Er is verder niets wat je nu hoeft te regelen.",
          "Geef aandacht aan het feit dat je tijd voor jouw leven hebt gemaakt. Misschien voel je rust, zin, twijfel of weinig bijzonders.",
          "Je kunt iets meenemen uit deze reis zonder vandaag het hele resultaat te zien."],
      vr:"Hoe voel je je nu?",
      r:[{t:"kies", key:"slotgevoel", multi:true, opts:GEVOEL, eigen:"eigen woorden"},
         {t:"tekst", key:"slot_inzicht", label:"Dit neem ik mee…"}],
      op:"Dit laatste stuk mag gewoon een wandeling zijn. Merk de wereld om je heen op. Laat jouw gekozen woorden zachtjes op de achtergrond aanwezig zijn."},
    {id:"7.06", t:"Mijn toekomstkaart", img:"pension", kaart:true,
      tx:["Op de tafel ligt jouw toekomstkaart. Ze bestaat uit jouw wens, jouw woorden, iets wat je over jezelf ontdekte en de stap die je wilt proberen.",
          "Aan de groene deur hangt nog één briefje van Lou:",
          "“Je mag terugkomen met vooruitgang, omwegen of gewoon een hoofd vol gedachten. De thee is hetzelfde gebleven.”",
          "Je neemt jouw kaart mee. Vanaf hier gaat jouw eigen leven verder."],
      r:[]}
  ]}
  ];

  /* ---------- de wintertuin per wandeling ---------- */
  const TUIN = [
    "De wintertuin wacht nog: stoffige ramen en een lege kaart op het prikbord.",
    "Aankomen. Stoffige ramen, en op het prikbord hangt nu een kaart.",
    "Verbeelden. Eén raam is schoongemaakt; er valt ochtendlicht naar binnen.",
    "Onderzoeken. Lou heeft haar bord afgemaakt. De laatste letter staat een beetje scheef.",
    "Ruimte geven. Eén hoek is opgeruimd en er staat een stoel.",
    "Proberen. Er staat een tafel, met plaats voor jouw kaart.",
    "Leren. Jonge planten en een tweede stoel: ruimte voor steun.",
    "Meenemen. De deur staat open. De ruimte is bruikbaar en warm."
  ];

  /* ---------- de persoonlijke toekomstkaart (volgorde ligt vast) ---------- */
  const KAART = [
    {l:"Waar ik naar verlang", k:["verlangen"]},
    {l:"Waarom het belangrijk voor me is", k:["gevoelswoorden"]},
    {l:"Mijn gewone gewenste dag", k:["toekomst_detail","toekomst_ochtend","slot_toekomst"]},
    {l:"Mijn richtingwoorden", k:["richtingwoorden"]},
    {l:"Wat ik over mezelf ontdekte", k:["slot_inzicht","inzicht_6","inzicht_5","inzicht_3","inzicht_1"], kies:true},
    {l:"Mijn helpende zin", k:["helpende_zin"]},
    {l:"Waar ik ruimte voor maak", k:["ruimtekeuze"]},
    {l:"Mijn volgende kleine stap", k:["volgende_stap","kleine_stap"]},
    {l:"Mijn moment", k:["volgend_moment","actie_moment"]},
    {l:"Wat kan helpen", k:["volgende_steun","steun","plan_b"]}
  ];

  /* Beelden die in assets/wandeling/ staan (zonder .webp). Zolang een naam hier niet staat,
     toont het moment alleen tekst. Zie assets/wandeling/ARTWORK.md. */
  const BEELDEN = [];

  const T = {
    belofte:"Wandel met aandacht naar een leven dat meer van jou voelt.",
    site:"De weg naar morgen is een persoonlijke wandelreis langs jouw wensen, gedachten en mogelijkheden. Je leest korte stukjes, wandelt met aandacht en ontdekt welke kleine keuzes bij jouw gewenste leven passen. Warm, licht spiritueel en met af en toe een glimlach. Voor buiten, binnen en wandelen op de plaats.",
    vooraf:["Je loopt vandaag met je eigen leven in gedachten. Wat zou je willen voelen, ervaren of ruimte willen geven?",
            "Je leest af en toe een kort stukje. Daarna wandel je verder met één vraag of kleine oefening.",
            "Kies een plek waar je prettig kunt bewegen. Lees wanneer je stilstaat. Tijdens het lopen blijven je ogen open."],
    hint:"Een paar woorden is genoeg. Je kunt het ook bij jezelf houden.",
    prive:"Ik houd dit voor mezelf",
    priveNa:"Je woorden blijven bij jou.",
    past:"Deze vraag past nu niet",
    pastNa:"Laat deze vraag liggen. Wandel verder met wat vandaag wel bij je past.",
    beeldKnop:"Ik zie geen beeld",
    beeld:"Een toekomstbeeld mag ook uit woorden, een gedachte of een gevoel bestaan. Je kunt eenvoudig nadenken over hoe je een gewone situatie zou willen beleven. Je hoeft niets scherp voor je te zien.",
    leeg:"Je hebt tijd gemaakt om te wandelen en naar jouw eigen leven te kijken. Je kunt jouw woorden bij jezelf houden. Als je later iets wilt vastleggen, is hier ruimte.",
    slot:"Dit is jouw richting voor nu. Je mag blijven leren, bijstellen en opnieuw kiezen.",
    over:["Manifesteren betekent in deze reis: je bewust worden van een verlangen, een mogelijke toekomst verbeelden, je eigen waarden herkennen en handelen binnen de invloed die je hebt.",
          "Het verhaal nodigt uit tot hoop en nieuwsgierigheid. Het geeft geen garantie op geld, een relatie, gezondheid of andere uitkomsten van buitenaf. De keuzes en de vrijheid van andere mensen blijven bestaan.",
          "Het huis, Lou en de wintertuin zijn verzonnen. Je hebt geen echte kas, bank of boom nodig: elke plek waar je prettig kunt bewegen is goed."]
  };

  return {W, BEELDEN, THEMAS, TERUG, TERUG_PRIVE, LABEL, TUIN, KAART, T, GEVOEL};
})();
