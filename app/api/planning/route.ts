import { productRequest } from "@/lib/product-api";
import { planningData,savePlannedGoal,contributeToGoal,removePlannedGoal } from "@/lib/planning-db";
export const runtime="nodejs";
export function GET(request:Request){return productRequest(request,user=>planningData(user.id));}
export function PUT(request:Request){return productRequest(request,(user,body)=>savePlannedGoal(user.id,body));}
export function POST(request:Request){return productRequest(request,async(user,body)=>{await contributeToGoal(user.id,body);return {ok:true};});}
export function DELETE(request:Request){return productRequest(request,async(user,body)=>{await removePlannedGoal(user.id,body.id);return {ok:true};});}
