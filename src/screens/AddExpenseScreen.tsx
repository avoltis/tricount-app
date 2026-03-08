import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius } from '../theme';
import { Button, Input, Avatar } from '../components/ui';
import { expensesService, membersService } from '../lib/services';
import { Member, RootStackParamList } from '../types';
import { parseToCents, formatMoney } from '../utils/balance';
import { useAuthStore } from '../store/authStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddExpenseRouteProp = RouteProp<RootStackParamList, 'AddExpense'>;

export function AddExpenseScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddExpenseRouteProp>();
  const { groupId } = route.params;
  const { user } = useAuthStore();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [splitBetween, setSplitBetween] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const data = await membersService.getByGroupId(groupId);
      setMembers(data);
      // Default: everyone splits
      setSplitBetween(data.map((m: Member) => m.id));
      // Default payer: first member
      if (data.length > 0) setPaidBy(data[0].id);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const toggleSplitMember = (memberId: string) => {
    if (splitBetween.includes(memberId)) {
      // Don't allow removing all members
      if (splitBetween.length > 1) {
        setSplitBetween(splitBetween.filter((id) => id !== memberId));
      }
    } else {
      setSplitBetween([...splitBetween, memberId]);
    }
  };

  const handleCreate = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!amount || parseToCents(amount) === 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!paidBy) {
      Alert.alert('Error', 'Please select who paid');
      return;
    }
    if (splitBetween.length === 0) {
      Alert.alert('Error', 'Select at least one person to split with');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      await expensesService.create(
        groupId,
        description.trim(),
        parseToCents(amount),
        paidBy,
        splitBetween,
        new Date().toISOString(),
        user.id
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  const amountCents = parseToCents(amount);
  const splitAmount = splitBetween.length > 0 ? Math.floor(amountCents / splitBetween.length) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Description & Amount */}
        <View style={styles.section}>
          <Input
            label="Description"
            placeholder="e.g., Dinner at restaurant"
            value={description}
            onChangeText={setDescription}
          />

          <Input
            label="Amount"
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            leftIcon={<Text style={styles.currencySymbol}>€</Text>}
          />
        </View>

        {/* Who Paid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who paid?</Text>
          <View style={styles.membersGrid}>
            {members.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberButton,
                  paidBy === member.id && styles.memberButtonActive,
                ]}
                onPress={() => setPaidBy(member.id)}
              >
                <Avatar name={member.name} size="sm" />
                <Text
                  style={[
                    styles.memberButtonText,
                    paidBy === member.id && styles.memberButtonTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {member.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Split Between */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Split between</Text>
          <View style={styles.membersGrid}>
            {members.map((member) => {
              const isSelected = splitBetween.includes(member.id);
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberButton,
                    isSelected && styles.memberButtonActive,
                  ]}
                  onPress={() => toggleSplitMember(member.id)}
                >
                  <View style={styles.checkContainer}>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color={colors.textTertiary} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.memberButtonText,
                      isSelected && styles.memberButtonTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {member.name}
                  </Text>
                  {isSelected && amountCents > 0 && (
                    <Text style={styles.splitAmount}>{formatMoney(splitAmount)}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {amountCents > 0 && splitBetween.length > 0 && (
            <Text style={styles.splitInfo}>
              {formatMoney(splitAmount)} per person ({splitBetween.length} {splitBetween.length === 1 ? 'person' : 'people'})
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <Button
          title="Add Expense"
          onPress={handleCreate}
          loading={loading}
          disabled={!description.trim() || !amount || !paidBy}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.bodySemibold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  currencySymbol: {
    ...typography.bodySemibold,
    color: colors.textSecondary,
  },
  membersGrid: {
    gap: spacing.sm,
  },
  memberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  memberButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '15',
  },
  memberButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  memberButtonTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  checkContainer: {
    width: 20,
  },
  splitAmount: {
    ...typography.smallMedium,
    color: colors.textSecondary,
  },
  splitInfo: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
