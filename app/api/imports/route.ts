import { productRequest } from "@/lib/product-api";
import { importCsv,revokeImport } from "@/lib/banking-db";
export const runtime="nodejs";
export function POST(request:Request){return productRequest(request,(user,body)=>importCsv(user.id,body),524288);}
export function DELETE(request:Request){return productRequest(request,async(user,body)=>{await revokeImport(user.id,body.id,body.erase===true);return {ok:true};});}
