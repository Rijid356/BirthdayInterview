import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../utils/theme';
import {
  getBalloonRuns,
  getChildren,
  updateBalloonRun,
  deleteBalloonRun,
} from '../utils/storage';
import SpeedSelector from '../components/SpeedSelector';

export default function BalloonRunViewScreen({ route, navigation }) {
  const { balloonRunId } = route.params;
  const [run, setRun] = useState(null);
  const [child, setChild] = useState(null);
  const [videoExists, setVideoExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(0.5);
  const videoRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        try {
          const runs = await getBalloonRuns();
          const found = runs.find((r) => r.id === balloonRunId);
          if (!found) {
            setLoading(false);
            return;
          }
          setRun(found);
          setPlaybackRate(found.playbackRate || 0.5);

          const children = await getChildren();
          const matchedChild = children.find((c) => c.id === found.childId);
          setChild(matchedChild || null);

          if (found.videoUri) {
            const info = await FileSystem.getInfoAsync(found.videoUri);
            setVideoExists(info.exists);
          }
        } catch (e) {
          console.warn('Failed to load balloon run:', e);
        } finally {
          setLoading(false);
        }
      }
      load();
    }, [balloonRunId])
  );

  // Update playback rate on video when changed
  useEffect(() => {
    if (videoRef.current && run) {
      videoRef.current.setRateAsync(playbackRate, false);
    }
  }, [playbackRate, run]);

  async function handleRateChange(rate) {
    setPlaybackRate(rate);
    if (run) {
      await updateBalloonRun(run.id, { playbackRate: rate });
    }
  }

  async function handleSaveToCameraRoll() {
    if (!run?.videoUri) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(run.videoUri, { mimeType: 'video/mp4', dialogTitle: 'Save Video' });
    } catch (e) {
      console.warn('Save video error:', e);
      Alert.alert('Error', `Could not save the video.\n\n${e.message || 'Unknown error'}`);
    }
  }

  async function handleShare() {
    if (!run?.videoUri) return;
    try {
      await Sharing.shareAsync(run.videoUri);
    } catch (e) {
      console.warn('Share error:', e);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete Balloon Run',
      'Are you sure you want to delete this balloon run? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBalloonRun(run.id);
            navigation.goBack();
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!run) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 48 }}>🤷</Text>
        <Text style={styles.emptyText}>Balloon run not found.</Text>
      </View>
    );
  }

  const formattedDate = run.createdAt
    ? new Date(run.createdAt).toLocaleDateString('en-US', {
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
        {run.videoUri && videoExists ? (
          <Video
            ref={videoRef}
            source={{ uri: run.videoUri }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            style={styles.video}
            rate={playbackRate}
            shouldCorrectPitch={false}
            isLooping
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={{ fontSize: 40 }}>🎈</Text>
            <Text style={styles.placeholderText}>Video not available</Text>
          </View>
        )}
      </View>

      {/* Speed Selector */}
      <SpeedSelector
        selectedRate={playbackRate}
        onRateChange={handleRateChange}
      />

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSaveToCameraRoll}>
          <Text style={styles.actionButtonText}>Save Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Metadata Card */}
      <View style={styles.metaCard}>
        {child && (
          <Text style={styles.childName}>
            {child.emoji || '🧒'} {child.name}
          </Text>
        )}
        <View style={styles.metaDetails}>
          {run.year != null && (
            <Text style={styles.metaTag}>Year {run.year}</Text>
          )}
          {run.age != null && (
            <Text style={styles.metaTag}>Age {run.age}</Text>
          )}
          {formattedDate !== '' && (
            <Text style={styles.metaDate}>{formattedDate}</Text>
          )}
        </View>
      </View>

      {/* Delete */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Delete Balloon Run</Text>
      </TouchableOpacity>
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
    height: 300,
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

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SIZES.padding,
    marginBottom: SIZES.paddingLg,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: SIZES.radiusFull,
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
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
  childName: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
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
    color: COLORS.accentDark,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    overflow: 'hidden',
  },
  metaDate: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },

  // Delete
  deleteButton: {
    paddingVertical: 14,
    borderRadius: SIZES.radiusFull,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.error,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
});
