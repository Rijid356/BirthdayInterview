import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { COLORS, SIZES } from '../utils/theme';
import {
  getChildren,
  getInterviews,
  exportAllData,
  importData,
} from '../utils/storage';

export default function SettingsScreen() {
  const [childCount, setChildCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadCounts() {
        const children = await getChildren();
        const interviews = await getInterviews();
        setChildCount(children.length);
        setInterviewCount(interviews.length);
      }
      loadCounts();
    }, [])
  );

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportAllData();
      const fileUri =
        FileSystem.documentDirectory + 'birthday-interview-backup.json';
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Interview Data',
      });
    } catch (e) {
      Alert.alert('Export Failed', e.message || 'Something went wrong.');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    const trimmed = importText.trim();
    if (!trimmed) {
      Alert.alert('Empty Input', 'Please paste your JSON backup data first.');
      return;
    }

    setImporting(true);
    try {
      const data = JSON.parse(trimmed);
      if (!data.children && !data.interviews) {
        Alert.alert(
          'Invalid Data',
          'The JSON does not contain children or interviews data.'
        );
        return;
      }
      await importData(data);
      const children = await getChildren();
      const interviews = await getInterviews();
      setChildCount(children.length);
      setInterviewCount(interviews.length);
      setImportText('');
      setShowImport(false);
      Alert.alert(
        'Import Successful',
        `Imported ${children.length} children and ${interviews.length} interviews.`
      );
    } catch (e) {
      Alert.alert(
        'Import Failed',
        'Could not parse JSON. Make sure you pasted valid backup data.'
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* ─── Data Overview ─── */}
      <Text style={styles.sectionHeader}>Your Data</Text>
      <View style={styles.card}>
        <View style={styles.statRow}>
          <Text style={styles.statEmoji}>👶</Text>
          <Text style={styles.statLabel}>Children</Text>
          <Text style={styles.statValue}>{childCount}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statRow}>
          <Text style={styles.statEmoji}>🎂</Text>
          <Text style={styles.statLabel}>Interviews</Text>
          <Text style={styles.statValue}>{interviewCount}</Text>
        </View>
      </View>

      {/* ─── Export ─── */}
      <Text style={styles.sectionHeader}>Export</Text>
      <View style={styles.card}>
        <Text style={styles.cardDescription}>
          Export all children and interview data as a JSON file. Video files are
          not included in the backup.
        </Text>
        <TouchableOpacity
          style={[styles.exportButton, exporting && styles.buttonDisabled]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.exportButtonText}>Export Data</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Import ─── */}
      <Text style={styles.sectionHeader}>Import</Text>
      <View style={styles.card}>
        <Text style={styles.cardDescription}>
          Restore data from a previous backup by pasting the JSON content below.
          This will merge with any existing data.
        </Text>

        {!showImport ? (
          <TouchableOpacity
            style={styles.importToggle}
            onPress={() => setShowImport(true)}
          >
            <Text style={styles.importToggleText}>Paste Backup Data</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.importArea}>
            <TextInput
              style={styles.textInput}
              multiline
              placeholder='Paste JSON backup here...'
              placeholderTextColor={COLORS.textLight}
              value={importText}
              onChangeText={setImportText}
              textAlignVertical="top"
            />
            <View style={styles.importActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowImport(false);
                  setImportText('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.importButton,
                  importing && styles.buttonDisabled,
                ]}
                onPress={handleImport}
                disabled={importing}
              >
                {importing ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.importButtonText}>Import</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ─── App Info ─── */}
      <Text style={styles.sectionHeader}>About</Text>
      <View style={styles.card}>
        <Text style={styles.appName}>Birthday Interview</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appDescription}>
          Record annual birthday interviews with your children. Ask the same
          questions each year and watch how their answers grow and change over
          time.
        </Text>
      </View>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.padding,
    paddingBottom: SIZES.paddingXl,
  },
  sectionHeader: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SIZES.paddingLg,
    marginBottom: SIZES.paddingSm,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.padding,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDescription: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SIZES.padding,
  },

  // ─── Stats ───
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  statLabel: {
    flex: 1,
    fontSize: SIZES.base,
    color: COLORS.text,
    fontWeight: '500',
  },
  statValue: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  // ─── Export ───
  exportButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  exportButtonText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '700',
  },

  // ─── Import ───
  importToggle: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: SIZES.radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  importToggleText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  importArea: {
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    fontSize: SIZES.md,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceAlt,
    minHeight: 120,
    maxHeight: 200,
  },
  importActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SIZES.paddingSm,
    gap: 8,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  importButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  importButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // ─── App Info ───
  appName: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  appVersion: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SIZES.paddingSm,
  },
  appDescription: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  footer: {
    height: SIZES.paddingXl,
  },
});
