import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../utils/theme';
import {
  getChildren,
  getInterviewsForChild,
  deleteInterview,
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

function formatInterviewDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ChildProfileScreen({ route, navigation }) {
  const { childId } = route.params;
  const [child, setChild] = useState(null);
  const [interviews, setInterviews] = useState([]);

  const loadData = useCallback(async () => {
    const allChildren = await getChildren();
    const found = allChildren.find((c) => c.id === childId);
    setChild(found || null);

    const childInterviews = await getInterviewsForChild(childId);
    setInterviews(childInterviews);
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDeleteInterview = (interview) => {
    Alert.alert(
      'Delete Interview',
      `Are you sure you want to delete the ${interview.year} interview? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteInterview(interview.id);
            loadData();
          },
        },
      ]
    );
  };

  const renderInterviewCard = ({ item }) => (
    <TouchableOpacity
      style={styles.interviewCard}
      onPress={() =>
        navigation.navigate('InterviewReview', { interviewId: item.id })
      }
      onLongPress={() => handleDeleteInterview(item)}
    >
      <View style={styles.interviewCardLeft}>
        <Text style={styles.interviewYear}>{item.year}</Text>
        <View style={styles.ageBadge}>
          <Text style={styles.ageBadgeText}>Age {item.age}</Text>
        </View>
      </View>
      <View style={styles.interviewCardCenter}>
        <Text style={styles.interviewDate}>{formatInterviewDate(item.date)}</Text>
        <Text style={styles.interviewQuestionCount}>
          {Object.keys(item.answers || {}).length} answers recorded
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{child?.emoji || '🧒'}</Text>
        </View>
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

        {interviews.length >= 2 && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              navigation.navigate('YearCompare', { childId: child.id })
            }
          >
            <Text style={styles.secondaryButtonText}>Compare Years</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Interview History</Text>
        {interviews.length > 0 && (
          <Text style={styles.sectionCount}>
            {interviews.length} interview{interviews.length !== 1 ? 's' : ''}
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
        data={interviews}
        keyExtractor={(item) => item.id}
        renderItem={renderInterviewCard}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🎥</Text>
            <Text style={styles.emptyTitle}>No interviews yet!</Text>
            <Text style={styles.emptyText}>
              Start your first one to capture this year's memories.
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
    marginBottom: 12,
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

  // Interview Cards
  interviewCard: {
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
  interviewCardLeft: {
    alignItems: 'center',
    marginRight: SIZES.padding,
  },
  interviewYear: {
    fontSize: SIZES.xl,
    fontWeight: '800',
    color: COLORS.primary,
  },
  ageBadge: {
    backgroundColor: COLORS.primaryFaint,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
    marginTop: 4,
  },
  ageBadgeText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  interviewCardCenter: {
    flex: 1,
  },
  interviewDate: {
    fontSize: SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  interviewQuestionCount: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
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
