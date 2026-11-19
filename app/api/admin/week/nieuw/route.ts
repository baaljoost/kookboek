import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eisLogin } from "@/lib/auth";

// "Nieuwe week": bewaar de recepten van deze week in de geschiedenis en leeg het mandje
// en de eigen regels, en wis de vinkjes.
// Alles in één transactie, met voor alle regels dezelfde datum.
export async function POST() {
  const nee = await eisLogin();
  if (nee) return nee;

  const bewaard = await prisma.$transaction(async (tx) => {
    const items = await tx.weekItem.findMany({
      orderBy: { createdAt: "asc" },
      include: { recept: { select: { titel: true } } },
    });
    if (items.length > 0) {
      const afgerondOp = new Date();
      await tx.weekGeschiedenis.createMany({
        data: items.map((i) => ({
          afgerondOp,
          receptId: i.receptId,
          receptTitel: i.recept.titel,
          porties: i.porties,
        })),
      });
    }
    await tx.weekItem.deleteMany();
    await tx.lijstRegel.deleteMany();
    await tx.lijstVink.deleteMany();
    return items.length;
  });

  return NextResponse.json({ ok: true, bewaard });
}
