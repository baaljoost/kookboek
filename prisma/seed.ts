import { PrismaClient, Categorie } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Voorbeeld recept: Pasta al Limone
  await prisma.recept.upsert({
    where: { slug: "pasta-al-limone" },
    update: {},
    create: {
      slug: "pasta-al-limone",
      titel: "Pasta al Limone",
      categorie: Categorie.PASTA,
      porties: 4,
      bereidingstijd: 20,
      beoordeling: 5,
      herkomstNaam: "Voorbeeld recept",
      ingredienten: {
        create: [
          { volgorde: 0, hoeveelheid: 400, eenheid: "gram", naam: "spaghetti" },
          { volgorde: 1, hoeveelheid: 2, naam: "citroenen", notitie: "rasp en sap" },
          { volgorde: 2, hoeveelheid: 60, eenheid: "gram", naam: "boter" },
          { volgorde: 3, hoeveelheid: 80, eenheid: "gram", naam: "Parmezaanse kaas", notitie: "geraspt" },
          { volgorde: 4, hoeveelheid: null, naam: "zwarte peper", notitie: "versgemalen" },
          { volgorde: 5, hoeveelheid: null, naam: "zout" },
        ],
      },
      stappen: {
        create: [
          { volgorde: 0, tekst: "Kook de spaghetti in ruim gezouten water tot al dente." },
          { volgorde: 1, tekst: "Smelt de boter op laag vuur in een grote koekenpan. Voeg de citroenrasp toe en roer 1 minuut." },
          { volgorde: 2, tekst: "Schep de pasta met een beetje kookwater over in de pan. Voeg citroensap toe en meng goed." },
          { volgorde: 3, tekst: "Haal van het vuur, roer de Parmezaanse kaas erdoor en breng op smaak met peper en zout." },
        ],
      },
      tags: {
        create: [
          { tag: { connectOrCreate: { where: { naam: "vegetarisch" }, create: { naam: "vegetarisch" } } } },
          { tag: { connectOrCreate: { where: { naam: "snel" }, create: { naam: "snel" } } } },
        ],
      },
    },
  });

  console.log("Seed compleet.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
