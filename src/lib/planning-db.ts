import { randomUUID } from "node:crypto";
import { database } from "./db";
import { InputError } from "./product-api";
import { money,label,date } from "./banking-db";
import { normalizeGoalType } from "./api-inputs";
export async function planningData(userId:string){
  const sql=database();
  const goals=(await sql`SELECT g.id,g.name,g.goal_type,g.user_id,g.household_id,g.target_amount_cents::text,g.current_amount_cents::text,g.monthly_allocation_cents::text,g.target_date::text,
    CASE WHEN g.household_id IS NULL THEN 'owner' ELSE hm.role END role
    FROM goals g LEFT JOIN household_members hm ON hm.household_id=g.household_id AND hm.user_id=${userId} AND hm.accepted_at IS NOT NULL
    LEFT JOIN households h ON h.id=g.household_id
    WHERE g.deleted_at IS NULL AND ((g.user_id=${userId} AND g.household_id IS NULL) OR (hm.id IS NOT NULL AND h.deleted_at IS NULL))
    ORDER BY g.priority,g.created_at,g.id`) as Array<{id:string;name:string;goal_type:string;user_id:string;household_id:string|null;role:string;target_amount_cents:string;current_amount_cents:string;monthly_allocation_cents:string;target_date:string|null}>;
  return {goals:goals.map(goal=>({...goal,monthsToTarget:Number(goal.monthly_allocation_cents)>0?Math.ceil(Math.max(Number(goal.target_amount_cents)-Number(goal.current_amount_cents),0)/Number(goal.monthly_allocation_cents)):null}))};
}
async function goalAccess(userId:string,id:unknown,admin=false){
  const goal=(await planningData(userId)).goals.find(item=>item.id===id);
  if(!goal || goal.role==="viewer" || (admin&&!["owner","admin"].includes(String(goal.role))))throw new InputError("No tienes permiso para modificar esta meta.");
  return goal;
}
export async function savePlannedGoal(userId:string,body:Record<string,unknown>){
  const sql=database(),id=typeof body.id==="string"?body.id:randomUUID(),name=label(body.name),type=normalizeGoalType(body.type);
  const existing=body.id?await goalAccess(userId,id):null;
  const householdId=existing?.household_id??(typeof body.householdId==="string"&&body.householdId?body.householdId:null);
  if(householdId){
    const rows=await sql`SELECT hm.role FROM household_members hm JOIN households h ON h.id=hm.household_id WHERE hm.user_id=${userId} AND hm.household_id=${householdId} AND hm.accepted_at IS NOT NULL AND hm.role<>'viewer' AND h.deleted_at IS NULL`;
    if(!rows.length)throw new InputError("No tienes permiso en este hogar.");
  }
  const target=money(body.targetCents),allocation=money(body.allocationCents),current=money(body.currentCents??0);
  const targetDate=body.date?date(body.date):null;
  const result=await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${String(householdId??userId)},0))`,
    sql`WITH owners AS (
      SELECT ${userId}::text id WHERE ${householdId}::text IS NULL
      UNION SELECT user_id FROM household_members WHERE household_id=${householdId} AND accepted_at IS NOT NULL
    ), available AS (
      SELECT GREATEST(COALESCE((SELECT SUM(monthly_income_cents-monthly_expense_cents) FROM financial_profiles WHERE user_id IN(SELECT id FROM owners) AND household_id IS NULL),0)
      -COALESCE((SELECT SUM(minimum_payment_cents) FROM liabilities WHERE user_id IN(SELECT id FROM owners) AND household_id IS NULL AND deleted_at IS NULL),0),0) total
    )
    INSERT INTO goals(id,user_id,household_id,name,goal_type,target_amount_cents,current_amount_cents,monthly_allocation_cents,target_date)
    SELECT ${id},${existing?.user_id??userId},${householdId},${name},${type},${target},${current},${allocation},${targetDate}
    WHERE ${allocation} + COALESCE((SELECT SUM(monthly_allocation_cents) FROM goals WHERE id<>${id} AND deleted_at IS NULL AND status='active' AND ((household_id=${householdId}) OR (household_id IS NULL AND user_id=${userId} AND ${householdId}::text IS NULL))),0) <= (SELECT total FROM available)
    ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,goal_type=EXCLUDED.goal_type,target_amount_cents=EXCLUDED.target_amount_cents,monthly_allocation_cents=EXCLUDED.monthly_allocation_cents,target_date=EXCLUDED.target_date,updated_at=NOW()
    RETURNING id`,
  ]);
  if(!result[1].length)throw new InputError("La asignacion mensual total supera el ingreso disponible despues de gastos y cuotas.");
  return {id};
}
export async function contributeToGoal(userId:string,body:Record<string,unknown>){
  await goalAccess(userId,body.goalId);
  const amount=money(body.amountCents);if(amount<=0)throw new InputError("El aporte debe ser mayor a cero.");
  const sql=database();
  await sql.transaction([
    sql`INSERT INTO goal_contributions(id,goal_id,user_id,amount_cents) VALUES(${randomUUID()},${String(body.goalId)},${userId},${amount})`,
    sql`UPDATE goals SET current_amount_cents=current_amount_cents+${amount},updated_at=NOW() WHERE id=${String(body.goalId)}`,
  ]);
}
export async function removePlannedGoal(userId:string,id:unknown){
  await goalAccess(userId,id,true);
  await database()`UPDATE goals SET deleted_at=NOW(),updated_at=NOW() WHERE id=${String(id)}`;
}
