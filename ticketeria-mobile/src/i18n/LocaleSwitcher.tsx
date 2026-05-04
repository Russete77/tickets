/**
 * Seletor de idioma — Mobile (Expo).
 * Auditoria CTO 2026-05 — gap 4.11
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useI18n, type Locale } from './index';

const LOCALES: Array<{ code: Locale; label: string; flag: string }> = [
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'es-AR', label: 'Español', flag: '🇦🇷' },
];

export const LocaleSwitcher: React.FC = () => {
  const locale = useI18n((s) => s.locale);
  const setLocale = useI18n((s) => s.setLocale);

  return (
    <View style={styles.container}>
      {LOCALES.map((l) => {
        const active = locale === l.code;
        return (
          <Pressable
            key={l.code}
            onPress={() => setLocale(l.code)}
            style={[styles.btn, active && styles.btnActive]}
            accessibilityRole="button"
            accessibilityLabel={l.label}
          >
            <Text style={[styles.text, active && styles.textActive]}>
              {l.flag} {l.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  btnActive: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  text: {
    fontSize: 14,
    color: '#333',
  },
  textActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
