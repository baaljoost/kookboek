---
planStatus:
  planId: plan-kookboek-requirements
  title: Het Kookboek — Requirements Document
  status: ready-for-development
  planType: system-design
  priority: high
  owner: joost
  stakeholders: []
  tags:
    - kookboek
    - next.js
    - vercel
    - requirements
  created: "2026-03-01"
  updated: "2026-03-01T00:00:00.000Z"
  progress: 0
---
# Het Kookboek — Requirements Document

## Project Overzicht

Een persoonlijk online receptenboek gebouwd met Next.js, gehost op Vercel. Het doel is om alle persoonlijke recepten — momenteel verspreid over websites en foto's van kookboeken — op één plek samen te brengen in een consistent formaat en met een mooie, moderne vormgeving geïnspireerd op de kookboeken van Ottolenghi.

---

## Tech Stack

| Onderdeel | Keuze |
| --- | --- |
| Framework | Next.js (App Router) |
| Hosting | Vercel |
| Styling | Tailwind CSS |
| Database | Vercel Postgres + Prisma ORM |
| Afbeeldingen | Vercel Blob Storage |
| Admin auth | Hardcoded wachtwoord (eenvoudig, privé gebruik) |

---

## Gebruikers

- **Bezoeker (publiek)**: kan recepten bekijken, zoeken en filteren. Geen login vereist.
- **Beheerder (alleen Joost)**: kan recepten toevoegen, bewerken en verwijderen via een beveiligde admin-interface. Toegang via wachtwoord: `06160`.

---

## Recepten

### Velden per recept

| Veld | Type | Verplicht | Opmerkingen |
| --- | --- | --- | --- |
| Titel | tekst | ja |  |
| Categorie | enum | ja | zie lijst hieronder |
| Tags | lijst van strings | nee | vrij in te voeren via admin |
| Porties | getal | nee | basis voor schaling |
| Bereidingstijd | getal (minuten) | nee |  |
| Ingrediënten | gestructureerde lijst | ja | zie formaat hieronder |
| Stappen / bereidingswijze | genummerde lijst | ja | mag portiegevoelige hoeveelheden bevatten |
| Foto's | 0 tot 5 afbeeldingen | nee |  |
| Herkomst | tekst + optionele URL | nee | naam van kookboek of website met klikbare link |
| Beoordeling | getal (1–5 sterren) | nee | persoonlijke sterrenbeoordeling door beheerder |

**Geen introductietekst of blogverhaal** — alleen de daadwerkelijke ingrediënten en bereidingsstappen.

### Ingrediënten formaat

Elk ingrediënt bestaat uit:
- Hoeveelheid (getal, portiegevoelig)
- Eenheid (bijv. gram, el, tl, stuks — optioneel)
- Naam (bijv. "knoflookteentjes")
- Notitie (bijv. "fijngehakt" — optioneel)

### Portieschaling

De bezoeker kan het aantal porties aanpassen via de receptpagina. Alle hoeveelheden in de ingrediëntenlijst schalen automatisch mee op basis van de verhouding tot de standaardportie. De staptekst is vrije tekst en schaalt niet automatisch mee.

---

## Categorieën

- Pasta
- Curry
- Soep
- Salade
- Rijst & granen
- Vlees
- Vis & zeevruchten
- Groenten
- Snacks & borrelhapjes
- Ontbijt
- Dessert & gebak
- Sauzen & basics

> Categorieën zijn uitbreidbaar via de admin-interface.

---

## Functionaliteiten

### Publieke kant (bezoeker)

1. **Startpagina** — overzicht van recepten, visueel aantrekkelijk met grote foto's
2. **Filteren op categorie** — klik op een categorie om te filteren
3. **Filteren op tag** — klik op een tag om recepten met die tag te zien
4. **Zoeken op ingredient** — vrij tekstveld, filtert recepten op basis van ingrediënten
5. **Receptpagina** — volledig recept weergegeven met:
  - Titel, bereidingstijd, porties
  - Foto('s) prominent weergegeven
  - Ingrediëntenlijst met portie-schuifregelaar
  - Stappen met eventuele scaled hoeveelheden
  - Herkomst / bron
  - Tags
  - Sterrenbeoordeling (1–5 sterren, indien ingevuld)
6. **Mobiel-vriendelijk** — volledig responsive, fijn te gebruiken terwijl je staat te koken (grote letters, duidelijke stappen)

### Admin-interface (beheerder)

1. **Login** — eenvoudig wachtwoordscherm
2. **Receptenoverzicht** — lijst van alle recepten met edit/verwijder knoppen
3. **Recept toevoegen / bewerken**:
  - Alle velden invullen (zie tabel hierboven)
  - Ingrediënten dynamisch toevoegen/verwijderen
  - Stappen dynamisch toevoegen/herordenen
  - Tags vrij invoeren (autocomplete op bestaande tags)
  - Foto's uploaden (max 5)
  - Herkomst invullen met optionele URL
  - Sterrenbeoordeling instellen (1–5 sterren, optioneel)
4. **Recept verwijderen** — met bevestigingsdialoog

---

## Vormgeving

**Stijl**: Modern kookboek, geïnspireerd op Ottolenghi.

- Veel witruimte
- Grote, mooie receptfoto's
- Serif lettertype voor titels (bijv. Playfair Display of Lora)
- Sans-serif voor broodtekst (bijv. Inter)
- Rustig kleurenpalet: gebroken wit, warm beige, zwart
- Accentkleur: een diep olijfgroen of terracotta
- Duidelijke typografische hiërarchie
- Op mobiel: grote leesbare tekst, makkelijk te scrollen terwijl je kookt

---

## Paginastructuur (routes)

| Route | Beschrijving |
| --- | --- |
| `/` | Startpagina met receptenoverzicht |
| `/recepten/[slug]` | Receptpagina |
| `/admin` | Login |
| `/admin/recepten` | Overzicht van alle recepten |
| `/admin/recepten/nieuw` | Nieuw recept toevoegen |
| `/admin/recepten/[id]/bewerken` | Recept bewerken |

---

## Out of scope (bewust weggelaten)

- Gebruikersaccounts / multi-user
- Reacties of beoordelingen
- Recepten delen via social media
- Maaltijdplanner of boodschappenlijst
- Introductieteksten of blogberichten bij recepten

---

## Open vragen / beslissingen

- [x] Database keuze: **Vercel Postgres + Prisma ORM**.
- [x] Portieschaling in staptekst: **Optie B** — staptekst is vrije tekst, alleen de ingrediëntenlijst schaalt mee.
