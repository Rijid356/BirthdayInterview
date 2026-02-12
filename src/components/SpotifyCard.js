import React from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../utils/theme';

export default function SpotifyCard({ spotify, isPlaying, onPlay, onStop }) {
  if (!spotify) return null;

  function handleOpenSpotify() {
    if (spotify.spotifyUri) {
      Linking.openURL(spotify.spotifyUri).catch(() => {
        // Fallback to web URL
        Linking.openURL(`https://open.spotify.com/track/${spotify.trackId}`);
      });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🎵</Text>
        <Text style={styles.headerText}>Spotify Match</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.trackRow}>
          {spotify.albumArt && (
            <Image source={{ uri: spotify.albumArt }} style={styles.albumArt} />
          )}
          <View style={styles.trackInfo}>
            <Text style={styles.trackName} numberOfLines={2}>{spotify.trackName}</Text>
            <Text style={styles.artistName} numberOfLines={1}>{spotify.artistName}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          {spotify.previewUrl && (
            <TouchableOpacity
              style={[styles.previewButton, isPlaying && styles.previewButtonPlaying]}
              onPress={isPlaying ? onStop : onPlay}
            >
              <Text style={styles.previewButtonText}>
                {isPlaying ? '⏹ Stop' : '▶ Preview'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.openButton} onPress={handleOpenSpotify}>
            <Text style={styles.openButtonText}>Open in Spotify</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SIZES.padding,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  headerText: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.spotifyGreen,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.spotifyGreen + '30',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  albumArt: {
    width: 80,
    height: 80,
    borderRadius: SIZES.radiusSm,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  artistName: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  previewButton: {
    flex: 1,
    backgroundColor: COLORS.spotifyGreen,
    paddingVertical: 10,
    borderRadius: SIZES.radiusFull,
    alignItems: 'center',
  },
  previewButtonPlaying: {
    backgroundColor: COLORS.textSecondary,
  },
  previewButtonText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  openButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.spotifyGreen,
    paddingVertical: 10,
    borderRadius: SIZES.radiusFull,
    alignItems: 'center',
  },
  openButtonText: {
    color: COLORS.spotifyGreen,
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
});
