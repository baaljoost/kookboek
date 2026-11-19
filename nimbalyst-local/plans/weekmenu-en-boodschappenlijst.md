---
planStatus:
  planId: plan-weekmenu-boodschappenlijst
  title: Weekmenu en boodschappenlijst
  status: in-development
  planType: feature
  priority: high
  owner: joost
  stakeholders: []
  tags: [weekmenu, boodschappenlijst, auth, mobiel]
  created: "2026-11-19"
  updated: "2026-11-19T11:00:00.000Z"
  progress: 80
---

# Plan: weekmenu en boodschappenlijst

Status: **wacht op akkoord**. Er is nog geen code geschreven, geen branch aangemaakt en geen databaseactie uitgevoerd.

## 1. Wat ik controleerde

### 1.1 Beheerlogin: nog steeds onveilig

Ja, de cookie wordt nog op een vaste waarde gecontroleerd. Wie in zijn browser een cookie `kookboek_admin=authenticated` zet, is ingelogd, zonder wachtwoord.

| Waar | Bevinding |
| --- | --- |
| `lib/auth.ts`, `middleware.ts`, `proxy.ts` | Alle drie vergelijken met de vaste tekst `"authenticated"`. |
| `middleware.ts` | Dit bestand is actief (Next 15.5). `proxy.ts` is de naam uit Next 16 en wordt niet gelezen; het is dode, afwijkende kopie van dezelfde controle. |
| `lib/modus.ts` | Een tweede cookie `kookboek_modus=beheerder`, ook ongetekend. Hij bepaalt nu welke knoppen je ziet (bijv. "Recept toevoegen"). Dat is een weergavevoorkeur en geen login, dus daar mag het weekmenu niet op leunen. |
| `app/api/auth` en `app/api/admin/login` | Twee loginroutes met verschillende gedrag (`password` of `wachtwoord`, sessiecookie of 30 dagen, wel of geen `secure`). Wachtwoordvergelijking is niet constant-time, geen rem op pogingen. |

Daarom doe ik, na akkoord en vóór alle andere onderdelen, een kleine eerste commit:

**Voorstel: getekende sessiecookie**
- Nieuw bestand `lib/sessie.ts`: `maakSessieToken()` en `controleerSessieToken(token)`. Het token is `<verloopdatum>.<HMAC-SHA256>`, getekend met een nieuwe omgevingsvariabele `SESSION_SECRET` (willekeurig, minstens 32 bytes). Web Crypto, dus het werkt in de middleware én in routes. Vergelijken via `crypto.subtle.verify` (constant-time).
- Eén hulpfunctie `isIngelogd()` voor pagina's en routes, en dezelfde controle in `middleware.ts`.
- Beide loginroutes gebruiken dezelfde functie: httpOnly, `secure` in productie, `sameSite=lax`, 30 dagen. Wachtwoord vergelijken met `timingSafeEqual`.
- `proxy.ts` weg (dode code), de vaste waarde `SESSION_VALUE` weg.
- Zonder `SESSION_SECRET` weigert inloggen (zoals nu al bij `ADMIN_PASSWORD`): de login faalt dicht, nooit open.
- Tests in `lib/sessie.test.ts`: goed token, aangepast token, verlopen token, ander geheim, leeg token, de oude waarde `authenticated`.
- Het weekmenu gebruikt alleen `isIngelogd()`. De modus-cookie blijft zoals hij is, voor wat hij nu doet.

**Wat jij moet doen:** `SESSION_SECRET` toevoegen in `.env`/`.env.local` (die maak ik niet voor je) en in Vercel (Production en Preview), vóór de eerste deploy van deze code. Daarna ben je één keer uitgelogd en moet je opnieuw inloggen; oude cookies met `authenticated` werken niet meer.

**Zelfde soort gaten die ik tegenkwam, buiten dit plan.** Ik pas ze niet aan zonder jouw akkoord, maar je moet ze weten:
- `middleware.ts` laat `/api/admin/importeer` en `/api/admin/recepten/<id>/fotos` zonder login door. De eerste haalt willekeurige URL's op en kan de Claude-API aanroepen; de tweede laat iedereen foto's toevoegen en verwijderen.
- `DELETE /api/recepten/<slug>/opmerkingen` verwijdert zonder enige controle een opmerking.
- `GET /api/debug` is openbaar en toont of en hoe lang het wachtwoord is.
- Dit staat al in je eerdere plan, maar het blijft belangrijk: `.claude/settings.local.json` staat in een publieke repo en bevat de productie-databaseURL met wachtwoord.

