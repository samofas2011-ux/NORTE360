import { productRequest } from "@/lib/product-api";
import { transactionPage,saveTransaction,deleteTransaction,date } from "@/lib/banking-db";
export const runtime="nodejs";
export function GET(request:Request){return productRequest(request,user=>{const p=new URL(request.url).searchParams;return transactionPage(user.id,p.get("date")?date(p.get("date")):null,p.get("id"));});}
export function PUT(request:Request){return productRequest(request,(user,body)=>saveTransaction(user.id,body));}
export function DELETE(request:Request){return productRequest(request,async(user,body)=>{await deleteTransaction(user.id,body.id);return {ok:true};});}
