# Plan: ingrediënten omzetten op de Neon-testbranch

## Stand (2026-11-18)

De omzetting is volledig proefgedraaid op de testbranch `ingredienten-test`. Productie is niet aangeraakt. Wat nog openstaat staat onderaan bij "Nog te doen".

## Neon-branches

Project `neon-aero-notebook` (`icy-art-88839476`). De hosts zijn gecontroleerd via de Neon-API, niet afgeleid.

| Branch | Branch-ID | Endpoint-host | Gebruik |
| --- | --- | --- | --- |
| `main` (productie) | `br-bitter-violet-ain69d6g` | `ep-odd-mouse-aipwv85v` | live site, niet aanraken |
| `backup-2026-11-16` | `br-spring-mode-aiocbbqb` | `ep-flat-king-aizx5lxq` | reserve van productie, geen schrijfacties |
| `ingredienten-test` | `br-old-mode-aidbpptr` | `ep-polished-fire-ai3vraef` | testbranch, verloopt op 2026-11-24 |

**Correctie:** de eerste versie van dit plan noemde `ep-flat-king-aizx5lxq` als testbranch. Dat is de back-up. De `.env`-bestanden zijn op 2026-11-17 gecorrigeerd voordat er iets naar die host is geschreven. De back-up heet `backup-2026-11-16` (niet `-15`).

## Lokale omgeving

`.env` en `.env.local` hebben elk drie `POSTGRES_`-regels, alle drie met host `ep-polished-fire-ai3vraef`:

| Variabele | Waarde |
| --- | --- |
| `POSTGRES_URL` | pooler-URL, zonder `channel_binding` |
| `POSTGRES_PRISMA_URL` | dezelfde, met `&pgbouncer=true` |
| `POSTGRES_URL_NON_POOLING` | dezelfde, met `-pooler` uit de hostnaam |

- Prisma en de omzetscripts lezen `.env`; `npm run dev` en `npm run build` lezen `.env.local`. Houd ze gelijk.
- De productiewaarden staan in `.env.productie.local` en `.env.local.productie.local` (vallen onder `.gitignore`, een naam zonder `.local` aan het eind zou dat niet doen).
- `BLOB_READ_WRITE_TOKEN` en `ADMIN_PASSWORD` zijn niet gewijzigd.
- Ben je klaar met testen, zet dan de productiewaarden terug of gebruik de testbranch bewust.

## Afspraak

Geen databaseactie, ook geen lezen of exporteren, zonder bevestiging per keer. Elk script meldt bij de start `Database: <host>`; stoppen als dat niet de testhost is. Schrijven alleen met `--uitvoeren --host=<host>`.

## Uitgevoerd op de testbranch

1. `prisma migrate diff`: alleen aanvullingen (kolommen `oorspronkelijkeTekst` en `productId` op `Ingredient`, tabellen `Product` en `ProductSynoniem`, index en foreign key met `ON DELETE SET NULL`).
2. `prisma db push`: schema in sync.
3. `backup.ts`: `data/omzetting/backup-2026-11-17_20-44-13.json`, alleen lezen.
4. `producten-laden.ts`: 300 producten en 883 synoniemen toegevoegd.
5. `exporteer.ts`: 120 recepten, 1370 ingrediëntregels.
6. Eenheden toegevoegd (commit `e73898d`): `takje`, `plak`, `pot`, `handvol`, `cm`. Daarna `exporteer.ts` opnieuw. Nog kandidaat: `zakje`, `pak` (2×), `scheut`.
7. `bronnen-ophalen.ts`: van 86 bron-URL's 39 met bronregels, 13 zonder JSON-LD, 34 mislukt (25 daarvan ah.nl, HTTP 403).
8. `controlebestand.ts`: 1370 regels, 1201 zeker, 169 twijfel (108 splitsing niet te bepalen, 55 bron wijkt af, 3 zonder naam, 3 vermenigvuldigd).
9. Alle regels op akkoord gezet (door Joost beslist). Kopie van de stand daarvoor: `controle.voor-akkoord.csv`.
10. `toepassen.ts` proefrun, daarna `--uitvoeren`: 1370 van 1370 regels omgezet. Terugdraaibestand: `data/omzetting/terugdraaien-2026-11-18_21-21-48.json`.
11. `toepassen.ts` tweede proefrun: 0 te wijzigen, 1370 al omgezet.

Verificatie: `tsc --noEmit` schoon, `npm test` 57 van 57, `npm run build` geslaagd tegen de testbranch.

## Wat de omzetting deed

832 regels kregen een product, 538 blijven zonder product (komen in de adminpagina Koppelen), 501 eenheden, 295 namen, 92 hoeveelheden en 19 notities gewijzigd. Alleen `Ingredient`-rijen; `updatedAt` van recepten is niet veranderd.

## Nog te doen

**Voor productie: eerst nakijken**
- De 169 twijfelregels nakijken. Ze zijn nu allemaal op akkoord gezet, ook de drie ingrediënten met naam `0` (parsefout) en de drie met "twee getallen vermenigvuldigd".
- Recept `zoete-aardappelgratin-chipotle-tamarinde` nakijken: het dieetfilter ging van vegetarisch/vegan "nee" naar "ja".
- De testbranch verloopt op 2026-11-24; wat je daar nog wilt nakijken, doe je eerder.

