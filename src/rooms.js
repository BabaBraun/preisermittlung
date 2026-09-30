/* ---------- Raumliste und Wohnfläche nach WoFlV --------------------------------------
   Anrechnung nach § 4 WoFlV (am Verordnungswortlaut geprüft):
     lichte Höhe ab 2 m voll, 1 bis unter 2 m zur Hälfte, unter 1 m gar nicht;
     unbeheizbare Wintergärten und Schwimmbäder zur Hälfte;
     Balkone, Loggien, Dachgärten, Terrassen in der Regel zu einem Viertel, höchstens zur Hälfte.
   Zubehörräume (Keller, Abstellräume außerhalb der Wohnung, Waschküche, Heizung, Garage)
   zählen nach § 2 Abs. 3 nicht. Kein pauschaler Putzabzug (§ 3).
   Steht bei den übrigen Tabellen-Bausteinen, weil compute() die Liste beim ersten Lauf braucht. */
const N_RL=40;
const RL_FAKTOREN=[
  ['voll',   1,    '100 % — lichte Höhe ab 2 m'],
  ['halb',   0.5,  '50 % — lichte Höhe 1 bis unter 2 m'],
  ['null',   0,    '0 % — lichte Höhe unter 1 m'],
  ['wg',     0.5,  '50 % — unbeheizter Wintergarten, Schwimmbad'],
  ['bal',    0.25, '25 % — Balkon, Loggia, Terrasse (Regelfall)'],
  ['balmax', 0.5,  '50 % — Balkon, Terrasse (Höchstsatz, begründen)'],
  ['zub',    0,    '0 % — Zubehörraum (Keller, Waschküche, Heizung, Garage)']
];
const RL_RAEUME=['Wohnzimmer','Esszimmer','Wohn-/Esszimmer','Küche','Schlafzimmer','Kinderzimmer','Arbeitszimmer',
  'Gästezimmer','Ankleide','Bad','Duschbad','Gäste-WC','Flur','Diele','Abstellraum','Hauswirtschaftsraum',
  'Balkon','Loggia','Terrasse','Dachterrasse','Wintergarten (beheizt)','Wintergarten (unbeheizt)',
  'Kellerraum','Abstellraum außerhalb der Wohnung','Waschküche','Heizungsraum','Garage','Dachboden'];
const RL_GESCHOSSE=['KG','UG','EG','1. OG','2. OG','3. OG','DG','Spitzboden'];

function rlFaktor(key){ let f=RL_FAKTOREN.find(x=>x[0]===key); return f?f[1]:1; }
function rlFaktorText(key){ let f=RL_FAKTOREN.find(x=>x[0]===key); return f?f[2]:RL_FAKTOREN[0][2]; }
/* Fläche direkt ("14,7") oder als Länge × Breite ("4,20 x 3,50", auch * oder ×) */
function rlFlaeche(s){
  s=(''+(s||'')).trim(); if(!s) return 0;
  let teile=s.split(/\s*[x×*]\s*/i).filter(t=>t!=='');
  if(teile.length===2) return parseNum(teile[0])*parseNum(teile[1]);
  return parseNum(s);
}
function buildRaumliste(){
  let tb=$('rl_tbl'); if(!tb) return;
  tb=tb.querySelector('tbody'); tb.innerHTML='';
  let fOpts=RL_FAKTOREN.map(f=>'<option value="'+f[0]+'">'+f[2]+'</option>').join('');
  let gOpts='<option value=""></option>'+RL_GESCHOSSE.map(g=>'<option>'+g+'</option>').join('');
  for(let i=0;i<N_RL;i++){
    tb.insertAdjacentHTML('beforeend',
      '<tr id="rl_row'+i+'">'
      +'<td><input id="rl_name'+i+'" type="text" list="rl_raeume" placeholder="Raum" aria-label="Raum '+(i+1)+': Bezeichnung" style="text-align:left" oninput="rlVorschlag('+i+')"><input type="hidden" id="rl_src'+i+'"></td>'
      +'<td><select id="rl_gesch'+i+'" aria-label="Raum '+(i+1)+': Geschoss">'+gOpts+'</select></td>'
      +'<td><input id="rl_fl'+i+'" type="text" placeholder="m² oder L x B" aria-label="Raum '+(i+1)+': Grundfläche"></td>'
      +'<td><select id="rl_faktor'+i+'" aria-label="Raum '+(i+1)+': Anrechnung" onchange="this.dataset.manuell=\'1\'">'+fOpts+'</select></td>'
      +'<td id="rl_wfl'+i+'" class="rl-erg">–</td></tr>');
  }
  let dl=$('rl_raeume'); if(dl) dl.innerHTML=RL_RAEUME.map(r=>'<option value="'+r+'">').join('');
}
/* Anrechnung aus der Raumbezeichnung vorschlagen — nur solange der Faktor noch auf dem
   Standard steht und nicht von Hand gewählt wurde */
