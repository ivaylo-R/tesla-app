import { useRef, useState } from 'react';
import { router, type Href } from 'expo-router';

import { useAuth } from '@/features/auth/auth-context';
import { AuthField, AuthLayout, AuthMessage, AuthPrimaryButton, AuthSwitchRow } from '@/features/auth/auth-ui';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ForgotPasswordScreen() {
  const { configured, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const busyRef = useRef(false);

  async function submit() {
    if (busyRef.current || sent) return;
    setError(null);
    if (!isValidEmail(email)) {
      setError('Въведи валиден имейл адрес.');
      return;
    }

    busyRef.current = true;
    setBusy(true);
    try {
      const result = await requestPasswordReset(email.trim());
      if (result.error) setError(result.error);
      else setSent(true);
    } catch {
      setError('Няма връзка със сървъра. Опитай отново.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthLayout eyebrow="ВЪЗСТАНОВЯВАНЕ НА ДОСТЪП" title="Забравена парола?" subtitle="Ще изпратим линк за създаване на нова парола.">
      {!configured ? (
        <AuthMessage kind="error">Supabase не е конфигуриран.</AuthMessage>
      ) : sent ? (
        <>
          <AuthMessage kind="success">Ако адресът е свързан с профил, ще получиш инструкции за възстановяване. Провери и папката „Спам“.</AuthMessage>
          <AuthPrimaryButton label="Към вход" onPress={() => router.replace('/' as Href)} />
          <AuthSwitchRow label="Вече си спомни паролата?" action="Вход" onPress={() => router.replace('/' as Href)} />
        </>
      ) : (
        <>
          <AuthField
            label="ИМЕЙЛ"
            value={email}
            onChangeText={(value) => { setEmail(value); setError(null); }}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            editable={!busy}
            returnKeyType="send"
            onSubmitEditing={submit}
          />
          {error ? <AuthMessage kind="error">{error}</AuthMessage> : null}
          <AuthPrimaryButton label="Изпрати линк" busy={busy} onPress={submit} />
          <AuthSwitchRow label="Върни се към" action="Вход" onPress={() => router.replace('/' as Href)} disabled={busy} />
        </>
      )}
    </AuthLayout>
  );
}
