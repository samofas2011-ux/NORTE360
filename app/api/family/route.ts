import { productRequest, InputError } from "@/lib/product-api";
import { getOrCreateFamily, updateFamily, deleteFamily, inviteFamilyMember, acceptFamilyInvitation, removeFamilyMember, getFullAppData } from "@/lib/product-db";
import { database } from "@/lib/db";
export const runtime = "nodejs";
export function POST(request: Request) { return productRequest(request, async user => ({ family: await getOrCreateFamily(user.id, user.name) })); }
export function PATCH(request: Request) { return productRequest(request, async (user, body) => {
  if(body.operation==="role"){
    if(!["admin","contributor","viewer"].includes(String(body.role)))throw new InputError("Rol invalido.");
    const rows=await database()`UPDATE household_members hm SET role=${String(body.role)} FROM households h WHERE hm.id=${String(body.id)} AND hm.household_id=h.id AND h.created_by_user_id=${user.id} AND hm.role<>'owner' AND h.deleted_at IS NULL RETURNING hm.id`;
    if(!rows.length)throw new InputError("No puedes cambiar este rol.");
    return getFullAppData(user.id,user.name);
  }
  if (body.operation === "invite") {
    if (typeof body.email !== "string" || body.email.length > 254) throw new InputError("Email invalido.");
    await inviteFamilyMember(user.id, body.email);
    return getFullAppData(user.id, user.name);
  }
  if (body.operation === "accept" || body.operation === "remove") {
    if (typeof body.id !== "string") throw new InputError("Invitacion invalida.");
    if (body.operation === "accept") await acceptFamilyInvitation(user.id, body.id);
    else await removeFamilyMember(user.id, body.id);
    return getFullAppData(user.id, user.name);
  }
  if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 120) throw new InputError("Nombre invalido.");
  await updateFamily(user.id, body.name.trim());
  return { family: await getOrCreateFamily(user.id, user.name) };
}); }
export function DELETE(request: Request) { return productRequest(request, async user => { await deleteFamily(user.id); return { ok: true }; }); }
