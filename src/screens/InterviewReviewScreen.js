import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../utils/theme';
import { getInterviews, getChildren } from '../utils/storage';
import DEFAULT_QUESTIONS, { QUESTION_CATEGORIES } from '../data/questions';

export default function InterviewReviewScreen({ route }) {
  const { interviewId } = route.params;
  const [interview, setInterview] = useState(null);
  const [child, setChild] = useState(null);
  const [videoExists, setVideoExists] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        try {
          const interviews = await getInterviews();
          const found = interviews.find((i) => i.id === interviewId);
          if (!found) {
            setLoading(false);
            return;
          }
          setInterview(found);

          const children = await getChildren();
          const matchedChild = children.find((c) => c.id === found.childId);
          setChild(matchedChild || null);

          if (found.videoUri) {
            const info = await FileSystem.getInfoAsync(found.videoUri);
            setVideoExists(info.exists);
          }
        } catch (e) {
          console.warn('Failed to load interview:', e);
        } finally {
          setLoading(false);
        }
      }
      load();
    }, [interviewId])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!interview) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 48 }}>🤷</Text>
        <Text style={styles.emptyText}>Interview not found.</Text>
      </View>
    );
  }

  // Build grouped Q&A: only include questions that have answers
  const questionsById = {};
  DEFAULT_QUESTIONS.forEach((q) => {
    questionsById[q.id] = q;
  });

  const answeredByCategory = {};
  const interviewQuestions = interview.questions || DEFAULT_QUESTIONS.map((q) => q.id);

  interviewQuestions.forEach((qId) => {
    const answer = interview.answers?.[qId];
    if (!answer) return;
    const question = questionsById[qId];
    if (!question) return;
    if (!answeredByCategory[question.category]) {
      answeredByCategory[question.category] = [];
    }
    answeredByCategory[question.category].push({ ...question, answer });
  });

  // Maintain category display order
  const categoryOrder = Object.keys(QUESTION_CATEGORIES);

  const formattedDate = interview.date
    ? new Date(interview.date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Video Player */}
      <View style={styles.videoCard}>
        {interview.videoUri && videoExists ? (
          <Video
            source={{ uri: interview.videoUri }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            style={styles.video}
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={{ fontSize: 40 }}>🎥</Text>
            <Text style={styles.placeholderText}>Video not available</Text>
          </View>
        )}
      </View>

      {/* Interview Metadata */}
      <View style={styles.metaCard}>
        <View style={styles.metaRow}>
          {child && (
            <Text style={styles.childName}>
              {child.emoji || '🧒'} {child.name}
            </Text>
          )}
        </View>
        <View style={styles.metaDetails}>
          {interview.year != null && (
            <Text style={styles.metaTag}>Year {interview.year}</Text>
          )}
          {interview.age != null && (
            <Text style={styles.metaTag}>Age {interview.age}</Text>
          )}
          {formattedDate !== '' && (
            <Text style={styles.metaDate}>{formattedDate}</Text>
          )}
        </View>
      </View>

      {/* Q&A by Category */}
      {categoryOrder.map((catKey) => {
        const items = answeredByCategory[catKey];
        if (!items || items.length === 0) return null;
        const category = QUESTION_CATEGORIES[catKey];
        return (
          <View key={catKey} style={styles.categorySection}>
            <Text style={styles.categoryHeader}>
              {category.emoji} {category.label}
            </Text>
            {items.map((item) => (
              <View key={item.id} style={styles.qaCard}>
                <Text style={styles.questionText}>{item.text}</Text>
                <Text style={styles.answerText}>{item.answer}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: SIZES.padding,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.paddingLg,
  },
  emptyText: {
    fontSize: SIZES.lg,
    color: COLORS.textSecondary,
    marginTop: 12,
  },

  // Video
  videoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: SIZES.padding,
  },
  video: {
    width: '100%',
    height: 250,
  },
  videoPlaceholder: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  placeholderText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    marginTop: 8,
  },

  // Metadata
  metaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.padding,
    marginBottom: SIZES.paddingLg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  metaRow: {
    marginBottom: 8,
  },
  childName: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  metaDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaTag: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryFaint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    overflow: 'hidden',
  },
  metaDate: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },

  // Categories & Q&A
  categorySection: {
    marginBottom: SIZES.paddingLg,
  },
  categoryHeader: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  qaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  questionText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  answerText: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
  },
});
