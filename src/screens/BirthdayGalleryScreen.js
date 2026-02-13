import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Alert,
  Modal,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../utils/theme';
import {
  getChildren,
  getBirthdayMediaForChild,
  saveBirthdayMediaItems,
  deleteBirthdayMediaItem,
  moveToBirthdayMediaStorage,
} from '../utils/storage';

const MEDIA_GREEN = '#7DD3A8';
const MEDIA_GREEN_DARK = '#4CAF7D';
const MEDIA_GREEN_FAINT = '#E8F8F0';
const GRID_COLS = 3;
const GRID_GAP = 4;

function calculateAge(birthday) {
  const today = new Date();
  const birth = new Date(birthday);
  return Math.floor((today - birth) / (365.25 * 24 * 60 * 60 * 1000));
}

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export default function BirthdayGalleryScreen({ route, navigation }) {
  const { childId } = route.params;
  const [child, setChild] = useState(null);
  const [sections, setSections] = useState([]);
  const [viewerItem, setViewerItem] = useState(null);
  const { width: screenWidth } = useWindowDimensions();
  const thumbSize = Math.floor((screenWidth - SIZES.padding * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);

  const loadData = useCallback(async () => {
    const allChildren = await getChildren();
    const found = allChildren.find((c) => c.id === childId);
    setChild(found || null);

    const media = await getBirthdayMediaForChild(childId);
    // Group by year
    const grouped = {};
    for (const item of media) {
      if (!grouped[item.year]) grouped[item.year] = [];
      grouped[item.year].push(item);
    }
    // Convert to SectionList format, sorted newest first
    const secs = Object.keys(grouped)
      .sort((a, b) => Number(b) - Number(a))
      .map((year) => ({
        year: Number(year),
        age: grouped[year][0]?.age,
        data: [grouped[year]], // wrap in array so each section renders one grid
      }));
    setSections(secs);
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const pickAndSaveMedia = async (year) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const birth = child?.birthday ? new Date(child.birthday) : null;
    const age = birth ? year - birth.getFullYear() : null;

    const items = [];
    for (const asset of result.assets) {
      const ext = asset.type === 'video' ? 'mp4' : 'jpg';
      const filename = `${generateId()}.${ext}`;
      const uri = await moveToBirthdayMediaStorage(asset.uri, filename);
      items.push({
        id: generateId(),
        childId,
        year,
        age,
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

  const handleAddForYear = (year) => {
    pickAndSaveMedia(year);
  };

  const handleAddNew = () => {
    const currentYear = new Date().getFullYear();
    Alert.alert(
      'Add Birthday Media',
      `Add photos/videos for which year?`,
      [
        { text: String(currentYear), onPress: () => pickAndSaveMedia(currentYear) },
        { text: String(currentYear - 1), onPress: () => pickAndSaveMedia(currentYear - 1) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDelete = (item) => {
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

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleAddNew} style={styles.headerAddBtn}>
          <Text style={styles.headerAddText}>+</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, child]);

  const renderSectionHeader = ({ section }) => (
    <View style={styles.yearHeader}>
      <View>
        <Text style={styles.yearText}>{section.year}</Text>
        {section.age != null && (
          <Text style={styles.ageText}>Age {section.age}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.addPill}
        onPress={() => handleAddForYear(section.year)}
      >
        <Text style={styles.addPillText}>+ Add</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGrid = ({ item: mediaItems }) => (
    <View style={styles.grid}>
      {mediaItems.map((media) => (
        <TouchableOpacity
          key={media.id}
          style={[styles.thumbWrap, { width: thumbSize, height: thumbSize }]}
          onPress={() => setViewerItem(media)}
          onLongPress={() => handleDelete(media)}
          activeOpacity={0.8}
        >
          {media.type === 'photo' ? (
            <Image
              source={{ uri: media.uri }}
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
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={{ fontSize: 48 }}>📸</Text>
      <Text style={styles.emptyTitle}>No birthday media yet!</Text>
      <Text style={styles.emptyText}>
        Add photos and videos from their birthday celebrations.
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAddNew}>
        <Text style={styles.emptyButtonText}>Add Photos & Videos</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `grid-${index}`}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderGrid}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.listContent}
        stickySectionHeadersEnabled={false}
      />

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
            onPress={() => viewerItem && handleDelete(viewerItem)}
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
  listContent: {
    paddingBottom: SIZES.paddingXl,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Header add button
  headerAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MEDIA_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  headerAddText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },

  // Year header
  yearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.paddingLg,
    paddingBottom: SIZES.paddingSm,
  },
  yearText: {
    fontSize: SIZES.xl,
    fontWeight: '800',
    color: MEDIA_GREEN_DARK,
  },
  ageText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addPill: {
    backgroundColor: MEDIA_GREEN_FAINT,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: MEDIA_GREEN,
  },
  addPillText: {
    color: MEDIA_GREEN_DARK,
    fontSize: SIZES.sm,
    fontWeight: '700',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIZES.padding,
    gap: GRID_GAP,
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

  // Empty state
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
  emptyButton: {
    backgroundColor: MEDIA_GREEN,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: SIZES.radiusFull,
    marginTop: 20,
    shadowColor: MEDIA_GREEN_DARK,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '700',
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
