import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../utils/theme';
import {
  getChildren,
  getYearSummariesForChild,
  saveProfilePhoto,
  deleteProfilePhoto,
} from '../utils/storage';

function calculateAge(birthday) {
  const today = new Date();
  const birth = new Date(birthday);
  return Math.floor((today - birth) / (365.25 * 24 * 60 * 60 * 1000));
}

function formatBirthday(birthday) {
  const d = new Date(birthday);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ChildProfileScreen({ route, navigation }) {
  const { childId } = route.params;
  const [child, setChild] = useState(null);
  const [yearSummaries, setYearSummaries] = useState([]);

  const loadData = useCallback(async () => {
    const allChildren = await getChildren();
    const found = allChildren.find((c) => c.id === childId);
    setChild(found || null);

    const summaries = await getYearSummariesForChild(childId);
    setYearSummaries(summaries);
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      await saveProfilePhoto(child.id, result.assets[0].uri);
      loadData();
    }
  };

  const handleAvatarPress = () => {
    if (child?.photoUri) {
      Alert.alert('Profile Photo', 'What would you like to do?', [
        { text: 'Change Photo', onPress: pickPhoto },
        {
          text: 'Remove Photo',
          style: 'destructive',
          onPress: async () => {
            await deleteProfilePhoto(child.id);
            loadData();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Profile Photo', 'Add a photo for this profile?', [
        { text: 'Choose Photo', onPress: pickPhoto },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const hasInterviews = yearSummaries.some((s) => s.hasInterview);
  const interviewYearCount = yearSummaries.filter((s) => s.hasInterview).length;

  const renderYearCard = ({ item }) => (
    <TouchableOpacity
      style={styles.yearCard}
      onPress={() =>
        navigation.navigate('YearDetail', {
          childId: child.id,
          childName: child.name,
          year: item.year,
          age: item.age,
        })
      }
    >
      <View style={styles.yearCardLeft}>
        <Text style={styles.yearCardYear}>{item.year}</Text>
        {item.age != null && (
          <View style={styles.yearCardAgeBadge}>
            <Text style={styles.yearCardAgeBadgeText}>Age {item.age}</Text>
          </View>
        )}
      </View>
      <View style={styles.yearCardCenter}>
        {item.hasInterview && (
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>🎥</Text>
            <Text style={[styles.badgeText, { color: COLORS.primaryDark }]}>Interview</Text>
          </View>
        )}
        {item.hasBalloonRun && (
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>🎈</Text>
            <Text style={[styles.badgeText, { color: COLORS.accentDark }]}>Balloon Run</Text>
          </View>
        )}
        {item.mediaCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>📸</Text>
            <Text style={[styles.badgeText, { color: '#4CAF7D' }]}>{item.mediaCount} media</Text>
          </View>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarTouchable}>
          <View style={styles.emojiContainer}>
            {child?.photoUri ? (
              <Image source={{ uri: child.photoUri }} style={styles.profilePhoto} />
            ) : (
              <Text style={styles.emoji}>{child?.emoji || '🧒'}</Text>
            )}
          </View>
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraIcon}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.childName}>{child?.name}</Text>
        <Text style={styles.childAge}>
          {calculateAge(child?.birthday)} years old
        </Text>
        <Text style={styles.childBirthday}>
          Born {formatBirthday(child?.birthday)}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            navigation.navigate('Interview', {
              childId: child.id,
              childName: child.name,
            })
          }
        >
          <Text style={styles.primaryButtonText}>Start Interview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.balloonRunButton}
          onPress={() =>
            navigation.navigate('BalloonRunCapture', {
              childId: child.id,
              childName: child.name,
            })
          }
        >
          <Text style={styles.balloonRunButtonText}>Balloon Run</Text>
        </TouchableOpacity>
      </View>

      {interviewYearCount >= 2 && (
        <View style={styles.actionsSecondary}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              navigation.navigate('YearCompare', { childId: child.id })
            }
          >
            <Text style={styles.secondaryButtonText}>Compare Years</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Years</Text>
        {yearSummaries.length > 0 && (
          <Text style={styles.sectionCount}>
            {yearSummaries.length} year{yearSummaries.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </View>
  );

  if (!child) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={yearSummaries}
        keyExtractor={(item) => String(item.year)}
        renderItem={renderYearCard}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🎂</Text>
            <Text style={styles.emptyTitle}>No memories yet!</Text>
            <Text style={styles.emptyText}>
              Start your first interview or add birthday media to begin.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingBottom: SIZES.paddingXl,
  },
  loadingText: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 64,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingTop: SIZES.paddingXl,
    paddingBottom: SIZES.paddingLg,
    backgroundColor: COLORS.primaryFaint,
    borderBottomLeftRadius: SIZES.radiusXl,
    borderBottomRightRadius: SIZES.radiusXl,
  },
  avatarTouchable: {
    position: 'relative',
    marginBottom: 12,
  },
  emojiContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: 'hidden',
  },
  profilePhoto: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  cameraIcon: {
    fontSize: 14,
  },
  emoji: {
    fontSize: 48,
  },
  childName: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  childAge: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 2,
  },
  childBirthday: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },

  // Action Buttons
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.paddingLg,
    paddingBottom: SIZES.padding,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: SIZES.radiusFull,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  balloonRunButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: SIZES.radiusFull,
    shadowColor: COLORS.accentDark,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  balloonRunButtonText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  actionsSecondary: {
    alignItems: 'center',
    paddingBottom: SIZES.padding,
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: SIZES.radiusFull,
    borderWidth: 2,
    borderColor: COLORS.accent,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  secondaryButtonText: {
    color: COLORS.accentDark,
    fontSize: SIZES.base,
    fontWeight: '700',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
    paddingBottom: SIZES.paddingSm,
  },
  sectionTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionCount: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },

  // Year Cards
  yearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.padding,
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.paddingSm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  yearCardLeft: {
    alignItems: 'center',
    marginRight: SIZES.padding,
    minWidth: 52,
  },
  yearCardYear: {
    fontSize: SIZES.xl,
    fontWeight: '800',
    color: COLORS.primary,
  },
  yearCardAgeBadge: {
    backgroundColor: COLORS.primaryFaint,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
    marginTop: 4,
  },
  yearCardAgeBadgeText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  yearCardCenter: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeIcon: {
    fontSize: 14,
  },
  badgeText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textLight,
    marginLeft: 8,
  },

  // Empty State
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: SIZES.paddingLg,
  },
  emptyTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
});