### 1.2 Nieuwe API-routes

Elke route voor het mandje, de lijst en de deellink-beheerpagina controleert zelf `isIngelogd()` in de route, náást de middleware (die dekt alleen `/api/admin/*` en `/admin/*`; ik breid hem uit met `/week/*`). Het verbergen van knoppen is nooit de beveiliging. Routes voor de deellink controleren de code in de route, en raken het mandje niet.

### 1.3 Andere bevindingen die het ontwerp raken

- **`PortieSchuif` is geen losse −/+ knop.** Het component bevat ook de ingrediëntenlijst en houdt de porties intern bij. Voor `/week` haal ik het −/+ deel eruit als `components/PortieKiezer.tsx` (props: `porties`, `standaard`, `onChange`). `PortieSchuif` gebruikt dat zelf ook, dus op de receptpagina verandert niets zichtbaars.
- **Olijfolie staat in de productlijst als `altijdInHuis`** (net als zout, zwarte peper, peper en zout en water; 5 van 300). Jouw voorbeeld "2 el + 100 ml olijfolie" komt met de huidige data dus onder "Check voorraad" zonder hoeveelheid. De optelregel zie je daarom in de voorbeelden hieronder met melk. Wil je olijfolie wel op de lijst, dan is dat een datawijziging in `data/producten.json` plus een laadrun, geen codewijziging.
- **Naamconflict "Overig".** Afdeling `overig` bestaat al in `lib/afdelingen.ts`. Ik toon niet-gekoppelde ingrediënten in hetzelfde blok "Overig" (producten met afdeling overig eerst, dan de ongekoppelde met hun tekst), zodat er geen twee blokken met dezelfde naam komen.
- **`SchermWakeLock` heeft een bestaande fout.** De `visibilitychange`-handler leest een verouderde `isActive` en wordt nooit opgeruimd. Browsers laten de wake lock los zodra je de app verlaat; hij wordt niet teruggezet terwijl de knop "Scherm blijft aan" blijft tonen. Jij zei dat de werking gelijk blijft, dus ik laat dit zoals het is en pas alleen de vorm aan. Zeg het als je het wilt laten oplossen (aparte commit).
- **De branch `ingredienten-standaardiseren` staat 10 commits vóór `main`** en bevat `Product`, de eenheden en de koppeling waar dit op bouwt. Mijn branch wordt dus gestapeld op die branch.
- **De Neon-testbranch `ingredienten-test` verloopt op 2026-11-24**, over vijf dagen. Voor dat moment moet je hem verlengen of een nieuwe maken (ik heb geen Neon-rechten in deze sessie).
- Er is nog niets van een weekmenu in de code. In `kookboek-requirements.md` staat "Maaltijdplanner of boodschappenlijst" nog onder "Out of scope"; dat moet bij het afronden worden bijgewerkt.

## 2. Datamodel

Alleen toevoegingen: geen kolom of tabel verandert of verdwijnt. `Recept` krijgt twee relatievelden, die geen kolom in de database zijn.

```prisma
// Het mandje: de recepten die je deze week eet.
model WeekItem {
  id        Int      @id @default(autoincrement())
  receptId  Int      @unique            // een recept staat maximaal één keer in het mandje
  recept    Recept   @relation(fields: [receptId], references: [id], onDelete: Cascade)
  porties   Int?                         // gekozen porties; null = recept heeft geen porties (factor 1)
  createdAt DateTime @default(now())
}

// "Nieuwe week" bewaart hier de recepten van die week.
model WeekGeschiedenis {
  id          Int      @id @default(autoincrement())
  afgerondOp  DateTime @default(now())   // alle regels van één "Nieuwe week" delen exact dezelfde waarde
  receptId    Int?
  recept      Recept?  @relation(fields: [receptId], references: [id], onDelete: SetNull)
  receptTitel String                     // kopie van de titel, voor als het recept wordt verwijderd
  porties     Int?
  @@index([afgerondOp])
}

// Eigen regels op de lijst ("wc-papier").
model LijstRegel {
  id        Int      @id @default(autoincrement())
  tekst     String
  createdAt DateTime @default(now())
}

// Een vinkje: de rij bestaat = afgevinkt. Geen relaties, alleen de sleutel van de regel.
model LijstVink {
  sleutel   String   @id
  createdAt DateTime @default(now())
}

// De geheime deellink. Eén rij.
model DeelLink {
  id         Int      @id @default(1)
  code       String   @unique
  createdAt  DateTime @default(now())
  vernieuwdOp DateTime @default(now())
}
```

