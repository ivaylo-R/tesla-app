import { useRef, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';

import { useAuth } from '@/features/auth/auth-context';
import { AuthField, AuthLayout, AuthMessage, AuthPrimaryButton, AuthSwitchRow, AuthTextLink } from '@/features/auth/auth-ui';

type AuthMode = 'signin' | 'signup';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function AuthScreen() {
  const { configured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busyRef = useRef(false);

  function clearFeedback() {
    setError(null);
    setNotice(null);
  }

  async function submit() {
    if (busyRef.current) return;
    clearFeedback();

    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setError('Въведи валиден имейл адрес.');
      return;
    }
    if (mode === 'signup' && !displayName.trim()) {
      setError('Въведи име за профила.');
      return;
    }
    if (mode === 'signup' && displayName.trim().length > 80) {
      setError('Името трябва да е до 80 символа.');
      return;
    }
    if (!password) {
      setError('Въведи паролата си.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Паролата трябва да е поне 8 символа.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Паролите не съвпадат.');
      return;
    }

    busyRef.current = true;
    setBusy(true);
    try {
      const result = mode === 'signup'
        ? await signUp(normalizedEmail, password, displayName.trim())
        : await signIn(normalizedEmail, password);
      if (result.error) setError(result.error);
      else if (mode === 'signup' && result.confirmationRequired) {
        setNotice('Ако адресът може да бъде регистриран, ще получиш инструкции на имейла си.');
      }
    } catch {
      setError('Няма връзка със сървъра. Опитай отново.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    if (busyRef.current) return;
    setMode(nextMode);
    clearFeedback();
  }

  return (
    <AuthLayout
      eyebrow="ТВОЯТ АВТОМОБИЛ"
      title={mode === 'signin' ? 'Добре дошъл' : 'Създай профил'}
      subtitle="Влез, за да управляваш автомобилите си.">
      {!configured ? (
        <View style={s.configCard}>
          <Text style={s.configTitle}>Настрой Supabase</Text>
          <Text style={s.configText}>Добави URL и publishable key от Supabase проекта в локалната конфигурация на приложението.</Text>
        </View>
      ) : (
        <>
          {mode === 'signup' && (
            <AuthField
              label="ИМЕ"
              value={displayName}
              onChangeText={(value) => { setDisplayName(value); clearFeedback(); }}
              placeholder="Твоето име"
              autoCapitalize="words"
              autoComplete="name"
              maxLength={81}
              editable={!busy}
              returnKeyType="next"
            />
          )}
          <AuthField
            label="ИМЕЙЛ"
            value={email}
            onChangeText={(value) => { setEmail(value); clearFeedback(); }}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            editable={!busy}
            returnKeyType="next"
          />
          <AuthField
            label="ПАРОЛА"
            value={password}
            onChangeText={(value) => { setPassword(value); clearFeedback(); }}
            placeholder={mode === 'signup' ? 'Поне 8 символа' : 'Парола'}
            secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            editable={!busy}
            returnKeyType={mode === 'signup' ? 'next' : 'done'}
            onSubmitEditing={mode === 'signin' ? submit : undefined}
          />
          {mode === 'signup' ? (
            <AuthField
              label="ПОТВЪРДИ ПАРОЛАТА"
              value={confirmPassword}
              onChangeText={(value) => { setConfirmPassword(value); clearFeedback(); }}
              placeholder="Повтори паролата"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!busy}
              returnKeyType="done"
              onSubmitEditing={submit}
            />
          ) : (
            <View style={s.forgotLink}>
              <AuthTextLink label="Забравена парола?" onPress={() => router.push('/auth/forgot-password' as Href)} disabled={busy} />
            </View>
          )}

          {error ? <AuthMessage kind="error">{error}</AuthMessage> : null}
          {notice ? <AuthMessage kind="success">{notice}</AuthMessage> : null}
          <AuthPrimaryButton label={mode === 'signin' ? 'Вход' : 'Създай профил'} busy={busy} onPress={submit} />
          <AuthSwitchRow
            label={mode === 'signin' ? 'Нямаш профил?' : 'Вече имаш профил?'}
            action={mode === 'signin' ? 'Регистрация' : 'Вход'}
            onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            disabled={busy}
          />
        </>
      )}
    </AuthLayout>
  );
}

const s = StyleSheet.create({
  configCard: { backgroundColor: '#141619', borderRadius: 16, borderWidth: 1, borderColor: '#272A2F', padding: 17, gap: 7 },
  configTitle: { color: '#F5F5F6', fontWeight: '700', fontSize: 14 },
  configText: { color: '#858A91', fontSize: 12, lineHeight: 18 },
  forgotLink: { alignItems: 'flex-end', marginTop: -7 },
});
