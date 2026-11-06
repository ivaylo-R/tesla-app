import { router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/features/auth/auth-context';

export default function AuthCallbackScreen() {
  const { user, processingAuthLink, authLinkError } = useAuth();

  useEffect(() => { if (user) router.replace('/' as Href); }, [user]);
  if (user) return null;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <View style={s.content}>
        <View style={s.brandMark}><Text style={s.brandLetter}>T</Text></View>
        {authLinkError ? (
          <>
            <Text style={s.title}>Линкът не беше потвърден</Text>
            <Text style={s.message}>{authLinkError}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/' as Href)} style={s.button}>
              <Text style={s.buttonText}>Към вход</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color="#E82127" style={s.spinner} />
            <Text style={s.title}>{processingAuthLink ? 'Потвърждаваме имейла' : 'Отваряме профила'}</Text>
            <Text style={s.message}>Изчакай малко, докато потвърдим достъпа.</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090A0C' }, content: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center' },
  brandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#E82127', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }, brandLetter: { color: '#fff', fontWeight: '900', fontSize: 17, fontStyle: 'italic' },
  spinner: { marginBottom: 18 }, title: { color: '#F5F5F6', fontSize: 20, fontWeight: '700', textAlign: 'center' }, message: { color: '#858A91', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 }, button: { marginTop: 23, borderRadius: 13, backgroundColor: '#E82127', paddingHorizontal: 24, paddingVertical: 13 }, buttonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