- Er is één mandje en één lijst (jij bent de enige gebruiker), dus geen gebruikers- of weekkolom.
- De code staat leesbaar in de database, omdat je de link in beheer moet kunnen tonen. Het is een code van 24 willekeurige bytes (`crypto.randomBytes`, base64url, 32 tekens).
- Elke schematoevoeging komt in de commit die hem gebruikt. Per push naar een database laat ik eerst de SQL zien (offline met `prisma migrate diff` tussen twee schemabestanden, zonder verbinding) en wacht ik op jouw bevestiging per keer.

## 3. Routes

**Pagina's**

| Pagina | Wie | Doel |
| --- | --- | --- |
| `/week` | ingelogd (anders redirect naar `/admin/login`) | het mandje |
| `/week/lijst` | ingelogd | de boodschappenlijst |
| `/lijst/<code>` | iedereen met de code; anders 404 | de lijst via de deellink |
| `/admin/deellink` | ingelogd | link tonen, kopiëren, vernieuwen |

**API, ingelogd** (onder `/api/admin/`, dus middleware plus controle in de route)

| Methode en pad | Doet |
| --- | --- |
| `POST /api/admin/week` `{receptId}` | recept in het mandje, porties = die van het recept; opnieuw aanroepen verandert niets |
| `PUT /api/admin/week/<receptId>` `{porties}` | porties wijzigen (geheel getal 1 t/m 99) |
| `DELETE /api/admin/week/<receptId>` | recept uit het mandje |
| `POST /api/admin/week/nieuw` | in één transactie: mandje naar `WeekGeschiedenis` (zelfde `afgerondOp`), daarna mandje, `LijstVink` en `LijstRegel` leeg. Een leeg mandje bewaart niets. |
| `GET /api/admin/week/lijst` | berekende lijst en afgevinkte sleutels |
| `POST /api/admin/week/lijst/vink` `{sleutel, aan}` | vinkje zetten of weghalen |
| `POST /api/admin/week/lijst/regels` `{tekst}` | eigen regel toevoegen |
| `DELETE /api/admin/week/lijst/regels/<id>` | eigen regel verwijderen (en zijn vinkje) |
| `GET` en `POST /api/admin/deellink` | tonen; `POST` maakt een nieuwe code, de oude geldt direct niet meer |

**API, deellink** (onder `/api/lijst/<code>/`, geen login, code wordt in elke route gecontroleerd)

| Methode en pad | Doet |
| --- | --- |
| `GET /api/lijst/<code>` | berekende lijst en vinkjes |
| `POST /api/lijst/<code>/vink` | vinkje zetten of weghalen; alleen sleutels die nu op de lijst staan |
| `POST /api/lijst/<code>/regels` | eigen regel toevoegen |

Er is geen route met de code die het mandje wijzigt, en geen verwijderroute voor eigen regels (zie keuzes). Een onbekende of oude code geeft overal 404, zonder te zeggen of de code ooit bestond.

Maatregelen voor de deellink: tekst van een eigen regel maximaal 80 tekens en maximaal 100 eigen regels; de pagina krijgt `noindex`, `Referrer-Policy: no-referrer` en `Cache-Control: no-store`, en de linkpreview in chatapps toont een algemene titel zonder lijstinhoud.

## 4. Rekenregels van de lijst

