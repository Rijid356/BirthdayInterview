import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { FileSystem, MediaLibrary, Sharing } from '../utils/native-modules';
import { COLORS, SIZES } from '../utils/theme';
import { getInterviews, getChildren, updateInterview, getApiKeys, copyVideoWithFriendlyName, cleanupTempShareFiles } from '../utils/storage';
import DEFAULT_QUESTIONS, { QUESTION_CATEGORIES } from '../data/questions';
import TranscriptionBanner from '../components/TranscriptionBanner';
import EditableAnswer from '../components/EditableAnswer';
import SpotifyCard from '../components/SpotifyCard';
import { runTranscriptionPipeline } from '../utils/transcription';
import { searchSongForInterview } from '../utils/spotify';
import { enrichInterview } from '../utils/enrichment';

export default function InterviewReviewScreen({ route, navigation }) {
  const { interviewId, autoTranscribe } = route.params;
  const [interview, setInterview] = useState(null);
  const [child, setChild] = useState(null);
  const [videoExists, setVideoExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentOverlayQuestion, setCurrentOverlayQuestion] = useState(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState(null);
  const [transcriptionError, setTranscriptionError] = useState(null);
  const [apiKeys, setApiKeys] = useState(null);
  const [spotifyData, setSpotifyData] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const videoRef = useRef(null);
  const soundRef = useRef(null);
  const transcriptionRanRef = useRef(false);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  async function reloadInterview() {
    const interviews = await getInterviews();
    const found = interviews.find((i) => i.id === interviewId);
    if (found) {
      setInterview(found);
      setTranscriptionStatus(found.transcription?.status || null);
      setTranscriptionError(found.transcription?.error || null);
      setSpotifyData(found.spotify || null);
    }
    return found;
  }

  async function runPostTranscription(updatedInterview, keys) {
    const answers = updatedInterview.answers || {};

    // Spotify search for q5 (favorite song)
    const q5Answer = answers.q5?.text;
    if (q5Answer) {
      const spotifyResult = await searchSongForInterview(q5Answer, keys);
      if (spotifyResult) {
        await updateInterview(interviewId, { spotify: spotifyResult });
      }
    }

    // Enrichment
    const enrichment = enrichInterview(answers, DEFAULT_QUESTIONS);
    if (Object.keys(enrichment).length > 0) {
      await updateInterview(interviewId, { enrichment });
    }

    await reloadInterview();
  }

  async function handleTranscribe(keys) {
    if (!keys?.openaiKey) {
      setTranscriptionStatus('no_key');
      return;
    }

    setTranscriptionStatus('processing');
    try {
      await runTranscriptionPipeline(
        interviewId,
        interview.videoUri,
        interview.questionTimestamps,
        keys.openaiKey
      );
      const updated = await reloadInterview();
      if (updated) {
        await runPostTranscription(updated, keys);
      }
    } catch (e) {
      setTranscriptionStatus('failed');
      setTranscriptionError(e.message);
      await reloadInterview();
    }
  }

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
          setTranscriptionStatus(found.transcription?.status || null);
          setTranscriptionError(found.transcription?.error || null);
          setSpotifyData(found.spotify || null);

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

          const keys = await getApiKeys();
          setApiKeys(keys);

          // Auto-transcribe on first load after recording
          if (
            autoTranscribe &&
            found.transcription?.status === 'pending' &&
            !transcriptionRanRef.current
          ) {
            transcriptionRanRef.current = true;
            // Defer to avoid blocking initial render
            setTimeout(() => {
              setInterview(found); // ensure state is set
              if (keys?.openaiKey) {
                setTranscriptionStatus('processing');
                runTranscriptionPipeline(
                  interviewId,
                  found.videoUri,
                  found.questionTimestamps,
                  keys.openaiKey
                ).then(async () => {
                  const updated = await reloadInterview();
                  if (updated) await runPostTranscription(updated, keys);
                }).catch(async (e) => {
                  setTranscriptionStatus('failed');
                  setTranscriptionError(e.message);
                  await reloadInterview();
                });
              } else {
                setTranscriptionStatus('no_key');
              }
            }, 500);
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

  // ─── Answer editing ───

  async function handleAnswerEdit(questionId, newText) {
    const currentAnswers = { ...(interview.answers || {}) };
    currentAnswers[questionId] = {
      text: newText,
      source: 'edited',
      editedAt: new Date().toISOString(),
    };
    await updateInterview(interviewId, { answers: currentAnswers });

    // Re-run enrichment for this question
    const enrichment = enrichInterview(currentAnswers, DEFAULT_QUESTIONS);
    await updateInterview(interviewId, { enrichment });

    // Re-run Spotify if q5 changed
    const question = DEFAULT_QUESTIONS.find((q) => q.id === questionId);
    if (question?.spotifySearch && apiKeys) {
      const spotifyResult = await searchSongForInterview(newText, apiKeys);
      await updateInterview(interviewId, { spotify: spotifyResult });
    }

    await reloadInterview();
  }

  // ─── Audio preview ───

  async function handlePlayPreview() {
    if (!spotifyData?.previewUrl) return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: spotifyData.previewUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setIsPlayingPreview(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlayingPreview(false);
        }
      });
    } catch (e) {
      console.warn('Audio preview error:', e);
      setIsPlayingPreview(false);
    }
  }

  async function handleStopPreview() {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      setIsPlayingPreview(false);
    }
  }

  // ─── Render guards ───

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

      // Verify the source video still exists on disk
      if (FileSystem && interview.videoUri) {
        const fileInfo = await FileSystem.getInfoAsync(interview.videoUri);
        if (!fileInfo.exists) {
          Alert.alert('Video Not Found', 'The video file is missing from storage. It may have been deleted.');
          return;
        }
      }

      // Use the original video URI for MediaLibrary (not the friendly-named copy,
      // which has spaces/special chars that break Android MIME type detection).
      await MediaLibrary.createAssetAsync(interview.videoUri);
      Alert.alert('Saved!', 'Video saved to your camera roll.');
    } catch (e) {
      console.warn('Save to library error:', e);
      Alert.alert('Error', `Could not save the video.\n\n${e.message || 'Unknown error'}`);
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

      // Verify the source video still exists on disk
      if (FileSystem && interview.videoUri) {
        const fileInfo = await FileSystem.getInfoAsync(interview.videoUri);
        if (!fileInfo.exists) {
          Alert.alert('Video Not Found', 'The video file is missing from storage. It may have been deleted.');
          return;
        }
      }

      let videoUri = interview.videoUri;
      if (child?.name != null && interview.age != null) {
        try {
          videoUri = await copyVideoWithFriendlyName(interview.videoUri, child.name, interview.age);
        } catch (copyErr) {
          console.warn('Friendly name copy failed, using original:', copyErr);
          videoUri = interview.videoUri;
        }
      }
      await Sharing.shareAsync(videoUri, { mimeType: 'video/mp4' });
      await cleanupTempShareFiles();
    } catch (e) {
      console.warn('Share error:', e);
      await cleanupTempShareFiles().catch(() => {});
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
  const hasAnswers = Object.values(interview.answers || {}).some((a) => a?.text);
  const answers = interview.answers || {};
  const enrichmentData = interview.enrichment || {};

  // Always show all questions (no backward compat filtering)
  const groupedByCategory = {};
  interviewQuestions.forEach((qId) => {
    const question = questionsById[qId];
    if (!question) return;
    const answer = answers[qId] || null;
    if (!groupedByCategory[question.category]) {
      groupedByCategory[question.category] = [];
    }
    groupedByCategory[question.category].push({ ...question, answer });
  });

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

      {/* Transcription Banner */}
      <TranscriptionBanner
        status={transcriptionStatus}
        error={transcriptionError}
        onRetry={() => handleTranscribe(apiKeys)}
        onSetup={() => navigation.navigate('Settings')}
      />

      {/* Spotify Card */}
      {spotifyData && (
        <SpotifyCard
          spotify={spotifyData}
          isPlaying={isPlayingPreview}
          onPlay={handlePlayPreview}
          onStop={handleStopPreview}
        />
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
                <EditableAnswer
                  answer={item.answer}
                  enrichment={enrichmentData[item.id]}
                  onSave={(newText) => handleAnswerEdit(item.id, newText)}
                />
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
});
