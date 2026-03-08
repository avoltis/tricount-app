import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, getAvatarColor } from '../../theme';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  imageUrl?: string;
  style?: ViewStyle;
}

export function Avatar({ name, size = 'md', style }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const backgroundColor = getAvatarColor(name);
  const sizeStyle = styles[`size_${size}`];
  const textStyle = styles[`text_${size}`];

  return (
    <View style={[styles.container, sizeStyle, { backgroundColor }, style]}>
      <Text style={[styles.text, textStyle]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  text: {
    color: colors.white,
    fontWeight: '600',
  },

  // Sizes
  size_sm: {
    width: 32,
    height: 32,
  },
  size_md: {
    width: 40,
    height: 40,
  },
  size_lg: {
    width: 56,
    height: 56,
  },

  text_sm: {
    fontSize: 12,
  },
  text_md: {
    fontSize: 14,
  },
  text_lg: {
    fontSize: 20,
  },
});