function rlVorschlagKey(name){
  let n=(''+(name||'')).toLowerCase();
  if(/balkon|loggia|terrasse|dachgarten/.test(n)) return 'bal';
  if(/unbeheiz|schwimmbad|pool/.test(n)) return 'wg';
  if(/keller|waschk(ü|ue)che|heizungs|heizraum|garage|dachboden|bodenraum|trockenraum|au(ß|ss)erhalb/.test(n)) return 'zub';
  return 'voll';
}
function rlVorschlag(i){
  let sel=$('rl_faktor'+i); if(!sel||sel.dataset.manuell||sel.value!=='voll') return;
  let v=rlVorschlagKey($('rl_name'+i).value); if(v!=='voll') sel.value=v;
}
/* Zeilen als Liste lesen und kompakt zurückschreiben — für die Übernahme aus Grundrissen.
   src merkt sich, aus welchem Grundriss eine Zeile stammt, damit sie ersetzt werden kann. */
function rlLesen(){
  let a=[];
  for(let i=0;i<N_RL;i++){
    let n=$('rl_name'+i); if(!n) break;
    let z={name:n.value,gesch:$('rl_gesch'+i).value,fl:$('rl_fl'+i).value,faktor:$('rl_faktor'+i).value,
      src:($('rl_src'+i)||{}).value||'',manuell:!!$('rl_faktor'+i).dataset.manuell};
    if(z.name.trim()||z.fl.trim()) a.push(z);
  }
  return a;
}
function rlSchreiben(a){
  for(let i=0;i<N_RL;i++){
    if(!$('rl_name'+i)) break;
    let z=a[i]||{name:'',gesch:'',fl:'',faktor:'voll',src:'',manuell:false}, f=$('rl_faktor'+i);
    $('rl_name'+i).value=z.name; $('rl_gesch'+i).value=z.gesch||''; $('rl_fl'+i).value=z.fl;
    f.value=z.faktor||'voll'; if(z.manuell) f.dataset.manuell='1'; else delete f.dataset.manuell;
    $('rl_src'+i).value=z.src||'';
  }
  $('rl_visible').value=Math.max(5,Math.min(N_RL,a.length+1));
  renderRLRows();
}
function renderRLRows(){
  let vis=Math.max(5,Math.min(N_RL,parseInt(num('rl_visible'))||5));
  for(let i=0;i<N_RL;i++){
    let r=$('rl_row'+i); if(!r) continue;
    let hat=(($('rl_name'+i).value||'').trim()!=='')||(($('rl_fl'+i).value||'').trim()!=='');
    r.style.display=(i<vis||hat)?'':'none';
  }
}
function addRLRow(){
  let vis=Math.max(5,Math.min(N_RL,parseInt(num('rl_visible'))||5));
  $('rl_visible').value=Math.min(vis+1,N_RL); renderRLRows();
  let neu=$('rl_name'+Math.min(vis,N_RL-1)); if(neu) neu.focus();
}
function rlDaten(){
  let zeilen=[], grund=0, wfl=0;
  for(let i=0;i<N_RL;i++){
    if(!$('rl_fl'+i)) break;
    let g=rlFlaeche($('rl_fl'+i).value); if(!(g>0)) continue;
    let key=$('rl_faktor'+i).value, f=rlFaktor(key);
    zeilen.push({i:i, name:($('rl_name'+i).value||'').trim()||('Raum '+(i+1)), gesch:$('rl_gesch'+i).value,
      grund:g, key:key, faktor:f, wfl:g*f, ausdruck:/[x×*]/i.test($('rl_fl'+i).value)});
    grund+=g; wfl+=g*f;
  }
  return {zeilen:zeilen, grund:grund, wfl:wfl};
}
/* Läuft am Anfang von compute(): Summen bilden und — nur wenn der Schalter an ist —
   die Wohnfläche der Eckdaten füllen. Sonst bleibt das Eckdatenfeld frei beschreibbar. */
