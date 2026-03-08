// ============================================
// CORE TYPES - Keep it simple like Tricount
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  currency: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Computed
  member_count?: number;
  total_expenses?: number;
}

export interface Member {
  id: string;
  group_id: string;
  user_id?: string; // Optional - can have non-registered members
  name: string;
  email?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  group_id: string;
  description: string;
  amount: number; // Store in cents to avoid float issues
  paid_by: string; // member_id
  date: string;
  created_by: string;
  created_at: string;
  // Joined data
  paid_by_name?: string;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  member_id: string;
  amount: number; // cents
  // Joined
  member_name?: string;
}

export interface Settlement {
  id: string;
  group_id: string;
  from_member: string;
  to_member: string;
  amount: number; // cents
  date: string;
  created_by: string;
  created_at: string;
  // Joined
  from_member_name?: string;
  to_member_name?: string;
}

// ============================================
// COMPUTED TYPES
// ============================================

export interface Balance {
  memberId: string;
  memberName: string;
  amount: number; // + means owed money, - means owes money
}

export interface SuggestedSettlement {
  from: Member;
  to: Member;
  amount: number;
}

// ============================================
// FORM TYPES
// ============================================

export interface CreateGroupForm {
  name: string;
  description?: string;
  currency: string;
  members: string[]; // names
}

export interface CreateExpenseForm {
  description: string;
  amount: string; // string for input, convert to cents
  paid_by: string; // member_id
  split_between: string[]; // member_ids (equal split only for simplicity)
  date: Date;
}

// ============================================
// NAVIGATION TYPES
// ============================================

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  GroupDetail: { groupId: string; groupName: string };
  AddExpense: { groupId: string };
  CreateGroup: undefined;
  Balances: { groupId: string; groupName: string };
  AddMember: { groupId: string };
};

export type MainTabParamList = {
  Groups: undefined;
  Profile: undefined;
};
