import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, SIZES } from '../utils/theme';
import {
  getChildren,
  moveVideoToStorage,
  saveInterview,
} from '../utils/storage';
import questions from '../data/questions';

// ─── Helpers ───

function calculateAge(birthdayISO) {
  const birth = new Date(birthdayISO);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// ─── Progress Bar ───

function ProgressBar({ current, total }) {
  const progress = total > 0 ? (current + 1) / total : 0;
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${progress * 100}%` }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
});

// ─── Recording Pulse Dot ───

function PulsingDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.recordDot, { opacity }]} />;
}

// ─── Main Screen ───

export default function InterviewScreen({ route, navigation }) {
  const { childId, childName } = route.params;

  // Camera
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  // State
  const [phase, setPhase] = useState('intro'); // 'intro' | 'recording' | 'answers'
  const [facing, setFacing] = useState('front');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [videoUri, setVideoUri] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex];

  // ─── Navigation helpers ───

  function goNext() {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }

  function goPrev() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }

  // ─── Phase transitions ───

  async function startRecording() {
    if (!cameraRef.current) return;
    setPhase('recording');
    setIsRecording(true);
    setCurrentQuestionIndex(0);

    try {
      const result = await cameraRef.current.recordAsync();
      // recordAsync resolves when stopRecording() is called
      if (result?.uri) {
        setVideoUri(result.uri);
      }
    } catch (e) {
      console.warn('Recording error:', e);
      Alert.alert('Recording Error', 'Something went wrong with the recording. Please try again.');
      setPhase('intro');
      setIsRecording(false);
    }
  }

  function stopRecording() {
    if (!cameraRef.current) return;
    cameraRef.current.stopRecording();
    setIsRecording(false);
    setCurrentQuestionIndex(0);
    setPhase('answers');
  }

  // ─── Save interview ───

  async function handleSave() {
    setSaving(true);
    try {
      // Move video to permanent storage
      const filename = `interview_${childId}_${Date.now()}.mp4`;
      const storedUri = await moveVideoToStorage(videoUri, filename);

      // Calculate age from child's birthday
      const children = await getChildren();
      const child = children.find((c) => c.id === childId);
      const age = child ? calculateAge(child.birthday) : null;

      // Build the answer map (only include answered questions)
      const answerMap = {};
      questions.forEach((q) => {
        if (answers[q.id] !== undefined && answers[q.id] !== '') {
          answerMap[q.id] = answers[q.id];
        }
      });

      const interview = {
        id: generateId(),
        childId,
        year: new Date().getFullYear(),
        age,
        date: new Date().toISOString(),
        questions: questions.map((q) => q.id),
        answers: answerMap,
        videoUri: storedUri,
        createdAt: new Date().toISOString(),
      };

      await saveInterview(interview);

      navigation.replace('InterviewReview', { interviewId: interview.id });
    } catch (e) {
      console.warn('Save error:', e);
      Alert.alert('Save Error', 'Could not save the interview. Please try again.');
      setSaving(false);
    }
  }

  // ─── Permission handling ───

  if (!permission) {
    // Permissions still loading
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.permissionText}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🎥</Text>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            We need camera access to record your birthday interview video.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Phase 1: Intro ───

  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.introContainer}>
          {/* Camera Preview */}
          <View style={styles.cameraPreviewWrapper}>
            <CameraView
              ref={cameraRef}
              style={styles.cameraPreview}
              mode="video"
              facing={facing}
            />
            {/* Flip button */}
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}
            >
              <Text style={styles.flipButtonText}>Flip</Text>
            </TouchableOpacity>
          </View>

          {/* Info section */}
          <View style={styles.introInfo}>
            <Text style={styles.introTitle}>
              {childName}'s Birthday Interview
            </Text>
            <Text style={styles.introInstructions}>
              Record your birthday interview! The camera will record continuously
              while you go through the questions.
            </Text>
            <Text style={styles.introDetail}>
              {totalQuestions} questions across 6 categories
            </Text>

            <TouchableOpacity
              style={styles.startRecordingButton}
              onPress={startRecording}
            >
              <View style={styles.recordIconOuter}>
                <View style={styles.recordIconInner} />
              </View>
              <Text style={styles.startRecordingText}>Start Recording</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Phase 2: Recording ───

  if (phase === 'recording') {
    return (
      <View style={styles.recordingContainer}>
        {/* Full-screen camera */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          mode="video"
          facing={facing}
        />

        {/* Top bar: recording indicator + flip + progress */}
        <SafeAreaView style={styles.recordingTopBar}>
          <View style={styles.recordingTopRow}>
            <View style={styles.recordingIndicator}>
              <PulsingDot />
              <Text style={styles.recordingIndicatorText}>REC</Text>
            </View>
            <TouchableOpacity
              style={styles.flipButtonSmall}
              onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}
            >
              <Text style={styles.flipButtonSmallText}>Flip</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.recordingProgressWrapper}>
            <ProgressBar current={currentQuestionIndex} total={totalQuestions} />
          </View>
        </SafeAreaView>

        {/* Bottom panel: question + controls */}
        <View style={styles.recordingBottomPanel}>
          <Text style={styles.questionCounter}>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </Text>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>

          {/* Navigation buttons */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[
                styles.navButton,
                currentQuestionIndex === 0 && styles.navButtonDisabled,
              ]}
              onPress={goPrev}
              disabled={currentQuestionIndex === 0}
            >
              <Text
                style={[
                  styles.navButtonText,
                  currentQuestionIndex === 0 && styles.navButtonTextDisabled,
                ]}
              >
                Prev
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stopRecordingButton}
              onPress={stopRecording}
            >
              <View style={styles.stopIcon} />
              <Text style={styles.stopRecordingText}>Stop</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                currentQuestionIndex === totalQuestions - 1 && styles.navButtonDisabled,
              ]}
              onPress={goNext}
              disabled={currentQuestionIndex === totalQuestions - 1}
            >
              <Text
                style={[
                  styles.navButtonText,
                  currentQuestionIndex === totalQuestions - 1 && styles.navButtonTextDisabled,
                ]}
              >
                Next
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─── Phase 3: Answer Entry ───

  if (phase === 'answers') {
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Top progress */}
          <View style={styles.answersTopBar}>
            <View style={styles.answersHeader}>
              <Text style={styles.answersTitle}>Enter Answers</Text>
              <View style={styles.videoSavedBadge}>
                <Text style={styles.videoSavedText}>Video saved</Text>
              </View>
            </View>
            <ProgressBar current={currentQuestionIndex} total={totalQuestions} />
          </View>

          <ScrollView
            style={styles.answersContent}
            contentContainerStyle={styles.answersContentInner}
            keyboardShouldPersistTaps="handled"
          >
            {/* Question counter */}
            <Text style={styles.answerQuestionCounter}>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </Text>

            {/* Question text */}
            <Text style={styles.answerQuestionText}>{currentQuestion.text}</Text>

            {/* Answer input */}
            <TextInput
              style={styles.answerInput}
              placeholder="Type the answer here..."
              placeholderTextColor={COLORS.textLight}
              value={answers[currentQuestion.id] || ''}
              onChangeText={(text) =>
                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: text }))
              }
              multiline
              textAlignVertical="top"
              autoFocus={false}
            />
          </ScrollView>

          {/* Bottom controls */}
          <View style={styles.answersBottomBar}>
            <View style={styles.navRow}>
              <TouchableOpacity
                style={[
                  styles.answerNavButton,
                  currentQuestionIndex === 0 && styles.answerNavButtonDisabled,
                ]}
                onPress={goPrev}
                disabled={currentQuestionIndex === 0}
              >
                <Text
                  style={[
                    styles.answerNavButtonText,
                    currentQuestionIndex === 0 && styles.answerNavButtonTextDisabled,
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              {isLastQuestion ? (
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save Interview'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.answerNavButton}
                  onPress={goNext}
                >
                  <Text style={styles.answerNavButtonText}>Next</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Always-visible save for non-last questions */}
            {!isLastQuestion && (
              <TouchableOpacity
                style={[styles.earlyFinishButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.earlyFinishText}>
                  {saving ? 'Saving...' : 'Finish & Save Early'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return null;
}

// ─── Styles ───

const styles = StyleSheet.create({
  // General
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.paddingXl,
  },

  // Permission
  permissionTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },

  // Buttons (shared)
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: SIZES.radiusFull,
    marginBottom: 12,
    shadowColor: COLORS.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ─── Phase 1: Intro ───
  introContainer: {
    flex: 1,
  },
  cameraPreviewWrapper: {
    height: '45%',
    backgroundColor: COLORS.black,
    overflow: 'hidden',
    position: 'relative',
  },
  cameraPreview: {
    flex: 1,
  },
  flipButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: SIZES.radiusFull,
  },
  flipButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  introInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.paddingLg,
  },
  introTitle: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  introInstructions: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  introDetail: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginBottom: 24,
  },
  startRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.recording,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: SIZES.radiusFull,
    marginBottom: 12,
    shadowColor: COLORS.recording,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  recordIconOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recordIconInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.white,
  },
  startRecordingText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },

  // ─── Phase 2: Recording ───
  recordingContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  recordingTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: SIZES.padding,
    paddingTop: 8,
  },
  recordingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.radiusFull,
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.recording,
    marginRight: 6,
  },
  recordingIndicatorText: {
    color: COLORS.recording,
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  flipButtonSmall: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: SIZES.radiusFull,
  },
  flipButtonSmallText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  recordingProgressWrapper: {
    paddingHorizontal: 4,
  },
  recordingBottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: SIZES.paddingLg,
    paddingBottom: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  questionCounter: {
    color: COLORS.primaryLight,
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginBottom: 6,
  },
  questionText: {
    color: COLORS.white,
    fontSize: SIZES.xl,
    fontWeight: '600',
    lineHeight: 30,
    marginBottom: 20,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: SIZES.radiusFull,
    minWidth: 72,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  stopRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.recording,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: SIZES.radiusFull,
  },
  stopIcon: {
    width: 14,
    height: 14,
    backgroundColor: COLORS.white,
    borderRadius: 2,
    marginRight: 8,
  },
  stopRecordingText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },

  // ─── Phase 3: Answer Entry ───
  answersTopBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.paddingLg,
    paddingTop: SIZES.padding,
    paddingBottom: SIZES.paddingSm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  answersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  answersTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  videoSavedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  videoSavedText: {
    color: COLORS.success,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  answersContent: {
    flex: 1,
  },
  answersContentInner: {
    padding: SIZES.paddingLg,
    paddingBottom: 24,
  },
  answerQuestionCounter: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  answerQuestionText: {
    fontSize: SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 30,
    marginBottom: 20,
  },
  answerInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.padding,
    paddingVertical: 14,
    fontSize: SIZES.base,
    color: COLORS.text,
    minHeight: 120,
    lineHeight: 22,
  },
  answersBottomBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.paddingLg,
    paddingTop: SIZES.paddingSm,
    paddingBottom: SIZES.paddingLg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  answerNavButton: {
    backgroundColor: COLORS.primaryFaint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: SIZES.radiusFull,
    minWidth: 96,
    alignItems: 'center',
  },
  answerNavButtonDisabled: {
    opacity: 0.4,
  },
  answerNavButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  answerNavButtonTextDisabled: {
    color: COLORS.primaryLight,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: SIZES.radiusFull,
    shadowColor: COLORS.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  earlyFinishButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  earlyFinishText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
});
