import { productRequest } from "@/lib/product-api";
import { bankingData,saveAccount,deleteAccount } from "@/lib/banking-db";
export const runtime="nodejs";
export function GET(request:Request){return productRequest(request,user=>bankingData(user.id));}
export function PUT(request:Request){return productRequest(request,(user,body)=>saveAccount(user.id,body));}
export function DELETE(request:Request){return productRequest(request,async(user,body)=>{await deleteAccount(user.id,body.id);return {ok:true};});}
