import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
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
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const recordingStartTime = useRef(0);
  const questionTimestamps = useRef([]);

  // State
  const [phase, setPhase] = useState('intro'); // 'intro' | 'recording'
  const [facing, setFacing] = useState('front');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex];

  // ─── Navigation helpers ───

  function goNext() {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      questionTimestamps.current.push({
        questionId: questions[currentQuestionIndex + 1].id,
        timestampMs: Date.now() - recordingStartTime.current,
      });
    }
  }

  function goPrev() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      questionTimestamps.current.push({
        questionId: questions[currentQuestionIndex - 1].id,
        timestampMs: Date.now() - recordingStartTime.current,
      });
    }
  }

  // ─── Phase transitions ───

  async function saveAndNavigate(tempVideoUri) {
    setSaving(true);
    try {
      const filename = `interview_${childId}_${Date.now()}.mp4`;
      const storedUri = await moveVideoToStorage(tempVideoUri, filename);

      const children = await getChildren();
      const child = children.find((c) => c.id === childId);
      const age = child ? calculateAge(child.birthday) : null;

      const interview = {
        id: generateId(),
        childId,
        year: new Date().getFullYear(),
        age,
        date: new Date().toISOString(),
        questions: questions.map((q) => q.id),
        answers: {},
        videoUri: storedUri,
        createdAt: new Date().toISOString(),
        questionTimestamps: questionTimestamps.current,
      };

      await saveInterview(interview);
      navigation.replace('InterviewReview', { interviewId: interview.id });
    } catch (e) {
      console.warn('Save error:', e);
      Alert.alert('Save Error', 'Could not save the interview. Please try again.');
      setSaving(false);
    }
  }

  async function startRecording() {
    if (!cameraRef.current) return;
    setPhase('recording');
    setIsRecording(true);
    setCurrentQuestionIndex(0);
    recordingStartTime.current = Date.now();
    questionTimestamps.current = [{ questionId: questions[0].id, timestampMs: 0 }];

    try {
      const result = await cameraRef.current.recordAsync();
      // recordAsync resolves when stopRecording() is called
      if (result?.uri) {
        await saveAndNavigate(result.uri);
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
    setSaving(true);
  }

  // ─── Permission handling ───

  if (!permission || !micPermission) {
    // Permissions still loading
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.permissionText}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted || !micPermission.granted) {
    const needsCamera = !permission.granted;
    const needsMic = !micPermission.granted;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🎥</Text>
          <Text style={styles.permissionTitle}>Permissions Needed</Text>
          <Text style={styles.permissionText}>
            We need camera and microphone access to record your birthday interview video.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={async () => {
              if (needsCamera) await requestPermission();
              if (needsMic) await requestMicPermission();
            }}
          >
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

  // ─── Phase 1 & 2: Intro + Recording (single persistent camera) ───

  if (phase === 'intro' || phase === 'recording') {
    return (
      <View style={styles.recordingContainer}>
        {/* Single persistent camera - never unmounts between intro and recording */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          mode="video"
          facing={facing}
        />

        {phase === 'intro' && (
          <>
            {/* Flip button */}
            <TouchableOpacity
              style={[styles.flipButton, { position: 'absolute', top: 50, right: 16, zIndex: 10 }]}
              onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}
            >
              <Ionicons name="camera-reverse-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>

            {/* Info section overlaid at bottom */}
            <View style={styles.introOverlay}>
              <Text style={styles.introTitle}>
                {childName}'s Berfdayy Interview
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
                <Text style={[styles.secondaryButtonText, { color: 'rgba(255,255,255,0.7)' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {phase === 'recording' && !saving && (
          <>
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
                  <Ionicons name="camera-reverse-outline" size={18} color={COLORS.white} />
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
          </>
        )}

        {/* Saving overlay */}
        {saving && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator size="large" color={COLORS.white} />
            <Text style={styles.savingText}>Saving interview...</Text>
          </View>
        )}
      </View>
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
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: SIZES.radiusFull,
  },
  introOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.paddingLg,
    paddingBottom: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  introTitle: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  introInstructions: {
    fontSize: SIZES.base,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  introDetail: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.6)',
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
    padding: 8,
    borderRadius: SIZES.radiusFull,
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

  // ─── Saving Overlay ───
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  savingText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '600',
    marginTop: 16,
  },
});
