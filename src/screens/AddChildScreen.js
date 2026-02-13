import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES } from '../utils/theme';
import { saveChild, saveProfilePhoto } from '../utils/storage';

const EMOJI_OPTIONS = [
  '👧', '👦', '🧒', '👶', '🧒🏻', '👧🏼', '👦🏽', '🧒🏾', '👧🏿', '🦄',
  '🐻', '🌟', '🎀', '🦋', '🌈', '🎪', '🎨', '🎵', '🌸', '🍭',
];

function formatBirthday(text) {
  const digits = text.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
}

function parseBirthday(text) {
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, mm, dd, yyyy] = match;
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  const year = parseInt(yyyy, 10);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export default function AddChildScreen({ navigation }) {
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [emoji, setEmoji] = useState('🧒');
  const [photoUri, setPhotoUri] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const next = {};
    if (!name.trim()) {
      next.name = 'Name is required';
    }
    if (!birthday.trim()) {
      next.birthday = 'Birthday is required';
    } else if (!parseBirthday(birthday)) {
      next.birthday = 'Enter a valid date (MM/DD/YYYY)';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const date = parseBirthday(birthday);
      const child = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: name.trim(),
        birthday: date.toISOString(),
        emoji,
        createdAt: new Date().toISOString(),
      };
      await saveChild(child);
      if (photoUri) {
        await saveProfilePhoto(child.id, photoUri);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Could not save. Please try again.');
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <Text style={styles.label}>Child's Name</Text>
        <TextInput
          testID="input-name"
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="e.g. Nina"
          placeholderTextColor={COLORS.textLight}
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          autoCapitalize="words"
          returnKeyType="next"
        />
        {errors.name && <Text testID="error-name" style={styles.errorText}>{errors.name}</Text>}

        {/* Birthday */}
        <Text style={styles.label}>Birthday</Text>
        <TextInput
          testID="input-birthday"
          style={[styles.input, errors.birthday && styles.inputError]}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={COLORS.textLight}
          value={birthday}
          onChangeText={(t) => {
            setBirthday(formatBirthday(t));
            if (errors.birthday) setErrors((prev) => ({ ...prev, birthday: undefined }));
          }}
          keyboardType="number-pad"
          maxLength={10}
          returnKeyType="done"
        />
        {errors.birthday && <Text testID="error-birthday" style={styles.errorText}>{errors.birthday}</Text>}

        {/* Emoji Picker */}
        <Text style={styles.label}>Choose an Avatar</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_OPTIONS.map((e) => (
            <TouchableOpacity
              key={e}
              style={[styles.emojiCell, emoji === e && styles.emojiSelected]}
              onPress={() => setEmoji(e)}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Profile Photo (Optional) */}
        <Text style={styles.label}>Profile Photo (Optional)</Text>
        <TouchableOpacity
          style={styles.photoPickerButton}
          onPress={async () => {
            if (photoUri) {
              setPhotoUri(null);
            } else {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets?.[0]) {
                setPhotoUri(result.assets[0].uri);
              }
            }
          }}
        >
          {photoUri ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <Text style={styles.photoRemoveText}>Tap to remove</Text>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderIcon}>📷</Text>
              <Text style={styles.photoPlaceholderText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          testID="button-save"
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: SIZES.paddingLg,
    paddingBottom: 48,
  },
  label: {
    fontSize: SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 20,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    fontSize: SIZES.base,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.sm,
    marginTop: 4,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  emojiCell: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryFaint,
  },
  emojiText: {
    fontSize: 26,
  },
  photoPickerButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  photoPreviewContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 4,
  },
  photoRemoveText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  photoPlaceholderIcon: {
    fontSize: 22,
  },
  photoPlaceholderText: {
    fontSize: SIZES.sm - 2,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: SIZES.radiusFull,
    alignItems: 'center',
    marginTop: 32,
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
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
});
