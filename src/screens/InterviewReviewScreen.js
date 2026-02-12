import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { FileSystem, MediaLibrary, Sharing } from '../utils/native-modules';
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
  const [currentOverlayQuestion, setCurrentOverlayQuestion] = useState(null);
  const videoRef = useRef(null);

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
            if (FileSystem) {
              const info = await FileSystem.getInfoAsync(found.videoUri);
              setVideoExists(info.exists);
            } else if (found.videoUri.startsWith('http')) {
              setVideoExists(true);
            }
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

  // Build question lookup
  const questionsById = {};
  DEFAULT_QUESTIONS.forEach((q) => {
    questionsById[q.id] = q;
  });

  async function handleSaveToLibrary() {
    if (!MediaLibrary) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow access to save videos to your camera roll.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(interview.videoUri);
      Alert.alert('Saved!', 'Video saved to your camera roll.');
    } catch (e) {
      console.warn('Save to library error:', e);
      Alert.alert('Error', 'Could not save the video.');
    }
  }

  async function handleShare() {
    if (!Sharing) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(interview.videoUri, { mimeType: 'video/mp4' });
    } catch (e) {
      console.warn('Share error:', e);
      Alert.alert('Error', 'Could not share the video.');
    }
  }

  function handlePlaybackStatus(status) {
    if (!status.isLoaded || !interview.questionTimestamps) return;
    const pos = status.positionMillis;
    const timestamps = interview.questionTimestamps;
    let activeQ = null;
    for (let i = timestamps.length - 1; i >= 0; i--) {
      if (timestamps[i].timestampMs <= pos) {
        activeQ = questionsById[timestamps[i].questionId];
        break;
      }
    }
    setCurrentOverlayQuestion(activeQ ? activeQ.text : null);
  }

  const interviewQuestions = interview.questions || DEFAULT_QUESTIONS.map((q) => q.id);
  const hasAnswers = Object.keys(interview.answers || {}).length > 0;

  // Group questions (with or without answers) by category
  const groupedByCategory = {};
  interviewQuestions.forEach((qId) => {
    const question = questionsById[qId];
    if (!question) return;
    const answer = interview.answers?.[qId];
    if (hasAnswers && !answer) return; // For old interviews, only show answered questions
    if (!groupedByCategory[question.category]) {
      groupedByCategory[question.category] = [];
    }
    groupedByCategory[question.category].push({ ...question, answer: answer || null });
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
          <View>
            <Video
              ref={videoRef}
              source={{ uri: interview.videoUri }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              style={styles.video}
              onPlaybackStatusUpdate={handlePlaybackStatus}
            />
            {currentOverlayQuestion && (
              <View testID="question-overlay" style={styles.questionOverlay} pointerEvents="none">
                <Text testID="question-overlay-text" style={styles.questionOverlayText}>{currentOverlayQuestion}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={{ fontSize: 40 }}>🎥</Text>
            <Text style={styles.placeholderText}>Video not available</Text>
          </View>
        )}
      </View>

      {interview.videoUri && videoExists && (
        <View style={styles.videoActions}>
          <TouchableOpacity testID="button-save-video" style={styles.actionButton} onPress={handleSaveToLibrary}>
            <Text style={styles.actionButtonText}>Save to Camera Roll</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="button-share-video" style={styles.actionButton} onPress={handleShare}>
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Video Interview banner for video-only interviews */}
      {!hasAnswers && (
        <View style={styles.videoBanner}>
          <Text style={styles.videoBannerEmoji}>🎬</Text>
          <Text style={styles.videoBannerText}>Video Interview</Text>
          <Text style={styles.videoBannerSub}>Answers are captured in the video above</Text>
        </View>
      )}

      {/* Q&A by Category */}
      {categoryOrder.map((catKey) => {
        const items = groupedByCategory[catKey];
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
                {item.answer && (
                  <Text style={styles.answerText}>{item.answer}</Text>
                )}
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
  videoActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SIZES.padding,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionButtonText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  questionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  questionOverlayText: {
    color: '#FFFFFF',
    fontSize: SIZES.md,
    fontWeight: '600',
    textAlign: 'center',
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

  // Video Interview Banner
  videoBanner: {
    backgroundColor: COLORS.primaryFaint,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.padding,
    marginBottom: SIZES.paddingLg,
    alignItems: 'center',
  },
  videoBannerEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  videoBannerText: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  videoBannerSub: {
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
