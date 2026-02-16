import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../utils/theme';
import {
  getInterviewsForChild,
  deleteInterview,
  getBalloonRunsForChild,
  deleteBalloonRun,
  getBirthdayMediaForChild,
  deleteBirthdayMediaItem,
  saveBirthdayMediaItems,
  moveToBirthdayMediaStorage,
  getChildren,
} from '../utils/storage';

const MEDIA_GREEN = '#7DD3A8';
const MEDIA_GREEN_DARK = '#4CAF7D';
const MEDIA_GREEN_FAINT = '#E8F8F0';
const GRID_COLS = 3;
const GRID_GAP = 4;

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function formatInterviewDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function YearDetailScreen({ route, navigation }) {
  const { childId, childName, year, age } = route.params;
  const [interviews, setInterviews] = useState([]);
  const [balloonRuns, setBalloonRuns] = useState([]);
  const [media, setMedia] = useState([]);
  const [viewerItem, setViewerItem] = useState(null);
  const [child, setChild] = useState(null);
  const { width: screenWidth } = useWindowDimensions();
  const thumbSize = Math.floor((screenWidth - SIZES.padding * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);

  const currentYear = new Date().getFullYear();
  const isCurrentYear = year === currentYear;

  const loadData = useCallback(async () => {
    const allChildren = await getChildren();
    setChild(allChildren.find((c) => c.id === childId) || null);

    const allInterviews = await getInterviewsForChild(childId);
    setInterviews(allInterviews.filter((i) => i.year === year));

    const allRuns = await getBalloonRunsForChild(childId);
    setBalloonRuns(allRuns.filter((r) => r.year === year));

    const allMedia = await getBirthdayMediaForChild(childId);
    setMedia(allMedia.filter((m) => m.year === year));
  }, [childId, year]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDeleteInterview = (interview) => {
    Alert.alert(
      'Delete Interview',
      `Are you sure you want to delete this interview? This cannot be undone.`,
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

  const handleDeleteBalloonRun = (run) => {
    Alert.alert(
      'Delete Balloon Run',
      `Are you sure you want to delete this balloon run? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBalloonRun(run.id);
            loadData();
          },
        },
      ]
    );
  };

  const handleDeleteMedia = (item) => {
    Alert.alert(
      'Delete Media',
      'Are you sure you want to delete this? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBirthdayMediaItem(item.id);
            setViewerItem(null);
            loadData();
          },
        },
      ]
    );
  };

  const pickAndSaveMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const birth = child?.birthday ? new Date(child.birthday) : null;
    const mediaAge = birth ? year - birth.getFullYear() : age;

    const items = [];
    for (const asset of result.assets) {
      const ext = asset.type === 'video' ? 'mp4' : 'jpg';
      const filename = `${generateId()}.${ext}`;
      const uri = await moveToBirthdayMediaStorage(asset.uri, filename);
      items.push({
        id: generateId(),
        childId,
        year,
        age: mediaAge,
        type: asset.type === 'video' ? 'video' : 'photo',
        uri,
        width: asset.width || 0,
        height: asset.height || 0,
        createdAt: new Date().toISOString(),
      });
    }
    await saveBirthdayMediaItems(items);
    loadData();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Year Header */}
        <View style={styles.yearHeader}>
          <Text style={styles.yearTitle}>{year}</Text>
          {age != null && (
            <Text style={styles.ageSubtitle}>Age {age}</Text>
          )}
        </View>

        {/* ── Interview Section ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>🎥</Text>
            <Text style={[styles.sectionTitle, { color: COLORS.primaryDark }]}>Interviews</Text>
          </View>
        </View>

        {interviews.length > 0 ? (
          interviews.map((interview) => (
            <TouchableOpacity
              key={interview.id}
              style={[styles.card, { borderLeftColor: COLORS.primary }]}
              onPress={() =>
                navigation.navigate('InterviewReview', { interviewId: interview.id })
              }
              onLongPress={() => handleDeleteInterview(interview)}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardDate}>{formatInterviewDate(interview.date)}</Text>
                <Text style={styles.cardSub}>
                  {interview.transcription?.status === 'processing'
                    ? 'Transcribing...'
                    : interview.transcription?.status === 'failed'
                      ? 'Transcription failed'
                      : (() => {
                          const count = Object.values(interview.answers || {}).filter((a) => a?.text).length;
                          return count > 0 ? `${count} answers` : 'No answers yet';
                        })()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteInterview(interview)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteIcon}>🗑</Text>
              </TouchableOpacity>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))
        ) : isCurrentYear ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
            onPress={() =>
              navigation.navigate('Interview', { childId, childName })
            }
          >
            <Text style={styles.actionButtonText}>Record Interview</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.noneText}>No interview recorded</Text>
        )}

        {/* ── Balloon Run Section ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>🎈</Text>
            <Text style={[styles.sectionTitle, { color: COLORS.accentDark }]}>Balloon Runs</Text>
          </View>
        </View>

        {balloonRuns.length > 0 ? (
          balloonRuns.map((run) => (
            <TouchableOpacity
              key={run.id}
              style={[styles.card, { borderLeftColor: COLORS.accent }]}
              onPress={() =>
                navigation.navigate('BalloonRunView', { balloonRunId: run.id })
              }
              onLongPress={() => handleDeleteBalloonRun(run)}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardDate}>{formatInterviewDate(run.createdAt)}</Text>
                <Text style={styles.cardSub}>{run.playbackRate}x slow-mo</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteBalloonRun(run)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteIcon}>🗑</Text>
              </TouchableOpacity>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))
        ) : isCurrentYear ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.accent }]}
            onPress={() =>
              navigation.navigate('BalloonRunCapture', { childId, childName })
            }
          >
            <Text style={styles.actionButtonText}>Capture Balloon Run</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.noneText}>No balloon run captured</Text>
        )}

        {/* ── Birthday Media Section ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>📸</Text>
            <Text style={[styles.sectionTitle, { color: MEDIA_GREEN_DARK }]}>Birthday Media</Text>
          </View>
          {media.length > 0 && (
            <Text style={styles.sectionCount}>{media.length} item{media.length !== 1 ? 's' : ''}</Text>
          )}
        </View>

        {media.length > 0 && (
          <View style={styles.grid}>
            {media.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.thumbWrap, { width: thumbSize, height: thumbSize }]}
                onPress={() => setViewerItem(item)}
                onLongPress={() => handleDeleteMedia(item)}
                activeOpacity={0.8}
              >
                {item.type === 'photo' ? (
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.thumbImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.videoThumb}>
                    <Text style={styles.videoIcon}>▶</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: MEDIA_GREEN }]}
          onPress={pickAndSaveMedia}
        >
          <Text style={styles.actionButtonText}>+ Add Photos & Videos</Text>
        </TouchableOpacity>

        {media.length > 0 && (
          <TouchableOpacity
            style={styles.seeAllLink}
            onPress={() => navigation.navigate('BirthdayGallery', { childId })}
          >
            <Text style={styles.seeAllText}>See All Media ›</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Full-screen viewer modal */}
      <Modal
        visible={!!viewerItem}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerItem(null)}
      >
        <View style={styles.modalBg}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setViewerItem(null)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalDeleteBtn}
            onPress={() => viewerItem && handleDeleteMedia(viewerItem)}
          >
            <Text style={styles.modalDeleteText}>🗑</Text>
          </TouchableOpacity>
          {viewerItem?.type === 'photo' ? (
            <Image
              source={{ uri: viewerItem.uri }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          ) : viewerItem?.type === 'video' ? (
            <Video
              source={{ uri: viewerItem.uri }}
              style={styles.modalVideo}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          ) : null}
        </View>
      </Modal>
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

  // Year Header
  yearHeader: {
    alignItems: 'center',
    paddingVertical: SIZES.paddingLg,
    backgroundColor: COLORS.primaryFaint,
    borderBottomLeftRadius: SIZES.radiusXl,
    borderBottomRightRadius: SIZES.radiusXl,
  },
  yearTitle: {
    fontSize: SIZES.xxxl,
    fontWeight: '800',
    color: COLORS.primary,
  },
  ageSubtitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.paddingLg,
    paddingBottom: SIZES.paddingSm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },

  // Cards
  card: {
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
    borderLeftWidth: 3,
  },
  cardContent: {
    flex: 1,
  },
  cardDate: {
    fontSize: SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardSub: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteIcon: {
    fontSize: 14,
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textLight,
    marginLeft: 8,
  },

  // Action Buttons
  actionButton: {
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.paddingSm,
    paddingVertical: 14,
    borderRadius: SIZES.radiusFull,
    alignItems: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '700',
  },

  // None text
  noneText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingVertical: 12,
    fontStyle: 'italic',
  },

  // Media Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIZES.padding,
    gap: GRID_GAP,
    marginBottom: SIZES.padding,
  },
  thumbWrap: {
    borderRadius: SIZES.radiusSm,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceAlt,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  videoThumb: {
    flex: 1,
    backgroundColor: MEDIA_GREEN_FAINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIcon: {
    fontSize: 28,
    color: MEDIA_GREEN_DARK,
  },

  // See All link
  seeAllLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  seeAllText: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: MEDIA_GREEN_DARK,
  },

  // Modal viewer
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalCloseText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },
  modalDeleteBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalDeleteText: {
    fontSize: 20,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  modalVideo: {
    width: '100%',
    height: '80%',
  },
});
