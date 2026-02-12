import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../utils/theme';

export default function EditableAnswer({ answer, enrichment, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function startEdit() {
    setDraft(answer?.text || '');
    setEditing(true);
  }

  function handleSave() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== (answer?.text || '')) {
      onSave(trimmed);
    }
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
  }

  if (editing) {
    return (
      <View style={styles.editContainer}>
        <TextInput
          style={styles.textInput}
          value={draft}
          onChangeText={setDraft}
          multiline
          autoFocus
          placeholder="Type answer..."
          placeholderTextColor={COLORS.textLight}
        />
        <View style={styles.editActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!answer?.text) {
    return (
      <TouchableOpacity onPress={startEdit} style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Tap to add answer</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={startEdit} style={styles.displayContainer}>
      <View style={styles.answerRow}>
        <Text style={styles.answerText}>{answer.text}</Text>
        {enrichment?.emojis && (
          <Text style={styles.enrichmentEmojis}>{enrichment.emojis.join(' ')}</Text>
        )}
      </View>
      {enrichment?.colorTag && (
        <View style={[styles.colorDot, { backgroundColor: enrichment.colorTag }]} />
      )}
      <View style={styles.badgeRow}>
        <View style={[styles.sourceBadge, answer.source === 'edited' ? styles.editedBadge : styles.autoBadge]}>
          <Text style={[styles.badgeText, answer.source === 'edited' ? styles.editedBadgeText : styles.autoBadgeText]}>
            {answer.source === 'edited' ? 'edited' : 'auto'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  displayContainer: {
    marginTop: 4,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  answerText: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  enrichmentEmojis: {
    fontSize: SIZES.base,
    marginLeft: 6,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
  },
  autoBadge: {
    backgroundColor: '#F1F5F9',
  },
  editedBadge: {
    backgroundColor: '#EFF6FF',
  },
  badgeText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  autoBadgeText: {
    color: COLORS.autoTag,
  },
  editedBadgeText: {
    color: COLORS.editedTag,
  },
  emptyContainer: {
    marginTop: 4,
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  editContainer: {
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.editedTag,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.paddingSm,
    fontSize: SIZES.base,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceAlt,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.editedTag,
  },
  saveText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
});
