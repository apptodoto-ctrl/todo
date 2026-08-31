import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";

async function requireAdmin() {
  const session = await getSessionInfo();
  if (!session) return null;
  if (session.role !== "admin") return null;
  return session;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  try {
    const [tiers, features, packs, coupons, settings] = await Promise.all([
      prisma.planTier.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.aiFeature.findMany({ orderBy: { creditCost: "asc" } }),
      prisma.creditPack.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.pricingSetting.findMany({ orderBy: { key: "asc" } }),
    ]);
    return NextResponse.json({ tiers, features, packs, coupons, settings });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

// Actualiza o crea registros del catálogo de precios.
// body: { entity: "tier"|"feature"|"pack"|"coupon"|"setting", id?, key?, data }
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  try {
    const { entity, id, key, data } = await req.json();
    if (!data) return NextResponse.json({ error: "data requerido" }, { status: 400 });
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;

    switch (entity) {
      case "tier": {
        const clean = {
          ...(data.code !== undefined ? { code: String(data.code) } : {}),
          ...(data.plan !== undefined ? { plan: String(data.plan) } : {}),
          ...(data.maxPatients !== undefined ? { maxPatients: data.maxPatients === null || data.maxPatients === "" ? null : Number(data.maxPatients) } : {}),
          ...(data.therapists !== undefined ? { therapists: Number(data.therapists) } : {}),
          ...(data.aiCredits !== undefined ? { aiCredits: Number(data.aiCredits) } : {}),
          ...(data.priceMonthly !== undefined ? { priceMonthly: Number(data.priceMonthly) } : {}),
          ...(data.priceYearly !== undefined ? { priceYearly: Number(data.priceYearly) } : {}),
          ...(data.notes !== undefined ? { notes: String(data.notes) } : {}),
          ...(data.sortOrder !== undefined ? { sortOrder: Number(data.sortOrder) } : {}),
          ...(data.active !== undefined ? { active: data.active === true } : {}),
          ...(data.isAddon !== undefined ? { isAddon: data.isAddon === true } : {}),
        };
        const tier = id
          ? await prisma.planTier.update({ where: { id: Number(id) }, data: clean })
          : await prisma.planTier.create({ data: clean as Parameters<typeof prisma.planTier.create>[0]["data"] });
        return NextResponse.json(tier);
      }
      case "feature": {
        const clean = {
          ...(data.name !== undefined ? { name: String(data.name) } : {}),
          ...(data.creditCost !== undefined ? { creditCost: Number(data.creditCost) } : {}),
          ...(data.esencial !== undefined ? { esencial: data.esencial === true } : {}),
          ...(data.profesional !== undefined ? { profesional: data.profesional === true } : {}),
          ...(data.centro !== undefined ? { centro: data.centro === true } : {}),
          ...(data.active !== undefined ? { active: data.active === true } : {}),
        };
        const feature = await prisma.aiFeature.update({ where: { id: Number(id) }, data: clean });
        return NextResponse.json(feature);
      }
      case "pack": {
        const clean = {
          ...(data.credits !== undefined ? { credits: Number(data.credits) } : {}),
          ...(data.price !== undefined ? { price: Number(data.price) } : {}),
          ...(data.active !== undefined ? { active: data.active === true } : {}),
        };
        const pack = await prisma.creditPack.update({ where: { id: Number(id) }, data: clean });
        return NextResponse.json(pack);
      }
      case "coupon": {
        const clean = {
          ...(data.code !== undefined ? { code: String(data.code).toUpperCase().trim() } : {}),
          ...(data.type !== undefined ? { type: String(data.type) } : {}),
          ...(data.value !== undefined ? { value: Number(data.value) } : {}),
          ...(data.maxRedemptions !== undefined ? { maxRedemptions: data.maxRedemptions === null || data.maxRedemptions === "" ? null : Number(data.maxRedemptions) } : {}),
          ...(data.validUntil !== undefined ? { validUntil: data.validUntil ? new Date(data.validUntil) : null } : {}),
          ...(data.planRestriction !== undefined ? { planRestriction: data.planRestriction || null } : {}),
          ...(data.description !== undefined ? { description: String(data.description) } : {}),
          ...(data.active !== undefined ? { active: data.active === true } : {}),
        };
        if (!id && !clean.code) return NextResponse.json({ error: "El código del cupón es requerido" }, { status: 400 });
        const coupon = id
          ? await prisma.coupon.update({ where: { id: Number(id) }, data: clean })
          : await prisma.coupon.create({ data: { type: "percent", value: 0, ...clean } as Parameters<typeof prisma.coupon.create>[0]["data"] });
        return NextResponse.json(coupon);
      }
      case "setting": {
        if (!key) return NextResponse.json({ error: "key requerido" }, { status: 400 });
        const setting = await prisma.pricingSetting.update({
          where: { key: String(key) },
          data: { value: String(data.value ?? "") },
        });
        return NextResponse.json(setting);
      }
      default:
        return NextResponse.json({ error: "Entidad desconocida" }, { status: 400 });
    }
  } catch (err) {
    console.error("Pricing admin error:", err);
    return NextResponse.json({ error: "No se pudo guardar (¿código duplicado?)" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity");
    const id = Number(searchParams.get("id"));
    if (entity === "coupon" && id) {
      await prisma.coupon.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }
    if (entity === "tier" && id) {
      await prisma.planTier.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Solo se pueden eliminar cupones y escalones" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
