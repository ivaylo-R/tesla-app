import { useEffect, useRef, useState } from 'react';
import { router, type Href } from 'expo-router';

import { useAuth } from '@/features/auth/auth-context';
import { AuthField, AuthLayout, AuthMessage, AuthPrimaryButton, AuthSwitchRow } from '@/features/auth/auth-ui';

export default function ResetPasswordScreen() {
  const {
    loading,
    user,
    recoveryRequired,
    authLinkStatus,
    authLinkFlow,
    authLinkError,
    updatePasswordAndSignOut,
  } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => router.replace('/' as Href), 1800);
    return () => clearTimeout(timer);
  }, [success]);

  async function submit() {
    if (busyRef.current || success) return;
    setError(null);
    if (password.length < 8) {
      setError('Паролата трябва да е поне 8 символа.');
      return;
    }
    if (password.trim().length === 0) {
      setError('Паролата не може да съдържа само интервали.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Паролите не съвпадат.');
      return;
    }

    busyRef.current = true;
    setBusy(true);
    try {
      const result = await updatePasswordAndSignOut(password);
      if (result.error) setError(result.error);
      else setSuccess(true);
    } catch {
      setError('Няма връзка със сървъра. Опитай отново.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const recoveryReady = Boolean(user && recoveryRequired);
  const recoveryLinkFailed = authLinkStatus === 'error' && authLinkFlow === 'recovery';

  if (!success && !recoveryReady) {
    return (
      <AuthLayout
        eyebrow="ЗАЩИТА НА ПРОФИЛА"
        title={recoveryLinkFailed ? 'Линкът не беше потвърден' : 'Проверяваме достъпа'}
        subtitle={
          recoveryLinkFailed
            ? 'Линкът за възстановяване е невалиден или е изтекъл.'
            : loading || authLinkStatus === 'processing'
              ? 'Изчакай малко, докато проверим линка за възстановяване.'
              : 'Отвори линка от имейла или поискай нов, ако не се зареди.'
        }>
        {recoveryLinkFailed ? (
          <AuthMessage kind="error">
            {authLinkError ?? 'Поискай нов линк и опитай отново.'}
          </AuthMessage>
        ) : null}
        <AuthPrimaryButton
          label={recoveryLinkFailed ? 'Поискай нов линк' : 'Към забравена парола'}
          onPress={() => router.replace('/auth/forgot-password' as Href)}
        />
        <AuthSwitchRow
          label="Върни се към"
          action="Вход"
          onPress={() => router.replace('/' as Href)}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout eyebrow="ЗАЩИТА НА ПРОФИЛА" title={success ? 'Паролата е променена' : 'Нова парола'} subtitle={success ? 'Вече можеш да влезеш с новата си парола.' : 'Избери нова парола за профила си.'}>
      {success ? (
        <>
          <AuthMessage kind="success">Паролата е обновена. Ще те върнем към входа.</AuthMessage>
          <AuthPrimaryButton label="Към вход" onPress={() => router.replace('/' as Href)} />
        </>
      ) : (
        <>
          <AuthField
            label="НОВА ПАРОЛА"
            value={password}
            onChangeText={(value) => { setPassword(value); setError(null); }}
            placeholder="Поне 8 символа"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!busy}
            returnKeyType="next"
          />
          <AuthField
            label="ПОТВЪРДИ НОВАТА ПАРОЛА"
            value={confirmPassword}
            onChangeText={(value) => { setConfirmPassword(value); setError(null); }}
            placeholder="Повтори паролата"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!busy}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          {error ? <AuthMessage kind="error">{error}</AuthMessage> : null}
          <AuthPrimaryButton label="Запази новата парола" busy={busy} onPress={submit} />
          <AuthSwitchRow label="Линкът не работи?" action="Към вход" onPress={() => router.replace('/' as Href)} disabled={busy} />
        </>
      )}
    </AuthLayout>
  );
}