De berekening is één pure functie in `lib/boodschappenlijst.ts`, zonder database en zonder React, met tests in `lib/boodschappenlijst.test.ts`. De server haalt mandje, ingrediënten (met product), eigen regels en vinkjes op in `lib/lijstData.ts` en geeft ze aan die functie. De uitkomst is de lijst per sectie; wat is afgevinkt voegt de weergave er los aan toe.

Regels, in deze volgorde:

1. **Schalen.** Factor per recept = gekozen porties ÷ porties van het recept. Heeft het recept geen porties, dan is de factor 1.
2. **Altijd in huis.** Heeft het product `altijdInHuis`, dan komt het onder "Check voorraad": één regel per product, zonder hoeveelheid, ongeacht eenheid of aantal recepten.
3. **Gekoppeld product: optellen per product en eenheidsgroep.**
   - Gewicht: g, kg (1 kg = 1000 g).
   - Volume: ml, l, el, tl (1 l = 1000 ml, 1 el = 15 ml, 1 tl = 5 ml).
   - Elke andere eenheid (blik, teen, bos, pot, cm, takje, …) is een eigen groep per eenheid. "stuk" en een lege eenheid tellen als dezelfde groep.
   - Een product met meerdere groepen krijgt per groep een eigen regel onder elkaar: gewicht, volume, daarna de rest op alfabet.
   - Een eenheid die niet op de vaste lijst staat (oude waarde) is een eigen groep, de tekst blijft ongewijzigd.
4. **Welke eenheid toon ik?**
   - Alle bijdragen in dezelfde eenheid: die eenheid blijft (3 el + 1 el = 4 el).
   - Gemengd binnen een groep: rekenen in ml of g.
   - Vanaf 1000 en alleen als het totaal een veelvoud van 100 is, toon ik l of kg ("1,5 kg", "1,2 l"). Anders blijft het ml of g ("1250 ml"), zodat de afronding op één decimaal nooit iets weggooit.
   - Een totaal in l of kg onder de 1 gaat terug naar ml of g (0,5 l wordt 500 ml).
5. **Zonder hoeveelheid** (hoeveelheid leeg, 0 of geen getal): getoond zonder getal ("peper"). Heeft hetzelfde product al een regel met een hoeveelheid, dan vervalt de regel zonder getal; het product staat er dan al.
6. **Tellende eenheden** (stuk/leeg, blik, teen, bos, pot, plak, takje, handvol, snufje): het totaal na schalen en optellen gaat omhoog naar een geheel getal. Je koopt geen halve blik. Gewicht en volume blijven exact.
7. **Niet gekoppeld** (`productId` leeg): niet optellen, per regel tonen in "Overig". Zonder schalen is dat de oorspronkelijke tekst. Wijken de gekozen porties af van het recept, dan toon ik de geschaalde hoeveelheid uit `hoeveelheid`, `eenheid` en `naam`, met de oorspronkelijke tekst eronder in grijs. Onder de regel staat de receptnaam.
8. **Volgorde.** Secties in de volgorde van `AFDELINGEN` (jouw looproute door de winkel), dan "Check voorraad", dan "Eigen regels". Binnen een sectie alfabetisch op productnaam. "Overig" is de afdeling `overig` plus de niet-gekoppelde regels, in de laatste afdelingspositie. Lege secties worden niet getoond.
9. **Afvinken in de weergave.** Afgevinkte regels staan grijs onderaan hun sectie, in dezelfde volgorde.

### Voorbeelden (worden de tests)

