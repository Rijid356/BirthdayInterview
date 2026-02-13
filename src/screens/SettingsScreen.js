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
import { FileSystem, Sharing } from '../utils/native-modules';
import { COLORS, SIZES } from '../utils/theme';
import * as DocumentPicker from 'expo-document-picker';
import {
  getChildren,
  getInterviews,
  getBalloonRuns,
  getBirthdayMedia,
  exportAllData,
  importData,
  exportFullBackup,
  importFullBackup,
  getBackupSizeEstimate,
  getApiKeys,
  saveApiKeys,
} from '../utils/storage';

export default function SettingsScreen() {
  const [childCount, setChildCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [balloonRunCount, setBalloonRunCount] = useState(0);
  const [birthdayMediaCount, setBirthdayMediaCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [backupProgress, setBackupProgress] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [backupSize, setBackupSize] = useState(null);
  const [apiKeys, setApiKeys] = useState({ openaiKey: '', spotifyClientId: '', spotifyClientSecret: '' });
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showSpotifySecret, setShowSpotifySecret] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadCounts() {
        const children = await getChildren();
        const interviews = await getInterviews();
        const balloonRuns = await getBalloonRuns();
        const media = await getBirthdayMedia();
        setChildCount(children.length);
        setInterviewCount(interviews.length);
        setBalloonRunCount(balloonRuns.length);
        setBirthdayMediaCount(media.length);
        const size = await getBackupSizeEstimate();
        setBackupSize(size);
      }
      async function loadKeys() {
        const keys = await getApiKeys();
        setApiKeys(keys);
      }
      loadCounts();
      loadKeys();
    }, [])
  );

  async function handleExport() {
    if (!FileSystem || !Sharing) {
      Alert.alert('Not Available', 'Export is not available on web.');
      return;
    }
    setExporting(true);
    try {
      const data = await exportAllData();
      const fileUri =
        FileSystem.documentDirectory + 'git-bigger-backup.json';
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

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  async function handleFullBackup() {
    if (!FileSystem || !Sharing) {
      Alert.alert('Not Available', 'Full backup is not available on web.');
      return;
    }
    setBackupProgress({ current: 0, total: 0, filename: 'Preparing...' });
    try {
      const zipUri = await exportFullBackup((current, total, filename) => {
        setBackupProgress({ current, total, filename });
      });
      setBackupProgress(null);
      await Sharing.shareAsync(zipUri, {
        mimeType: 'application/zip',
        dialogTitle: 'Export Full Backup',
      });
    } catch (e) {
      Alert.alert('Backup Failed', e.message || 'Something went wrong.');
    } finally {
      setBackupProgress(null);
    }
  }

  async function handleImportFromFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'application/zip', 'application/octet-stream'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets?.[0];
      if (!file) return;

      setImporting(true);
      const uri = file.uri;
      const name = file.name || '';

      if (name.endsWith('.zip')) {
        setImportProgress({ current: 0, total: 0, filename: 'Reading backup...' });
        const summary = await importFullBackup(uri, (current, total, filename) => {
          setImportProgress({ current, total, filename });
        });
        setImportProgress(null);

        const children = await getChildren();
        const interviews = await getInterviews();
        const balloonRuns = await getBalloonRuns();
        setChildCount(children.length);
        setInterviewCount(interviews.length);
        setBalloonRunCount(balloonRuns.length);
        const size = await getBackupSizeEstimate();
        setBackupSize(size);

        Alert.alert(
          'Import Successful',
          `Restored ${summary.children} children, ${summary.interviews} interviews, ${summary.balloonRuns} balloon runs, and ${summary.mediaFiles} media files.`
        );
      } else {
        if (!FileSystem) {
          Alert.alert('Not Available', 'File import is not available on web.');
          return;
        }
        const content = await FileSystem.readAsStringAsync(uri);
        const data = JSON.parse(content);

        if (!data.children && !data.interviews && !data.balloonRuns) {
          Alert.alert('Invalid Data', 'The file does not contain valid backup data.');
          return;
        }

        await importData(data);

        const children = await getChildren();
        const interviews = await getInterviews();
        const balloonRuns = await getBalloonRuns();
        setChildCount(children.length);
        setInterviewCount(interviews.length);
        setBalloonRunCount(balloonRuns.length);

        Alert.alert(
          'Import Successful',
          `Imported ${children.length} children, ${interviews.length} interviews, and ${balloonRuns.length} balloon runs.`
        );
      }
    } catch (e) {
      setImportProgress(null);
      Alert.alert('Import Failed', e.message || 'Could not import backup file.');
    } finally {
      setImporting(false);
      setImportProgress(null);
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
      if (!data.children && !data.interviews && !data.balloonRuns) {
        Alert.alert(
          'Invalid Data',
          'The JSON does not contain children, interviews, or balloon run data.'
        );
        return;
      }
      await importData(data);
      const children = await getChildren();
      const interviews = await getInterviews();
      const balloonRuns = await getBalloonRuns();
      setChildCount(children.length);
      setInterviewCount(interviews.length);
      setBalloonRunCount(balloonRuns.length);
      setImportText('');
      setShowImport(false);
      Alert.alert(
        'Import Successful',
        `Imported ${children.length} children, ${interviews.length} interviews, and ${balloonRuns.length} balloon runs.`
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
        <View style={styles.divider} />
        <View style={styles.statRow}>
          <Text style={styles.statEmoji}>🎈</Text>
          <Text style={styles.statLabel}>Balloon Runs</Text>
          <Text style={styles.statValue}>{balloonRunCount}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statRow}>
          <Text style={styles.statEmoji}>📸</Text>
          <Text style={styles.statLabel}>Birthday Media</Text>
          <Text style={styles.statValue}>{birthdayMediaCount}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statRow}>
          <Text style={styles.statEmoji}>💾</Text>
          <Text style={styles.statLabel}>Media Size</Text>
          <Text style={styles.statValue}>{formatBytes(backupSize || 0)}</Text>
        </View>
      </View>

      {/* ─── Export ─── */}
      <Text style={styles.sectionHeader}>Export</Text>
      <View style={styles.card}>
        <Text style={styles.cardDescription}>
          Export your data as JSON (metadata only) or as a full backup including all videos and photos.
        </Text>
        {backupSize > 500 * 1024 * 1024 && (
          <Text style={styles.warningText}>
            Your media files total {formatBytes(backupSize)}. Full backup may take a while and use significant memory. Consider data-only export for large collections.
          </Text>
        )}
        {backupProgress && (
          <View style={styles.progressContainer}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.progressText}>
              Processing file {backupProgress.current} of {backupProgress.total}: {backupProgress.filename}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.exportButton, exporting && styles.buttonDisabled]}
          onPress={handleExport}
          disabled={exporting || !!backupProgress}
        >
          {exporting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.exportButtonText}>Export Data Only (JSON)</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fullBackupButton, !!backupProgress && styles.buttonDisabled]}
          onPress={handleFullBackup}
          disabled={exporting || !!backupProgress}
        >
          {backupProgress ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.exportButtonText}>Full Backup (with Videos)</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Import ─── */}
      <Text style={styles.sectionHeader}>Import</Text>
      <View style={styles.card}>
        <Text style={styles.cardDescription}>
          Restore data from a backup file (.zip for full backup or .json for data only). You can also paste JSON directly.
        </Text>

        {importProgress && (
          <View style={styles.progressContainer}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.progressText}>
              Restoring file {importProgress.current} of {importProgress.total}: {importProgress.filename}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.importFileButton, importing && styles.buttonDisabled]}
          onPress={handleImportFromFile}
          disabled={importing}
        >
          {importing && !showImport ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.importFileButtonText}>Import from File</Text>
          )}
        </TouchableOpacity>

        {!showImport ? (
          <TouchableOpacity
            style={styles.importToggle}
            onPress={() => setShowImport(true)}
          >
            <Text style={styles.importToggleText}>Or Paste JSON</Text>
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

      {/* ─── API Keys ─── */}
      <Text style={styles.sectionHeader}>API Keys</Text>
      <View style={styles.card}>
        <Text style={styles.cardDescription}>
          Required for auto-transcription and Spotify integration. Stored on device only — never included in exports.
        </Text>

        <Text style={styles.fieldLabel}>OpenAI API Key</Text>
        <View style={styles.keyInputRow}>
          <TextInput
            style={[styles.keyInput, { flex: 1 }]}
            value={apiKeys.openaiKey}
            onChangeText={(val) => setApiKeys({ ...apiKeys, openaiKey: val })}
            placeholder="sk-..."
            placeholderTextColor={COLORS.textLight}
            secureTextEntry={!showOpenaiKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.visibilityToggle}
            onPress={() => setShowOpenaiKey(!showOpenaiKey)}
          >
            <Text style={styles.visibilityToggleText}>{showOpenaiKey ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>Spotify Client ID</Text>
        <TextInput
          style={styles.keyInput}
          value={apiKeys.spotifyClientId}
          onChangeText={(val) => setApiKeys({ ...apiKeys, spotifyClientId: val })}
          placeholder="Client ID"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.fieldLabel}>Spotify Client Secret</Text>
        <View style={styles.keyInputRow}>
          <TextInput
            style={[styles.keyInput, { flex: 1 }]}
            value={apiKeys.spotifyClientSecret}
            onChangeText={(val) => setApiKeys({ ...apiKeys, spotifyClientSecret: val })}
            placeholder="Client Secret"
            placeholderTextColor={COLORS.textLight}
            secureTextEntry={!showSpotifySecret}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.visibilityToggle}
            onPress={() => setShowSpotifySecret(!showSpotifySecret)}
          >
            <Text style={styles.visibilityToggleText}>{showSpotifySecret ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.exportButton, savingKeys && styles.buttonDisabled]}
          onPress={async () => {
            setSavingKeys(true);
            try {
              await saveApiKeys(apiKeys);
              Alert.alert('Saved', 'API keys saved successfully.');
            } catch (e) {
              Alert.alert('Error', 'Could not save API keys.');
            } finally {
              setSavingKeys(false);
            }
          }}
          disabled={savingKeys}
        >
          {savingKeys ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.exportButtonText}>Save API Keys</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── App Info ─── */}
      <Text style={styles.sectionHeader}>About</Text>
      <View style={styles.card}>
        <Text style={styles.appName}>git-bigger</Text>
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
  fullBackupButton: {
    backgroundColor: COLORS.accent,
    borderRadius: SIZES.radius,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  exportButtonText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radius,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  progressText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  warningText: {
    fontSize: SIZES.sm,
    color: COLORS.accentDark,
    backgroundColor: '#FFF3E0',
    borderRadius: SIZES.radiusSm,
    padding: 10,
    marginBottom: 12,
    lineHeight: 18,
  },

  // ─── Import ───
  importFileButton: {
    backgroundColor: COLORS.accent,
    borderRadius: SIZES.radius,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  importFileButtonText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '700',
  },
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

  // ─── API Keys ───
  fieldLabel: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 6,
  },
  keyInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: 10,
    fontSize: SIZES.md,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceAlt,
    marginBottom: 4,
  },
  keyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  visibilityToggle: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  visibilityToggleText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
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
