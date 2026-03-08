import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button, Input, Avatar } from '../../components/ui';
import { groupsService } from '../../lib/services';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD'];

export function CreateGroupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [members, setMembers] = useState<string[]>([user?.user_metadata?.name || 'Me']);
  const [newMember, setNewMember] = useState('');
  const [loading, setLoading] = useState(false);

  const addMember = () => {
    const trimmed = newMember.trim();
    if (trimmed && !members.includes(trimmed)) {
      setMembers([...members, trimmed]);
      setNewMember('');
    }
  };

  const removeMember = (memberName: string) => {
    if (members.length > 1) {
      setMembers(members.filter((m) => m !== memberName));
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    if (members.length < 2) {
      Alert.alert('Error', 'Add at least 2 members');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      await groupsService.create(
        name.trim(),
        currency,
        user.id,
        members,
        description.trim() || undefined
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Group Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Info</Text>
          
          <Input
            label="Group Name"
            placeholder="e.g., Trip to Paris"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Description (optional)"
            placeholder="What's this group for?"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Currency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currency</Text>
          <View style={styles.currencyGrid}>
            {CURRENCIES.map((curr) => (
              <TouchableOpacity
                key={curr}
                style={[
                  styles.currencyButton,
                  currency === curr && styles.currencyButtonActive,
                ]}
                onPress={() => setCurrency(curr)}
              >
                <Text
                  style={[
                    styles.currencyText,
                    currency === curr && styles.currencyTextActive,
                  ]}
                >
                  {curr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          
          <View style={styles.memberInputRow}>
            <View style={styles.memberInputContainer}>
              <Input
                placeholder="Add member name"
                value={newMember}
                onChangeText={setNewMember}
                onSubmitEditing={addMember}
                containerStyle={styles.memberInput}
              />
            </View>
            <TouchableOpacity style={styles.addMemberButton} onPress={addMember}>
              <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.membersList}>
            {members.map((member, index) => (
              <View key={member} style={styles.memberItem}>
                <Avatar name={member} size="sm" />
                <Text style={styles.memberName}>{member}</Text>
                {members.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeMemberButton}
                    onPress={() => removeMember(member)}
                  >
                    <Ionicons name="close" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <Button
          title="Create Group"
          onPress={handleCreate}
          loading={loading}
          disabled={!name.trim() || members.length < 2}
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
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  currencyButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  currencyText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  currencyTextActive: {
    color: colors.white,
  },
  memberInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  memberInputContainer: {
    flex: 1,
  },
  memberInput: {
    marginBottom: 0,
  },
  addMemberButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22, // Align with input
  },
  membersList: {
    gap: spacing.sm,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  memberName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  removeMemberButton: {
    padding: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