| Invoer | Uitkomst |
| --- | --- |
| 2 el melk + 100 ml melk | **130 ml melk** (gemengd, naar ml) |
| 2 el olijfolie + 100 ml olijfolie | Check voorraad: **olijfolie** (want `altijdInHuis`) |
| 1 blik tomaat + 200 g tomaat | twee regels: **200 g tomaat** en **1 blik tomaat** |
| "snufje zout" | Check voorraad: **zout** (want `altijdInHuis`); bij een product dat dat niet is: **1 snufje x** |
| 200 g bloem + 300 g bloem | **500 g bloem** |
| 600 g bloem + 600 g bloem | **1,2 kg bloem** |
| 500 g + 1 kg bloem | **1,5 kg bloem** |
| 1 l melk + 250 ml melk | **1250 ml melk** |
| 3 el + 1 el suiker | **4 el suiker** |
| 2 uien + 1 stuk ui | **3 ui** |
| 1 blik tomaat bij 4 porties, gekozen 6 | 1,5 wordt **2 blikken tomaat** |
| 200 g bloem bij 4 porties, gekozen 6 | **300 g bloem** |
| ui "naar smaak" (zonder getal) + 2 ui | **2 ui** (regel zonder getal vervalt) |
| peper "naar smaak" zonder andere regel | **peper** (zonder getal) |
| ingrediënt zonder product, "2 stengels bleekselderij" | Overig: **2 stengels bleekselderij**, met de receptnaam eronder |
| recept zonder porties | factor 1 |
| hoeveelheid 0 of NaN | als zonder hoeveelheid |

Ook getest: afdelingsvolgorde, lege secties, dezelfde uitkomst bij een tweede aanroep, en de sleutels hieronder.

## 5. Hoe vinkjes hun sleutel krijgen

Een vinkje hangt aan een **vaste sleutel per lijstregel**, niet aan een positie of een ingrediënt-id. Ingrediënt-id's veranderen zodra je een recept bewerkt (de PUT-route maakt alle regels opnieuw aan), dus die gebruik ik niet.

| Soort regel | Sleutel | Voorbeeld |
| --- | --- | --- |
| Gekoppeld, gewicht | `p<productId>:gew` | `p42:gew` |
| Gekoppeld, volume | `p<productId>:vol` | `p17:vol` |
| Gekoppeld, tellende of andere eenheid | `p<productId>:<eenheidscode>`; `stuk` en leeg zijn `n` | `p42:blik`, `p9:n` |
| Gekoppeld, onbekende oude eenheid | `p<productId>:?<eenheid>` | `p9:?scheutje` |
| Gekoppeld, zonder hoeveelheid | `p<productId>:zonder` | `p4:zonder` |
| Check voorraad | `p<productId>:voorraad` | `p3:voorraad` |
| Niet gekoppeld | `t<receptId>:<normaliseerNaam(naam)>`, bij een dubbele `#2`, `#3` | `t88:bleekselderij` |
| Eigen regel | `e<id>` | `e12` |

- Een sleutel hangt niet af van het aantal porties, de hoeveelheid of de weergave-eenheid (130 ml of "2 el" blijft `p17:vol`) en ook niet van welke recepten erbij zitten. Een vinkje blijft dus staan als je porties wijzigt, een recept toevoegt of weghaalt.
- Haal je een recept weg en voeg je het later opnieuw toe, dan is het vinkje er nog. "Nieuwe week" wist alle vinkjes.
- Een sleutel die niet meer op de lijst staat, blijft zonder gevolgen in de tabel staan tot "Nieuwe week".
- Bekende beperking: staat een regel al afgevinkt en komt er daarna een recept bij dat meer van dat product vraagt, dan blijft de regel afgevinkt met het nieuwe totaal. Dit volgt uit jouw keuze dat vinkjes blijven staan. Als je dat wilt, kan ik een regel weer laten openklappen zodra het totaal groter wordt.

## 6. Schermen

Mobiel eerst. Alles in de bestaande stijl: `cream-50`, `olive-700`, Lora voor titels, Inter voor tekst, labels `text-xs uppercase tracking-widest`, `neutral-200` randen, geen nieuwe kleuren, geen nieuwe afrondingen. Bestaande klassen: `btn-primary`, `btn-secondary`, `input`, `label`.

### Kop van elke pagina: "Deze week · 3"

- Nieuw serverbestand `components/WeekLink.tsx`: controleert `isIngelogd()`, en toont alleen dan een link naar `/week` met het aantal recepten, in de stijl van de categorielabels (`text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700`). Uitgelogd rendert het niets, en er wordt dan ook geen databasequery gedaan.
- Plaats: rechts in de kop van het overzicht, de receptpagina (naast de verwijderknop), de pagina "Recept voorstellen" en de weekpagina's. Op mobiel `whitespace-nowrap shrink-0`, zodat de titel afbreekt en de link blijft staan.
- De beheerpagina's hebben hun eigen navigatiebalk; die is al vol (vijf items plus schakelaar). Daar zet ik alleen "Deellink" bij (voor onderdeel 4) en geen "Deze week". Zeg het als je daar toch een link wilt.
- Het aantal wordt na elke toevoeging of verwijdering ververst met `router.refresh()`.
- Rechtsonder blijft alleen "Stuur een recept in!" staan. Er komt geen zwevende knop bij.