function raumlisteSync(){
  if(!$('rl_name0')) return;
  let d=rlDaten();
  for(let i=0;i<N_RL;i++){
    let z=d.zeilen.find(x=>x.i===i), zelle=$('rl_wfl'+i); if(!zelle) continue;
    if(!z){ zelle.textContent='–'; continue; }
    zelle.innerHTML='<b>'+num2(z.wfl)+'</b>'+((z.faktor!==1||z.ausdruck)?'<span class="rl-von">von '+num2(z.grund)+' m²</span>':'');
  }
  let n=d.zeilen.length;
  setT('o_rl_grund', n?num2(d.grund)+' m²':'–');
  setT('o_rl_wfl', n?num2(d.wfl)+' m²':'–');
  let aktiv=$('rl_aktiv').checked, feld=$('ek_wohnflaeche');
  let uebernehmen=aktiv&&n>0;
  if(uebernehmen) feld.value=num2(d.wfl);
  feld.readOnly=uebernehmen;
  feld.classList.toggle('aus-raumliste',uebernehmen);
  feld.title=uebernehmen?'Wird aus der Raumliste im Aufnahmebogen übernommen':'';
  let manuell=num('ek_wohnflaeche'), hint='';
  if(uebernehmen) hint='Die Wohnfläche in den Eckdaten wird aus dieser Liste übernommen. Zum freien Eintragen den Schalter ausschalten — der Wert bleibt dann stehen und ist wieder änderbar.';
  else if(aktiv) hint='Noch keine Räume mit Fläche erfasst — bis dahin gilt der in den Eckdaten eingetragene Wert.';
  else if(n&&manuell>0){
    let abw=(d.wfl-manuell)/manuell*100;
    hint='Die Raumliste ergibt '+num2(d.wfl)+' m², in den Eckdaten stehen '+num2(manuell)+' m²'
      +(Math.abs(abw)>=0.5?' — Abweichung '+(abw>0?'+':'')+num2(abw)+' %.':' — stimmt überein.');
  }
  else if(n) hint='Die Raumliste ergibt '+num2(d.wfl)+' m². Mit dem Schalter wird sie als Wohnfläche übernommen.';
  else hint='Die Wohnfläche wird in den Eckdaten frei eingetragen. Wer Raum für Raum misst, erfasst die Räume hier und schaltet die Übernahme ein.';
  setT('rl_modus_hint',hint);
  let eh=$('rl_eck_hint');
  if(eh){
    if(uebernehmen) eh.innerHTML='aus der Raumliste (①b) · <a href="#" onclick="rlZurListe();return false;">ansehen</a>';
    else if(n) eh.innerHTML='Raumliste: '+num2(d.wfl)+' m² · <a href="#" onclick="rlUebernehmen();return false;">übernehmen</a>';
    else eh.innerHTML='';
  }
  renderRLRows();
}
function rlUebernehmen(){ $('rl_aktiv').checked=true; compute(); autosave(); }
function rlZurListe(){ let t=$('rl_tbl'); if(t) appScrollIntoView(t,{behavior:'smooth',block:'center'}); }
/* Bericht: Aufstellung nach WoFlV, mit Hinweis ob die angesetzte Wohnfläche daraus stammt */
function raumlisteBericht(esc){
  let d=rlDaten(); if(!d.zeilen.length) return '';
  let zeilen=d.zeilen.map(z=>'<tr><td>'+esc(z.name)+(z.gesch?' <span style="color:#5E6F88">('+esc(z.gesch)+')</span>':'')+'</td>'
    +'<td>'+num2(z.grund)+' m²</td><td>'+esc(rlFaktorText(z.key).split(' — ')[0])+'</td><td>'+num2(z.wfl)+' m²</td></tr>').join('');
  let angesetzt=num('ek_wohnflaeche'), ausListe=$('rl_aktiv').checked;
  let satz= ausListe ? 'Die angesetzte Wohnfläche von '+num2(angesetzt)+' m² ist dieser Aufstellung entnommen.'
    : (angesetzt>0 && Math.abs(angesetzt-d.wfl)>=0.01 ? 'Angesetzt wurde abweichend eine Wohnfläche von '+num2(angesetzt)+' m² (lt. Eckdaten).' : '');
  return '<h3>Wohnflächenberechnung nach WoFlV</h3><table>'
    +'<tr><td><b>Raum</b></td><td><b>Grundfläche</b></td><td><b>Anrechnung</b></td><td><b>Wohnfläche</b></td></tr>'
    +zeilen+'<tr class="total"><td>Summe</td><td>'+num2(d.grund)+' m²</td><td></td><td>'+num2(d.wfl)+' m²</td></tr></table>'
    +'<div class="beschr">Grundflächen nach lichten Maßen (§ 3 WoFlV), Anrechnung nach § 4 WoFlV.'+(satz?' '+satz:'')
    +(GRUNDRISSE.length?' Grundrisse siehe Abschnitt „Grundrisse“.':'')+'</div>';
}