## Volgorde voor productie

**Waarom deze volgorde:** de nieuwe code vraagt het gekoppelde `product` op (bijvoorbeeld `app/page.tsx`), dus code op `main` zonder het schema geeft fouten op de live site, en `npm run build` op Vercel leest bij `generateStaticParams` ook uit de database. Het schema is alleen aanvullend (nieuwe tabellen, twee lege kolommen), dus de oude code blijft er gewoon op werken. De nieuwe code toont oude, nog niet omgezette waarden ongewijzigd. Daarom: schema vóór code, code vóór omzetting.

Elke databasestap vraagt bevestiging per keer en meldt `Database: <host>`. Op productie moet dat `ep-odd-mouse-aipwv85v` zijn.

1. **Wachtwoord vervangen** (zie Beveiliging hierboven), `POSTGRES_*` in Vercel bijwerken en opnieuw deployen. Dit deployt nog de oude code van `main`, dus het schema speelt geen rol. Doe dit eerst, zodat alles hierna met het nieuwe wachtwoord gebeurt.
2. **Verse back-upbranch van productie** in Neon (bijvoorbeeld `backup-<datum>`). De bestaande `backup-2026-11-16` is ouder dan eventuele nieuwe opmerkingen en voorstellen.
3. **Lokaal naar productie wijzen:** de drie `POSTGRES_`-regels in `.env` en `.env.local` vervangen door de productiewaarden (met het nieuwe wachtwoord). Controleren dat alle zes de regels host `ep-odd-mouse-aipwv85v` hebben.
4. **Schema:** `prisma migrate diff` en laten zien (moet gelijk zijn aan de testbranch: alleen aanvullingen), dan `prisma db push`.
5. **Producten laden:** `producten-laden.ts` als proefrun, dan `--uitvoeren --host=<productiehost>`. Verwacht 300 producten en 883 synoniemen.
6. **Preview controleren:** de Vercel-preview van branch `ingredienten-standaardiseren` bouwt nu wel, omdat het schema er staat. Open de preview en kijk of receptpagina's, zoeken en `/admin/koppelen` werken. Dit is nog zonder omgezette ingrediënten.
7. **Code naar `main`:** pull request mergen. Vercel deployt automatisch. Controleer de live site.
8. **Omzetting:** `backup.ts`, `exporteer.ts` en `toepassen.ts` als proefrun met het beoordeelde `controle.csv`. De proefrun toont hoeveel regels zijn overgeslagen omdat een recept sinds de export is bewerkt; zijn dat er veel, genereer dan `controlebestand.ts` opnieuw. Daarna `--uitvoeren`, en een tweede proefrun moet 0 wijzigingen tonen.
9. **Koppelen:** de regels zonder product afwerken in `/admin/koppelen`.
10. **Opruimen:** `.env` en `.env.local` zetten op wat je wilt houden, `data/omzetting/` bewaren of verwijderen, en `.claude/settings.local.json` uit git halen (zie Beveiliging).

**Terugdraaien**
- Omzetting: `toepassen.ts --terugdraaien=<bestand>`; het terugdraaibestand wordt vóór het schrijven gemaakt.
- Code: de merge terugdraaien op `main`; het schema kan blijven staan.
- Alles: de back-upbranch uit stap 2.

**Niet doen:** de pull request mergen of naar `main` pushen vóór stap 4 en 5 klaar zijn.

**Beveiliging, los van de omzetting**
`.claude/settings.local.json` staat in git en op `origin/main`. De GitHub-repo is **publiek**. Het bestand bevat een toegestaan commando met de **productie-URL inclusief wachtwoord**.

- **Wachtwoord vervangen** (alleen Joost kan dit): Neon, branch `main`, Roles & Databases, `neondb_owner`, Reset password. Daarna de `POSTGRES_*`-variabelen in Vercel bijwerken en opnieuw deployen; tot dat klaar is geeft de live site fouten. De testbranch heeft een andere host. Waarschijnlijk deelt hij rol en wachtwoord met `main` (hij is een kopie), maar dat is niet gecontroleerd; kijk in Neon of de testbranch na het resetten nog het oude wachtwoord heeft en reset die zo nodig ook.
- **Opruimen in de repo** (aparte commit, na akkoord): bestand uit git halen met `git rm --cached`, `.claude/settings.local.json` in `.gitignore` zetten en de regel met de URL uit de toegestane commando's halen. De geschiedenis behoudt het wachtwoord, dit vervangt het resetten niet.
- Een databasewachtwoord is ook in een gesprek geplakt. Na het resetten is dat geen punt meer voor de live data.

**Opruimen na afloop**
- `.env` en `.env.local` terugzetten naar productie, of bewust op de testbranch laten.
- `data/omzetting/` bevat 6 bestanden met receptdata (in `.gitignore`); bewaren of verwijderen.
- Neon-tools (CLI, plugin `neon-postgres`) zijn geïnstalleerd en ingelogd; die hebben rechten op productie.