### Receptpagina: twee gelijke knoppen onder elkaar

In de plakkende kolom met de ingrediënten, boven "Ingrediënten", komen de twee knoppen in één blok met `space-y-2`:

1. **Scherm aan houden** (`btn-secondary`, volle breedte); aan: **Scherm blijft aan** (`olive-700`, witte tekst).
2. **Op weekmenu** (`btn-secondary`, volle breedte), direct eronder, even breed; staat het recept erop: **Op weekmenu** met vinkje (`olive-700`, witte tekst) en een tik haalt het eraf. Alleen zichtbaar als je ingelogd bent. Zonder wake-lock-ondersteuning (nu al verborgen) staat de weekmenuknop alleen.

Eén gedeeld component, `components/SchakelKnop.tsx`, met props `aan`, `labelUit`, `labelAan`, `icoon`, `onClick`, `disabled`. Beide knoppen gebruiken het en kunnen dus niet uit elkaar lopen. Uit: `btn-secondary w-full`. Aan: `btn-primary w-full border border-olive-700`. Die extra rand is nodig: `btn-secondary` heeft een rand en `btn-primary` niet, waardoor de knop twee pixels van hoogte zou wisselen. Geen `rounded-lg`, geen emoji. Het kleine lijnicoon (SVG, 16 px, `stroke="currentColor"`) is bij de wake-lock een scherm en bij het weekmenu een plus (uit) of een vinkje (aan). Ik gebruik SVG's in plaats van de tekens "+" en "✓", omdat "✓" op iOS als emoji kan worden getoond.

### Overzicht: rond knopje op de foto

- Elke receptkaart wordt een `div.relative.group` met daarin de bestaande `Link` en het knopje als **zusterelement** (absoluut rechtsboven op de foto, `top-2 right-2`). Zo staat er geen knop in een link, en gaat de link van de kaart nooit af, ook niet op mobiel.
- Knopje: `w-9 h-9 rounded-full bg-black/50 text-white` met een plus-icoon, zoals "Foto bewerken". Is het recept toegevoegd: `bg-olive-700` met vinkje. Een tik op het vinkje haalt het recept weer weg.
- Zichtbaarheid: alleen ingelogd. Op apparaten zonder hover altijd zichtbaar; op apparaten met hover verschijnt het bij hover of focus, maar een toegevoegd recept (het vinkje) is altijd zichtbaar.
- Uitgelogd wordt het knopje niet gerenderd, dus voor bezoekers verandert er niets, ook niet in de HTML.
- 36 px is een compromis tussen "klein" en een tikdoel dat op een telefoon werkt.

### /week

Van boven naar beneden:
1. Kop met "← Het Kookboek van Joost" links en "Deze week · 3" rechts.
2. Titel "Weekmenu" in Lora, met daaronder een link naar de lijst: "Boodschappenlijst →" met het aantal regels.
3. Per recept een rij: kleine foto (64 px vierkant, `object-cover`), titel in Lora (link naar het recept), `PortieKiezer` (−/+, "4 porties", "Reset"), en een kleine "Weghalen". De porties worden bij een tik direct bewaard.
4. "Recept toevoegen": een zoekveld (`input`) dat op titel filtert; resultaten (maximaal 8) met kleine foto, titel en "+ Toevoegen". De receptlijst (id, slug, titel, foto) komt als prop mee; voor 120 recepten is client-side filteren genoeg.
5. Onderaan "Nieuwe week" (`btn-secondary`) met `confirm()`: "Nieuwe week beginnen? Het mandje, de vinkjes en je eigen regels worden leeggemaakt. De recepten blijven bewaard in de geschiedenis."
6. Leeg mandje: korte uitleg en direct het zoekveld.

### /week/lijst en /lijst/<code>