/* Anleitung für Claude — wortgleich mit GRUNDRISS-ANLEITUNG.md, per Skript eingesetzt */
const GR_ANLEITUNG="# Grundriss digitalisieren für die ImmoApp\n\nDu bekommst ein Foto oder PDF eines Grundrisses. Zeichne ihn als Daten nach, aus denen die ImmoApp einen\nsauberen, maßstabsgetreuen Plan zeichnet und die Wohnfläche übernimmt. Genauigkeit geht vor Tempo: Die Maße\nsind wichtiger als das Aussehen.\n\n## Ablauf\n\n1. **Sichten.** Welches Geschoss? Welcher Maßstab? Sind Maße eingetragen (Maßketten außen, Innenmaße, Tür- und\n   Fenstermaße)? Stehen Flächen an den Räumen oder in einer Flächentabelle? Gibt es einen Nordpfeil?\n   Mehrere Geschosse auf einem Blatt: je Geschoss ein eigener Plan.\n2. **Koordinaten aufbauen.** Ursprung (0, 0) ist die linke obere Außenecke des Gebäudes, x nach rechts, y nach\n   unten, alles in **Zentimetern**. Eine hochgestellte 5 ist ein halber Zentimeter: 3,76⁵ = 376,5 · 36⁵ = 36,5 ·\n   11⁵ = 11,5. Maße unter 1 m stehen in Plänen meist in cm (24 = 24 cm), darüber in m (2,01 = 201 cm).\n   - Die Außenmaßketten (oben, unten, links, rechts) aufaddieren: So entstehen die x- und y-Lagen aller Wände.\n   - Innenmaße und Innenmaßketten nutzen, um die inneren Wände zu setzen.\n   - **Prüfen:** Die Summe der Teilmaße muss das Gesamtmaß ergeben, obere und untere Kette dieselbe\n     Gebäudelänge. Widersprüche nicht glätten, sondern melden.\n   - Fehlt ein einzelnes Maß, aus den Proportionen des Bildes ableiten und in `hinweise` als geschätzt\n     nennen. Übliche Wandstärken: Außenwand 30–36,5 cm (Altbau bis 50), tragende Innenwand 17,5–24 cm,\n     nichttragende 10–11,5 cm.\n   - **Eine Maßzahl, die du nicht sicher lesen kannst, erfindest du nicht:** Frag nach.\n3. **Räume** als Rechteck `\"r\": [x, y, Breite, Tiefe]` mit den lichten Maßen zwischen den Wänden. Nicht\n   rechteckige Räume als Polygon `\"poly\": [[x, y], …]`. Balkon, Loggia und Terrasse liegen außerhalb der\n   Außenwand und bekommen `\"aussen\": true`. Raumnamen innerhalb eines Plans eindeutig halten\n   („Kind 1“, „Kind 2“). Treppenlöcher und Lufträume sind keine Räume: dafür `texte` verwenden.\n4. **Flächen.** Steht im Plan eine Fläche am Raum oder in einer Flächentabelle, trägst du sie genau als\n   `\"flaeche_plan\"` in m² ein. Maßgeblich ist die volle Grundfläche. Steht nur eine schon anteilig\n   angerechnete Fläche da (z. B. Balkon „½“), rechnest du sie auf die volle Fläche zurück und schreibst das in\n   `hinweise`. Räume ohne Flächenangabe bekommen kein `flaeche_plan`, die App rechnet dann aus den Maßen.\n5. **Anrechnung nach § 4 WoFlV** in `\"anrechnung\"`: `voll` (Regelfall, kann entfallen), `halb` (lichte Höhe\n   1 bis unter 2 m), `null` (unter 1 m), `wg` (unbeheizter Wintergarten, Schwimmbad), `bal` (Balkon, Loggia,\n   Terrasse: ein Viertel), `balmax` (Balkon mit der Hälfte, nur wenn der Plan so rechnet), `zub` (Keller,\n   Waschküche, Heizung, Garage, Abstellraum außerhalb der Wohnung). Weist der Plan bei Dachschrägen\n   Teilflächen aus, trägst du sie als `\"teile\"` ein (siehe Format).\n6. **Türen und Fenster** am besten bezogen auf einen Raum:\n   `{\"art\": \"tuer\", \"raum\": \"Flur\", \"seite\": \"oben\", \"ab\": 35, \"b\": 88.5, \"band\": \"anfang\", \"auf\": \"innen\"}`\n   - `seite`: Wand des Raumes, wie im Bild gesehen: `oben`, `unten`, `links`, `rechts`.\n   - `ab`: Abstand in cm von der linken Innenecke (bei `oben`/`unten`) bzw. der oberen Innenecke\n     (bei `links`/`rechts`) des Raumes bis zum Beginn der Öffnung.\n   - `b`: Rohbaubreite in cm. Türmaß 88⁵/2,01 ergibt `\"b\": 88.5`, Fenster 1,26/1,38⁵ ergibt `\"b\": 126`.\n   - `band`: Seite der Türbänder, `anfang` (links bzw. oben) oder `ende` (rechts bzw. unten).\n   - `auf`: `innen` schlägt in diesen Raum auf, `aussen` in den Nachbarraum bzw. nach draußen.\n   - `art`: `tuer`, `doppeltuer`, `schiebetuer`, `durchgang` (Öffnung ohne Tür), `fenster`,\n     `fenstertuer` (Terrassen- oder Balkontür).\n   - Jede Öffnung nur einmal angeben, bei einem der beiden Räume. Die Wandstärke ermittelt die App selbst.\n   - Liegt eine Öffnung an keinem Raum sinnvoll an, geht auch die Lage direkt:\n     `{\"art\": \"tuer\", \"r\": [x, y, Breite, Wanddicke], \"band\": \"anfang\", \"auf\": \"unten\"}`.\n7. **Treppen**: `{\"r\": [x, y, Breite, Länge], \"stufen\": 15, \"lauf\": \"oben\"}`. `lauf` ist die Richtung, in\n   die es hinaufgeht. Gewendelte Treppen bekommen zusätzlich `\"form\": \"gewendelt\"`.\n8. **Einrichtung**, nur wenn im Plan eingezeichnet: `{\"art\": \"wc\", \"r\": [x, y, b, t], \"wand\": \"rechts\"}`.\n   `wand` ist die Seite, an der das Objekt steht. Arten: `wc`, `waschtisch`, `dusche`, `wanne`, `spuele`,\n   `herd`, `kuehlschrank`, `kueche` (Arbeitsplatte), `waschmaschine`, `kamin`, `sonstiges` (mit `\"text\"`).\n9. **Hilfslinien** wie die 1-m- und 2-m-Linie bei Dachschrägen: `{\"p\": [x1, y1, x2, y2], \"text\": \"2 m\"}`.\n   **Freie Beschriftungen**: `{\"x\": …, \"y\": …, \"text\": \"Luftraum\"}`.\n10. **Plan ohne Maße.** Proportionen aus dem Bild übernehmen und mit einer plausiblen Annahme in cm umrechnen\n    (z. B. Innentür 88,5 cm breit). Setze `\"massstab\": false` und bitte um ein bekanntes Maß, z. B. eine\n    Außenlänge. Nennt der Nutzer eines, rechnest du alles um und setzt `\"massstab\": true`.\n11. **Schlussprüfung.** Für jeden Raum mit `flaeche_plan`: Breite × Tiefe aus `r` muss zur Flächenangabe\n    passen. Weicht es um mehr als 3 % ab, stimmt meist eine Koordinate nicht. Suche den Fehler, bevor du\n    antwortest. Ältere Pläne rechnen manchmal mit 3 % Putzabzug (II. BV): Das ist dann kein Lesefehler und\n    gehört in `hinweise`.\n\n## Antwort\n\n1. Kurz, welche Maße du gelesen hast: Außenketten und Räume, gern als kleine Tabelle. Dazu das Ergebnis der\n   Prüfungen und was geschätzt ist.\n2. Rückfragen, wenn etwas unleserlich oder widersprüchlich ist. Lieber fragen als raten.\n3. Zum Schluss **genau ein Codeblock** mit dem JSON, ohne Kommentare und ohne weiteren Text im Block. Der\n   Nutzer kopiert ihn in die ImmoApp (Aufnahmebogen → Grundrisse → Grundriss einfügen).\n\n## Format (vollständiges Beispiel)\n\n```json\n{\n  \"immoapp_grundriss\": 1,\n  \"grundrisse\": [{\n    \"geschoss\": \"EG\",\n    \"titel\": \"Erdgeschoss\",\n    \"quelle\": \"Bauantrag 1996, M 1:100\",\n    \"massstab\": true,\n    \"nord\": 0,\n    \"umriss\": [[0,0],[624,0],[624,449],[0,449]],\n    \"raeume\": [\n      {\"name\": \"Wohnen\", \"r\": [36.5,36.5,363.5,376], \"flaeche_plan\": 13.67},\n      {\"name\": \"Bad\", \"r\": [411.5,36.5,176,376], \"flaeche_plan\": 6.62},\n      {\"name\": \"Terrasse\", \"r\": [36.5,449,363.5,250], \"aussen\": true, \"anrechnung\": \"bal\", \"flaeche_plan\": 9.09}\n    ],\n    \"oeffnungen\": [\n      {\"art\": \"tuer\", \"raum\": \"Bad\", \"seite\": \"links\", \"ab\": 40, \"b\": 76, \"band\": \"anfang\", \"auf\": \"innen\"},\n      {\"art\": \"fenstertuer\", \"raum\": \"Wohnen\", \"seite\": \"unten\", \"ab\": 80, \"b\": 101, \"band\": \"ende\", \"auf\": \"innen\"},\n      {\"art\": \"fenster\", \"raum\": \"Wohnen\", \"seite\": \"oben\", \"ab\": 100, \"b\": 126},\n      {\"art\": \"fenster\", \"raum\": \"Bad\", \"seite\": \"rechts\", \"ab\": 150, \"b\": 63.5}\n    ],\n    \"treppen\": [],\n    \"einrichtung\": [\n      {\"art\": \"wc\", \"r\": [522.5,290,65,40], \"wand\": \"rechts\"}\n    ],\n    \"linien\": [],\n    \"texte\": [],\n    \"hinweise\": []\n  }]\n}\n```\n\nWeitere Felder:\n- `geschoss`: `KG`, `UG`, `EG`, `1. OG`, `2. OG`, `3. OG`, `DG` oder `Spitzboden`.\n- `nord` (optional): Richtung des Nordpfeils in Grad, 0 = nach oben, 90 = nach rechts.\n- `umriss`: Außenkante des Gebäudes als Polygon. Bei mehreren Baukörpern eine Liste von Polygonen.\n- `teile` (optional, an einem Raum), z. B. bei Dachschrägen:\n  `\"teile\": [{\"name\": \"ab 2 m\", \"flaeche_plan\": 11.2}, {\"name\": \"1–2 m\", \"flaeche_plan\": 4.1, \"anrechnung\": \"halb\"}]`.\n  Dann erscheinen die Teile einzeln in der Raumliste.\n- `liste: false` (optional, an einem Raum): Der Raum wird gezeichnet, aber nicht in die Raumliste übernommen.\n\n## Korrekturen\n\nSchickt der Nutzer einen vorhandenen Code mit einem Änderungswunsch, änderst du nur das Gewünschte, behältst\n`id` und alle übrigen Angaben bei und gibst den vollständigen Code erneut aus.";
