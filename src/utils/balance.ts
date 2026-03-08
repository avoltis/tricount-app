import { Member, Expense, ExpenseSplit, Settlement, Balance, SuggestedSettlement } from '../types';

// ============================================
// BALANCE CALCULATOR
// Like Tricount - simple and effective
// ============================================

interface BalanceInput {
  members: Member[];
  expenses: Expense[];
  expenseSplits: Map<string, ExpenseSplit[]>; // expenseId -> splits
  settlements: Settlement[];
}

/**
 * Calculate the net balance for each member
 * Positive = member is owed money
 * Negative = member owes money
 */
export function calculateBalances(input: BalanceInput): Balance[] {
  const { members, expenses, expenseSplits, settlements } = input;
  
  // Initialize balances to 0
  const balanceMap = new Map<string, number>();
  members.forEach((m) => balanceMap.set(m.id, 0));

  // Process expenses
  expenses.forEach((expense) => {
    // Person who paid gets credit for full amount
    const currentPaid = balanceMap.get(expense.paid_by) || 0;
    balanceMap.set(expense.paid_by, currentPaid + expense.amount);

    // Each person in the split owes their share
    const splits = expenseSplits.get(expense.id) || [];
    splits.forEach((split) => {
      const currentOwes = balanceMap.get(split.member_id) || 0;
      balanceMap.set(split.member_id, currentOwes - split.amount);
    });
  });

  // Process settlements (when someone paid back)
  settlements.forEach((settlement) => {
    // Person who paid reduces their debt
    const fromBalance = balanceMap.get(settlement.from_member) || 0;
    balanceMap.set(settlement.from_member, fromBalance + settlement.amount);

    // Person who received reduces their credit
    const toBalance = balanceMap.get(settlement.to_member) || 0;
    balanceMap.set(settlement.to_member, toBalance - settlement.amount);
  });

  // Convert to array
  return members.map((member) => ({
    memberId: member.id,
    memberName: member.name,
    amount: balanceMap.get(member.id) || 0,
  }));
}

/**
 * Minimize the number of transactions needed to settle all debts
 * This is a greedy algorithm that pairs largest creditors with largest debtors
 */
export function calculateSettlements(
  balances: Balance[],
  members: Member[]
): SuggestedSettlement[] {
  // Create mutable copy of balances
  const balancesCopy = new Map<string, number>();
  balances.forEach((b) => balancesCopy.set(b.memberId, b.amount));

  // Separate into debtors (negative balance) and creditors (positive balance)
  const debtors: { member: Member; amount: number }[] = [];
  const creditors: { member: Member; amount: number }[] = [];

  balances.forEach((balance) => {
    const member = members.find((m) => m.id === balance.memberId);
    if (!member) return;

    // Use small threshold to avoid floating point issues
    if (balance.amount < -1) {
      debtors.push({ member, amount: Math.abs(balance.amount) });
    } else if (balance.amount > 1) {
      creditors.push({ member, amount: balance.amount });
    }
  });

  // Sort by amount descending (largest first)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: SuggestedSettlement[] = [];

  // Greedy matching
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];

    // Amount to transfer is the minimum of what's owed and what's due
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 1) {
      settlements.push({
        from: debtor.member,
        to: creditor.member,
        amount: Math.round(amount), // Round to cents
      });
    }

    // Update amounts
    debtor.amount -= amount;
    creditor.amount -= amount;

    // Remove if settled
    if (debtor.amount < 1) debtors.shift();
    if (creditor.amount < 1) creditors.shift();
  }

  return settlements;
}

/**
 * Get total expenses for a group
 */
export function getTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, exp) => sum + exp.amount, 0);
}

/**
 * Format cents to display currency
 */
export function formatMoney(cents: number, currency: string = 'EUR'): string {
  const amount = cents / 100;
  
  const currencySymbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF ',
  };

  const symbol = currencySymbols[currency] || currency + ' ';
  
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Parse currency string to cents
 */
export function parseToCents(amountStr: string): number {
  const cleaned = amountStr.replace(/[^0-9.,]/g, '').replace(',', '.');
  const amount = parseFloat(cleaned);
  if (isNaN(amount)) return 0;
  return Math.round(amount * 100);
}

/**
 * Get color for balance (red for owes, green for owed)
 */
export function getBalanceColor(amount: number): string {
  if (amount > 1) return '#22C55E'; // green - owed money
  if (amount < -1) return '#EF4444'; // red - owes money
  return '#6B7280'; // gray - settled
}
