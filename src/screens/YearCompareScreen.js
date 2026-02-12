import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../utils/theme';
import { getChildren, getInterviewsForChild } from '../utils/storage';
import DEFAULT_QUESTIONS, { QUESTION_CATEGORIES } from '../data/questions';

const ALL_FILTER = 'all';

export default function YearCompareScreen({ route }) {
  const { childId } = route.params;
  const [child, setChild] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(ALL_FILTER);

  const loadData = useCallback(async () => {
    const allChildren = await getChildren();
    const found = allChildren.find((c) => c.id === childId);
    setChild(found || null);

    const childInterviews = await getInterviewsForChild(childId);
    // Storage returns newest first, reverse to get chronological (oldest first)
    setInterviews([...childInterviews].reverse());
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const categoryKeys = Object.keys(QUESTION_CATEGORIES);

  const filteredQuestions =
    selectedCategory === ALL_FILTER
      ? DEFAULT_QUESTIONS
      : DEFAULT_QUESTIONS.filter((q) => q.category === selectedCategory);

  if (!child) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (interviews.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>📊</Text>
          <Text style={styles.emptyTitle}>No interviews to compare</Text>
          <Text style={styles.emptyText}>
            Record birthday interviews to see how {child.name}'s answers change
            over the years.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>
            {child.emoji} {child.name}'s Answers Over Time
          </Text>
          <Text style={styles.pageSubtitle}>
            {interviews.length} interview{interviews.length !== 1 ? 's' : ''} recorded
          </Text>
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipContainer}
          style={styles.chipScroll}
        >
          <TouchableOpacity
            style={[
              styles.chip,
              selectedCategory === ALL_FILTER && styles.chipSelected,
            ]}
            onPress={() => setSelectedCategory(ALL_FILTER)}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === ALL_FILTER && styles.chipTextSelected,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {categoryKeys.map((key) => {
            const cat = QUESTION_CATEGORIES[key];
            const isSelected = selectedCategory === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setSelectedCategory(key)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {cat.emoji} {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Questions with Timeline */}
        {filteredQuestions.map((question) => {
          const category = QUESTION_CATEGORIES[question.category];
          return (
            <View key={question.id} style={styles.questionBlock}>
              {/* Question Header */}
              <View style={styles.questionHeader}>
                <Text style={styles.questionEmoji}>{category?.emoji}</Text>
                <Text style={styles.questionText}>{question.text}</Text>
              </View>

              {/* Timeline of answers */}
              <View style={styles.timeline}>
                {interviews.map((interview, index) => {
                  const answer = interview.answers?.[question.id];
                  const isLast = index === interviews.length - 1;
                  return (
                    <View key={interview.id} style={styles.timelineEntry}>
                      {/* Timeline connector */}
                      <View style={styles.timelineLeft}>
                        <View style={styles.timelineDot} />
                        {!isLast && <View style={styles.timelineLine} />}
                      </View>

                      {/* Content */}
                      <View style={styles.timelineContent}>
                        <Text style={styles.yearLabel}>
                          {interview.year} (age {interview.age})
                        </Text>
                        {interview.transcription?.status === 'processing' ? (
                          <Text style={styles.answerVideoOnly}>Transcribing...</Text>
                        ) : !answer?.text && Object.values(interview.answers || {}).every((a) => !a?.text) ? (
                          <Text style={styles.answerVideoOnly}>Video only</Text>
                        ) : (
                          <View style={styles.answerRow}>
                            <Text
                              style={[
                                styles.answerText,
                                !answer?.text && styles.answerEmpty,
                              ]}
                            >
                              {answer?.text || '\u2014'}
                            </Text>
                            {interview.enrichment?.[question.id]?.emojis && (
                              <Text style={styles.enrichmentEmojis}>
                                {interview.enrichment[question.id].emojis.join(' ')}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SIZES.paddingXl,
  },
  loadingText: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 64,
  },

  // Page Header
  pageHeader: {
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.paddingLg,
    paddingBottom: SIZES.paddingSm,
  },
  pageTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  pageSubtitle: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Category Chips
  chipScroll: {
    marginBottom: SIZES.padding,
  },
  chipContainer: {
    paddingHorizontal: SIZES.padding,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.surface,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  chipTextSelected: {
    color: COLORS.white,
  },

  // Question Block
  questionBlock: {
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.paddingLg,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.padding,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.padding,
  },
  questionEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  questionText: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },

  // Timeline
  timeline: {
    paddingLeft: 4,
  },
  timelineEntry: {
    flexDirection: 'row',
    minHeight: 48,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primaryLight,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  yearLabel: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  answerText: {
    fontSize: SIZES.base,
    color: COLORS.text,
    lineHeight: 22,
  },
  answerEmpty: {
    color: COLORS.textLight,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  enrichmentEmojis: {
    fontSize: SIZES.base,
    marginLeft: 6,
  },
  answerVideoOnly: {
    fontSize: SIZES.base,
    color: COLORS.accent,
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Empty State
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