Dezelfde weergavecomponent (`components/LijstWeergave.tsx`), met `apiBasis` en `magEigenRegelsVerwijderen` als props. Alleen de eigenaar mag eigen regels verwijderen; bij de deellink ontbreekt dat. Eén bron voor beide pagina's betekent dat ze niet uit elkaar lopen.

- Kop: "← Weekmenu" links en **Delen** rechts (`btn-secondary`, klein). Op de deellinkpagina geen weeklink en geen "Deze week", want de bezoeker is niet ingelogd.
- Titel "Boodschappenlijst" in Lora en een regel "12 van 31 afgevinkt".
- Afdelingen als kleine labels in hoofdletters (`text-xs uppercase tracking-widest text-neutral-500`).
- Elke regel is één grote tikzone over de volle breedte (minimaal 52 px hoog, `border-b border-neutral-200`) met links een **vierkant vinkvak** van 28 px (`border border-neutral-300`; aangevinkt `bg-olive-700` met wit vinkje, geen afronding) en rechts de tekst. Het geheel is een `<button role="checkbox" aria-checked>`.
- Afgevinkte regels: grijze tekst (`text-neutral-400`), doorgestreept, onderaan hun sectie.
- Onder "Eigen regels" staat een invoerveld met "Toevoegen" (`input` plus `btn-primary`); eigen regels krijgen een kleine × (alleen bij de eigenaar).
- **Vinkjes** werken direct (optimistisch) en worden naar de server gestuurd. Faalt dat, dan springt het vinkje terug met een korte melding. De pagina haalt de stand opnieuw op wanneer je hem weer opent (bij laden en bij `visibilitychange` naar zichtbaar). Geen polling of websocket.
- **Delen:** `navigator.share({ title, text })`. Lukt dat niet of bestaat het niet, dan `navigator.clipboard.writeText` en een korte melding "Gekopieerd". De tekst is platte tekst: per afdeling een kop en daaronder `- 2 ui`, zonder afgevinkte regels en zonder lege secties. Het annuleren van het deelvenster geeft geen foutmelding.
- Uitgelogd én zonder geldige code: 404.

### /admin/deellink

Navigatie-item "Deellink". De pagina toont de volledige link (`<jouwdomein>/lijst/<code>`), "Kopieer link", en "Vernieuw link" met bevestiging ("De oude link werkt dan niet meer"). Bestaat er nog geen link, dan staat er "Maak link".

## 7. Branch en commits

Branch `weekmenu`, gemaakt vanaf `ingredienten-standaardiseren`. Eén commit per onderdeel, in deze volgorde:

| # | Commit | Inhoud | Schema |
| --- | --- | --- | --- |
| 0 | `fix: sign the admin session cookie` | sectie 1.1, alleen na akkoord. Gaat vóór alles, want de rest leunt erop. | geen |
| 1 | `feat: unify the wake lock and weekmenu button style` | `SchakelKnop`, aangepaste `SchermWakeLock`; werking gelijk | geen |
| 2 | `feat: add the weekly basket` | onderdeel 1: `WeekItem`, `WeekGeschiedenis`, `PortieKiezer`, `WeekLink`, knoppen op receptpagina en overzicht, `/week`, "Nieuwe week" | `WeekItem`, `WeekGeschiedenis` |
| 3 | `feat: add the shopping list` | onderdeel 2: `lib/boodschappenlijst.ts` met tests, `lijstData`, `/week/lijst`, eigen regels | `LijstRegel` |
| 4 | `feat: add persistent check marks and sharing` | onderdeel 3: `LijstVink`, vinkroutes, sleutels met tests, "Delen" | `LijstVink` |
| 5 | `feat: add the secret share link` | onderdeel 4: `DeelLink`, `/lijst/<code>`, `/api/lijst/…`, `/admin/deellink` | `DeelLink` |

Voor elke commit draai ik `tsc --noEmit` en `npm test`. Voor `npm run build` is een database nodig (`generateStaticParams` leest uit de database). Dat doe ik tegen de testbranch, na jouw bevestiging per keer en nadat ik de hostnaam in `.env` heb getoond. Zonder bevestiging kan ik alleen met een nep-database-URL bouwen; dat compileert en typecheckt, maar stopt bewust bij `generateStaticParams`, dus het telt niet als "build slaagt".

