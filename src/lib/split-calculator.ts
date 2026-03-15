import { Debt, Member, Receipt } from './types';

export function calculatePersonTotal(
  receipt: Receipt,
  memberId: string
): number {
  const subtotal = receipt.items.reduce((sum, item) => sum + item.price, 0);
  let personSubtotal = 0;

  for (const item of receipt.items) {
    if (item.assignedTo.includes(memberId)) {
      personSubtotal += item.price / item.assignedTo.length;
    }
  }

  if (subtotal === 0) return 0;
  const proportion = personSubtotal / subtotal;
  const personTax = receipt.tax * proportion;
  const personTip = receipt.tip * proportion;

  return Math.round((personSubtotal + personTax + personTip) * 100) / 100;
}

export function calculateAllTotals(
  receipt: Receipt,
  members: Member[]
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const member of members) {
    totals[member.id] = calculatePersonTotal(receipt, member.id);
  }
  return totals;
}

export function simplifyDebts(
  balances: Record<string, number>
): Debt[] {
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, balance] of Object.entries(balances)) {
    if (balance < -0.01) {
      debtors.push({ id, amount: Math.abs(balance) });
    } else if (balance > 0.01) {
      creditors.push({ id, amount: balance });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const debts: Debt[] = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amount, creditors[j].amount);
    if (transfer > 0.01) {
      debts.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: Math.round(transfer * 100) / 100,
      });
    }
    debtors[i].amount -= transfer;
    creditors[j].amount -= transfer;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return debts;
}
