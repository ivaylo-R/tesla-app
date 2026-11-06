import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/features/auth/auth-context';

const C = { bg: '#090A0C', panel: '#141619', border: '#272A2F', text: '#F5F5F6', muted: '#858A91', red: '#E82127', green: '#62D6A3' };

export function AuthScreen() {
  const { configured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setNotice(null);
    if (mode === 'signup' && !displayName.trim()) {
      setError('Въведи име за профила.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Паролата трябва да е поне 8 символа.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Въведи имейл и парола.');
      return;
    }

    setBusy(true);
    try {
      const result = mode === 'signup'
        ? await signUp(email, password, displayName)
        : await signIn(email, password);
      if (result.error) setError(result.error);
      else if (result.confirmationRequired) setNotice('Изпратихме линк за потвърждение. Отвори имейла си на това устройство.');
    } catch {
      setError('В момента не успяхме да се свържем. Провери връзката и опитай отново.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.brand}><View style={s.brandMark}><Text style={s.brandLetter}>T</Text></View><Text style={s.brandName}>TESLA</Text></View>
          <View style={s.hero}><Text style={s.eyebrow}>ТВОЯТ АВТОМОБИЛ</Text><Text style={s.title}>{mode === 'signin' ? 'Добре дошъл' : 'Създай профил'}</Text><Text style={s.subtitle}>Влез, за да управляваш автомобилите си.</Text></View>

          {!configured ? (
            <View style={s.configCard}>
              <Text style={s.configTitle}>Настрой Supabase</Text>
              <Text style={s.configText}>Копирай .env.example като .env и въведи URL и publishable key от Supabase проекта.</Text>
            </View>
          ) : (
            <View style={s.form}>
              {mode === 'signup' && <Field label="ИМЕ" value={displayName} onChangeText={setDisplayName} placeholder="Твоето име" autoCapitalize="words" />}
              <Field label="ИМЕЙЛ" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              <Field label="ПАРОЛА" value={password} onChangeText={setPassword} placeholder="Поне 8 символа" secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
              {notice ? <Text accessibilityRole="status" style={s.notice}>{notice}</Text> : null}
              <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={({ pressed }) => [s.submit, pressed && s.pressed, busy && s.disabled]}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{mode === 'signin' ? 'Вход' : 'Създай профил'}</Text>}
              </Pressable>
              <View style={s.switchRow}>
                <Text style={s.switchText}>{mode === 'signin' ? 'Нямаш профил?' : 'Вече имаш профил?'}</Text>
                <Pressable accessibilityRole="button" onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setNotice(null); }}>
                  <Text style={s.switchAction}>{mode === 'signin' ? 'Регистрация' : 'Вход'}</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={s.privacy}><View style={s.privacyDot} /><Text style={s.privacyText}>Защитен достъп · лични автомобили</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><TextInput {...inputProps} placeholderTextColor="#62676E" style={s.input} autoCorrect={false} /></View>;
}

const s = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: C.bg }, scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 25, paddingBottom: 30, justifyContent: 'center', maxWidth: 560, width: '100%', alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandMark: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }, brandLetter: { color: 'white', fontWeight: '900', fontSize: 15, fontStyle: 'italic' }, brandName: { color: C.text, fontSize: 12, fontWeight: '800', letterSpacing: 3.2 },
  hero: { marginTop: 66, marginBottom: 28 }, eyebrow: { color: C.red, fontSize: 9, fontWeight: '700', letterSpacing: 1.4, marginBottom: 10 }, title: { color: C.text, fontSize: 31, fontWeight: '700', letterSpacing: -0.7 }, subtitle: { color: C.muted, fontSize: 13, marginTop: 7 }, form: { gap: 17 }, field: { gap: 8 }, fieldLabel: { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.2 }, input: { height: 51, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: C.panel, paddingHorizontal: 14, color: C.text, fontSize: 14 },
  submit: { height: 50, backgroundColor: C.red, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 3 }, submitText: { color: '#fff', fontSize: 14, fontWeight: '700' }, pressed: { opacity: 0.82 }, disabled: { opacity: 0.6 }, error: { color: '#FF8589', fontSize: 12 }, notice: { color: C.green, fontSize: 12, lineHeight: 18 }, switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 2 }, switchText: { color: C.muted, fontSize: 12 }, switchAction: { color: C.text, fontSize: 12, fontWeight: '700' }, configCard: { backgroundColor: C.panel, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 17, gap: 7 }, configTitle: { color: C.text, fontWeight: '700', fontSize: 14 }, configText: { color: C.muted, fontSize: 12, lineHeight: 18 }, privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 30 }, privacyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }, privacyText: { color: C.muted, fontSize: 10 },
});
