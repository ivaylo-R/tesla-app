import { router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/features/auth/auth-context';

export default function AuthCallbackScreen() {
  const { user, recoveryRequired, authLinkFlow, authLinkStatus, authLinkError } = useAuth();

  useEffect(() => {
    if (authLinkStatus !== 'success') return;
    if (authLinkFlow === 'recovery' && recoveryRequired) {
      router.replace('/auth/reset-password' as Href);
      return;
    }
    if (user) {
      const timer = setTimeout(() => router.replace('/' as Href), 1400);
      return () => clearTimeout(timer);
    }
  }, [authLinkFlow, authLinkStatus, recoveryRequired, user]);

  const isError = authLinkStatus === 'error';
  const isSuccess = authLinkStatus === 'success' && authLinkFlow !== 'recovery';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <View style={s.content}>
        <View style={s.brandMark}><Text style={s.brandLetter}>T</Text></View>
        {isError ? (
          <>
            <Text style={s.title}>Линкът не беше потвърден</Text>
            <Text style={s.message}>{authLinkError ?? 'Линкът е невалиден или е изтекъл. Поискай нов имейл и опитай отново.'}</Text>
            {authLinkFlow === 'recovery' ? (
              <Pressable accessibilityRole="button" onPress={() => router.replace('/auth/forgot-password' as Href)} style={s.button}>
                <Text style={s.buttonText}>Поискай нов линк</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={() => router.replace('/' as Href)} style={[s.button, authLinkFlow === 'recovery' && s.secondaryButton]}>
              <Text style={s.buttonText}>Към вход</Text>
            </Pressable>
          </>
        ) : isSuccess ? (
          <>
            <Text style={s.successMark}>✓</Text>
            <Text style={s.title}>Имейлът е потвърден</Text>
            <Text style={s.message}>{user ? 'Достъпът до профила е готов.' : 'Можеш да се върнеш към входа.'}</Text>
            {!user ? (
              <Pressable accessibilityRole="button" onPress={() => router.replace('/' as Href)} style={s.button}>
                <Text style={s.buttonText}>Към вход</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <ActivityIndicator color="#E82127" style={s.spinner} />
            <Text style={s.title}>{authLinkStatus === 'processing' ? 'Потвърждаваме имейла' : 'Проверяваме линка'}</Text>
            <Text style={s.message}>{authLinkFlow === 'recovery' ? 'Подготвяме смяната на паролата.' : 'Изчакай малко, докато потвърдим достъпа.'}</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090A0C' },
  content: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center' },
  brandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#E82127', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  brandLetter: { color: '#fff', fontWeight: '900', fontSize: 17, fontStyle: 'italic' },
  successMark: { color: '#62D6A3', fontSize: 24, fontWeight: '800', marginBottom: 10 },
  spinner: { marginBottom: 18 },
  title: { color: '#F5F5F6', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  message: { color: '#858A91', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8, maxWidth: 320 },
  button: { marginTop: 23, borderRadius: 13, backgroundColor: '#E82127', paddingHorizontal: 24, paddingVertical: 13 },
  secondaryButton: { marginTop: 10, backgroundColor: '#272A2F' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
