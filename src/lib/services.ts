import { supabase } from './supabase';
import { Group, Member, Expense, ExpenseSplit, Settlement } from '../types';

// ============================================
// GROUPS SERVICE
// ============================================

export const groupsService = {
  // Get all groups for current user
  getMyGroups: async (userId: string): Promise<Group[]> => {
    // Get groups where user is the creator OR a member
    const { data: memberGroups, error: memberError } = await supabase
      .from('members')
      .select('group_id')
      .eq('user_id', userId);

    if (memberError) throw memberError;

    const memberGroupIds = memberGroups?.map((m) => m.group_id) || [];

    // Get all groups: either created by user or user is a member
    let query = supabase
      .from('groups')
      .select('*');

    if (memberGroupIds.length > 0) {
      query = query.or(`created_by.eq.${userId},id.in.(${memberGroupIds.join(',')})`);
    } else {
      // If no member groups, just get groups created by user
      query = query.eq('created_by', userId);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create a new group
  create: async (
    name: string,
    currency: string,
    createdBy: string,
    memberNames: string[],
    description?: string
  ): Promise<Group> => {
    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        currency,
        description,
        created_by: createdBy,
      })
      .select()
      .single();

    if (groupError) throw groupError;

    // Add members
    const members = memberNames.map((memberName) => ({
      group_id: group.id,
      name: memberName,
      user_id: null, // Can link later
    }));

    const { error: membersError } = await supabase.from('members').insert(members);

    if (membersError) throw membersError;

    return group;
  },

  // Get single group
  getById: async (groupId: string): Promise<Group | null> => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) throw error;
    return data;
  },

  // Delete group
  delete: async (groupId: string): Promise<void> => {
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    if (error) throw error;
  },
};

// ============================================
// MEMBERS SERVICE
// ============================================

export const membersService = {
  // Get all members of a group
  getByGroupId: async (groupId: string): Promise<Member[]> => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('group_id', groupId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // Add member to group
  add: async (groupId: string, name: string, userId?: string): Promise<Member> => {
    const { data, error } = await supabase
      .from('members')
      .insert({
        group_id: groupId,
        name,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Remove member
  remove: async (memberId: string): Promise<void> => {
    const { error } = await supabase.from('members').delete().eq('id', memberId);
    if (error) throw error;
  },
};

// ============================================
// EXPENSES SERVICE
// ============================================

export const expensesService = {
  // Get all expenses for a group
  getByGroupId: async (groupId: string): Promise<Expense[]> => {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        paid_by_member:members!expenses_paid_by_fkey(name)
      `)
      .eq('group_id', groupId)
      .order('date', { ascending: false });

    if (error) throw error;

    // Transform data
    return (data || []).map((expense) => ({
      ...expense,
      paid_by_name: expense.paid_by_member?.name,
    }));
  },

  // Create expense with equal split
  create: async (
    groupId: string,
    description: string,
    amountCents: number,
    paidBy: string,
    splitBetween: string[], // member ids
    date: string,
    createdBy: string
  ): Promise<Expense> => {
    // Create expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        description,
        amount: amountCents,
        paid_by: paidBy,
        date,
        created_by: createdBy,
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    // Create equal splits
    const splitAmount = Math.floor(amountCents / splitBetween.length);
    const remainder = amountCents % splitBetween.length;

    const splits = splitBetween.map((memberId, index) => ({
      expense_id: expense.id,
      member_id: memberId,
      // Distribute remainder to first members
      amount: splitAmount + (index < remainder ? 1 : 0),
    }));

    const { error: splitsError } = await supabase.from('expense_splits').insert(splits);

    if (splitsError) throw splitsError;

    return expense;
  },

  // Get splits for an expense
  getSplits: async (expenseId: string): Promise<ExpenseSplit[]> => {
    const { data, error } = await supabase
      .from('expense_splits')
      .select(`
        *,
        member:members(name)
      `)
      .eq('expense_id', expenseId);

    if (error) throw error;

    return (data || []).map((split) => ({
      ...split,
      member_name: split.member?.name,
    }));
  },

  // Delete expense
  delete: async (expenseId: string): Promise<void> => {
    // Splits will be deleted by cascade
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) throw error;
  },
};

// ============================================
// SETTLEMENTS SERVICE
// ============================================

export const settlementsService = {
  // Get all settlements for a group
  getByGroupId: async (groupId: string): Promise<Settlement[]> => {
    const { data, error } = await supabase
      .from('settlements')
      .select(`
        *,
        from_member_data:members!settlements_from_member_fkey(name),
        to_member_data:members!settlements_to_member_fkey(name)
      `)
      .eq('group_id', groupId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map((settlement) => ({
      ...settlement,
      from_member_name: settlement.from_member_data?.name,
      to_member_name: settlement.to_member_data?.name,
    }));
  },

  // Create settlement (mark a debt as paid)
  create: async (
    groupId: string,
    fromMember: string,
    toMember: string,
    amountCents: number,
    createdBy: string
  ): Promise<Settlement> => {
    const { data, error } = await supabase
      .from('settlements')
      .insert({
        group_id: groupId,
        from_member: fromMember,
        to_member: toMember,
        amount: amountCents,
        date: new Date().toISOString(),
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete settlement
  delete: async (settlementId: string): Promise<void> => {
    const { error } = await supabase.from('settlements').delete().eq('id', settlementId);
    if (error) throw error;
  },
};
