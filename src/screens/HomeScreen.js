import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../utils/theme';
import { getChildren } from '../utils/storage';

export default function HomeScreen({ navigation }) {
  const [children, setChildren] = useState([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.navigate('AddChild')}>
            <Text style={{ fontSize: 24, color: COLORS.primary }}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={{ fontSize: 20 }}>&#9881;</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      getChildren().then(setChildren);
    }, [])
  );

  return (
    <View style={styles.container}>
      {children.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 64 }}>🎈</Text>
          <Text style={styles.emptyTitle}>No children added yet</Text>
          <Text style={styles.emptyText}>
            Add your child's profile to start recording birthday interviews!
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('AddChild')}
          >
            <Text style={styles.buttonText}>+ Add Your First Child</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={children}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SIZES.padding }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ChildProfile', { childId: item.id })}
            >
              <Text style={{ fontSize: 32 }}>{item.emoji || '🧒'}</Text>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
              </View>
              <Text style={{ fontSize: 20, color: COLORS.textLight }}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginVertical: 12, lineHeight: 24 },
  button: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  name: { fontSize: 18, fontWeight: '600', color: COLORS.text },
});