## 8. Database en uitrol

- **Testbranch eerst.** Elke `prisma db push` gebeurt alleen op de testbranch. Ik controleer eerst de host in `.env` (alleen de hostnaam), toon de SQL van de wijziging, en wacht op je bevestiging. Geen enkele actie op de productiedatabase zonder dat jij dat per keer bevestigt.
- **Niet pushen.** Ik push niets naar `main`. Ik push ook de branch niet zonder te vragen: Vercel bouwt dan een preview, en die leest met de bestaande omgevingsvariabelen uit een database waar het nieuwe schema nog niet in staat.
- **Volgorde voor productie** (jouw regel van "schema vóór code"): `SESSION_SECRET` in Vercel, dan het schema op productie, dan de code. Pas na het mergen van `ingredienten-standaardiseren` en de productievolgorde uit het vorige plan.
- `.claude/settings.local.json` en de andere losse bestanden in de werkmap staan niet in mijn commits.

## 9. Klaar wanneer

- `npm test` slaagt, met de tests voor de lijstberekening en de sessie.
- `npm run build` slaagt (tegen de testbranch).
- Met drie recepten in het mandje geeft `/week/lijst` een kloppende, opgetelde lijst. Ik controleer dat in de browser met echte recepten uit de testbranch.
- Een vinkje dat in de ene browser wordt gezet, is zichtbaar in een andere browser via `/lijst/<code>`. Op je telefoon kan alleen jij dat doen; ik test het met twee browsercontexten.
- Uitgelogd: geen weekmenuknoppen, geen "Deze week", en geen weekroutes bereikbaar (401 of redirect). Ook getest met een zelf gezette cookie `kookboek_admin=authenticated`: die mag niet meer werken.
- "Scherm aan houden" en "Op weekmenu" zien er in beide toestanden gelijk uit, op breed en op een smal scherm.

## 10. Standaardkeuzes waar ik van uitga

Zeg het als je er een anders wilt; dan pas ik het plan aan.

1. **Auth-voorstel** (sectie 1.1) wordt commit 0, inclusief de omgevingsvariabele `SESSION_SECRET`. De andere gaten (importeer, foto's, opmerking verwijderen, debug) laat ik staan tenzij je ze erbij wilt.
2. **Eigen regels** worden bij "Nieuwe week" ook gewist. Alternatief: alleen de afgevinkte wissen.
3. **Tellende eenheden** gaan omhoog naar een heel getal (1,5 blik wordt 2 blikken).
4. **Olijfolie** blijft `altijdInHuis` (dus onder "Check voorraad"), omdat dat zo in je productlijst staat.
5. **Eigen regels verwijderen** kan alleen de eigenaar; wie de deellink heeft kan toevoegen en afvinken, zoals jij het beschreef.
6. **Delen** deelt de lijst als tekst. De deellink zelf kopieer je in `/admin/deellink`.
7. Een recept staat maximaal één keer in het mandje; porties pas je aan, je voegt het niet twee keer toe.
8. De wake-lock-fout (sectie 1.3) blijft ongemoeid.
9. Geschiedenis wordt alleen opgeslagen; er komt geen weergave van.

## 11. Buiten bereik

Dagen plannen, automatische voorstellen en supermarktkoppelingen, een weergave van de geschiedenis.

## 12. Afwijkingen tijdens de bouw

- **Breuken in de lijst.** De lijst gebruikt dezelfde weergave als de receptpagina (`formatHoeveelheid`), dus 1,5 kg staat als "1½ kg" en 2,5 kg als "2½ kg". De decimale komma blijft bij andere getallen ("1,2 kg").
- **"Delen" staat naast de regel "12 van 31 afgevinkt"**, niet in de kop, omdat de knop de actuele stand van de lijst nodig heeft.
- **"Deze week" in de kop** staat op het overzicht, de receptpagina, "Recept voorstellen", `/week` en `/week/lijst`. Op de deellinkpagina staat het niet.
- **Auth-uitrol:** zonder `SESSION_SECRET` kan niemand inloggen (bewust).
