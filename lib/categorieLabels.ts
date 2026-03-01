import { Categorie } from "@prisma/client";

export const categorieLabels: Record<Categorie, string> = {
  PASTA: "Pasta",
  CURRY: "Curry",
  SOEP: "Soep",
  SALADE: "Salade",
  RIJST_EN_GRANEN: "Rijst & granen",
  VLEES: "Vlees",
  VIS_EN_ZEEVRUCHTEN: "Vis & zeevruchten",
  GROENTEN: "Groenten",
  SNACKS: "Snacks & borrelhapjes",
  ONTBIJT: "Ontbijt",
  DESSERT: "Dessert & gebak",
  SAUZEN: "Sauzen & basics",
};
