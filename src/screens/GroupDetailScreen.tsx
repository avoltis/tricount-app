import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { Avatar, EmptyState, Card } from '../components/ui';
import { expensesService, membersService, settlementsService } from '../lib/services';
import { Expense, Member, Settlement, RootStackParamList, ExpenseSplit } from '../types';
import { formatMoney, calculateBalances, calculateSettlements, getBalanceColor } from '../utils/balance';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;

export function GroupDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId, groupName } = route.params;
  const { user } = useAuthStore();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');

  const loadData = useCallback(async () => {
    try {
      const [expensesData, membersData, settlementsData] = await Promise.all([
        expensesService.getByGroupId(groupId),
        membersService.getByGroupId(groupId),
        settlementsService.getByGroupId(groupId),
      ]);
      setExpenses(expensesData);
      setMembers(membersData);
      setSettlements(settlementsData);
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    navigation.setOptions({ title: groupName });
  }, [groupName, navigation]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await expensesService.delete(expenseId);
            loadData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete expense');
          }
        },
      },
    ]);
  };

  // Calculate balances
  const expenseSplitsMap = new Map<string, ExpenseSplit[]>();
  expenses.forEach((e) => {
    if (e.splits) expenseSplitsMap.set(e.id, e.splits);
  });
  
  const balances = calculateBalances({
    members,
    expenses,
    expenseSplits: expenseSplitsMap,
    settlements,
  });

  const suggestedSettlements = calculateSettlements(balances, members);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const renderExpense = ({ item }: { item: Expense }) => (
    <TouchableOpacity
      style={styles.expenseCard}
      onLongPress={() => handleDeleteExpense(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.expenseLeft}>
        <View style={styles.expenseIcon}>
          <Ionicons name="receipt-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription}>{item.description}</Text>
          <Text style={styles.expenseMeta}>
            Paid by {item.paid_by_name} • {format(new Date(item.date), 'MMM d')}
          </Text>
        </View>
      </View>
      <Text style={styles.expenseAmount}>{formatMoney(item.amount)}</Text>
    </TouchableOpacity>
  );

  const renderBalances = () => (
    <View style={styles.balancesContainer}>
      {/* Balance Cards */}
      <View style={styles.balanceCards}>
        {balances.map((balance) => (
          <View key={balance.memberId} style={styles.balanceCard}>
            <Avatar name={balance.memberName} size="sm" />
            <Text style={styles.balanceName}>{balance.memberName}</Text>
            <Text style={[styles.balanceAmount, { color: getBalanceColor(balance.amount) }]}>
              {balance.amount >= 0 ? '+' : ''}{formatMoney(balance.amount)}
            </Text>
          </View>
        ))}
      </View>

      {/* Settlement Suggestions */}
      {suggestedSettlements.length > 0 && (
        <View style={styles.settlementsSection}>
          <Text style={styles.settlementsTitle}>To settle up:</Text>
          {suggestedSettlements.map((settlement, index) => (
            <View key={index} style={styles.settlementItem}>
              <Avatar name={settlement.from.name} size="sm" />
              <View style={styles.settlementArrow}>
                <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
              </View>
              <Avatar name={settlement.to.name} size="sm" />
              <Text style={styles.settlementText}>
                {settlement.from.name} pays {settlement.to.name}
              </Text>
              <Text style={styles.settlementAmount}>{formatMoney(settlement.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {suggestedSettlements.length === 0 && (
        <View style={styles.settledContainer}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={styles.settledText}>All settled up! 🎉</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={styles.summaryValue}>{formatMoney(totalExpenses)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Members</Text>
          <Text style={styles.summaryValue}>{members.length}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expenses' && styles.tabActive]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'balances' && styles.tabActive]}
          onPress={() => setActiveTab('balances')}
        >
          <Text style={[styles.tabText, activeTab === 'balances' && styles.tabTextActive]}>
            Balances
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'expenses' ? (
        expenses.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="receipt-outline" size={64} color={colors.textTertiary} />}
            title="No expenses yet"
            description="Add your first expense to start tracking"
            style={styles.emptyState}
          />
        ) : (
          <FlatList
            data={expenses}
            renderItem={renderExpense}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )
      ) : (
        renderBalances()
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense', { groupId })}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.small,
    color: colors.white,
    opacity: 0.8,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.h2,
    color: colors.white,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.white,
    opacity: 0.3,
    marginHorizontal: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  listContent: {
    padding: spacing.md,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  expenseMeta: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  expenseAmount: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  separator: {
    height: spacing.sm,
  },
  balancesContainer: {
    flex: 1,
    padding: spacing.md,
  },
  balanceCards: {
    gap: spacing.sm,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  balanceName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  balanceAmount: {
    ...typography.bodySemibold,
  },
  settlementsSection: {
    marginTop: spacing.xl,
  },
  settlementsTitle: {
    ...typography.bodySemibold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  settlementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  settlementArrow: {
    marginHorizontal: spacing.xs,
  },
  settlementText: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
  },
  settlementAmount: {
    ...typography.bodySemibold,
    color: colors.primary,
  },
  settledContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  settledText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyState: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
