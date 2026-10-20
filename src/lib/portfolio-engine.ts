import type { PayoffResult,RouteComparison } from "./financial-engine";
export type Debt={id:string;name:string;balanceCents:number;annualInterestBps:number;minimumPaymentCents:number};
export function payoffPortfolio(debts:Debt[],extraCents:number,strategy:"avalanche"|"snowball"):PayoffResult{
  if(!Number.isSafeInteger(extraCents)||extraCents<0)throw new Error("Aporte invalido.");
  const loans=debts.map(debt=>({...debt}));
  for(const loan of loans) for(const key of ["balanceCents","annualInterestBps","minimumPaymentCents"] as const)if(!Number.isSafeInteger(loan[key])||loan[key]<0)throw new Error("Deuda invalida.");
  const budget=loans.reduce((sum,loan)=>sum+loan.minimumPaymentCents,0)+extraCents;
  let months=0,totalInterestCents=0;
  while(loans.some(loan=>loan.balanceCents>0)&&months<1200){
    const before=loans.reduce((sum,loan)=>sum+loan.balanceCents,0);
    let remaining=budget;
    for(const loan of loans){
      if(loan.balanceCents<=0)continue;
      const interest=Math.round(loan.balanceCents*loan.annualInterestBps/120000);
      loan.balanceCents+=interest;totalInterestCents+=interest;
      const payment=Math.min(loan.minimumPaymentCents,loan.balanceCents);
      loan.balanceCents-=payment;remaining-=payment;
    }
    loans.sort((a,b)=>strategy==="avalanche"?b.annualInterestBps-a.annualInterestBps||a.balanceCents-b.balanceCents:a.balanceCents-b.balanceCents||b.annualInterestBps-a.annualInterestBps);
    for(const loan of loans){const payment=Math.min(loan.balanceCents,Math.max(remaining,0));loan.balanceCents-=payment;remaining-=payment;}
    months++;
    if(loans.reduce((sum,loan)=>sum+loan.balanceCents,0)>=before)throw new Error("Las cuotas y el aporte no cubren los intereses.");
  }
  if(loans.some(loan=>loan.balanceCents>0))throw new Error("El plan supera 100 anos.");
  return {months,totalInterestCents,monthlyPaymentCents:budget,debtFreeYear:new Date().getFullYear()+Math.ceil(months/12)};
}
export function portfolioComparison(debts:Debt[],extra:number,strategy:"avalanche"|"snowball"):RouteComparison{
  const baseline=payoffPortfolio(debts,0,"avalanche"),optimized=payoffPortfolio(debts,extra,strategy);
  const monthsSaved=Math.max(baseline.months-optimized.months,0);
  return {baseline,optimized,monthsSaved,yearsSaved:Math.round(monthsSaved/12),interestSavedCents:Math.max(baseline.totalInterestCents-optimized.totalInterestCents,0)};
}
