import type { PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const C = { bg: '#090A0C', panel: '#141619', border: '#272A2F', text: '#F5F5F6', muted: '#858A91', red: '#E82127', green: '#62D6A3' };

export function AuthLayout({ eyebrow, title, subtitle, children }: PropsWithChildren<{ eyebrow: string; title: string; subtitle: string }>) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.brand}>
            <View style={s.brandMark}><Text style={s.brandLetter}>T</Text></View>
            <Text style={s.brandName}>TESLA</Text>
          </View>
          <View style={s.hero}>
            <Text style={s.eyebrow}>{eyebrow}</Text>
            <Text style={s.title}>{title}</Text>
            <Text style={s.subtitle}>{subtitle}</Text>
          </View>
          <View style={s.form}>{children}</View>
          <View style={s.privacy}>
            <View style={s.privacyDot} />
            <Text style={s.privacyText}>Защитен достъп · лични автомобили</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthField({ label, ...inputProps }: TextInputProps & { label: string }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor="#62676E"
        style={[s.input, inputProps.style]}
        autoCorrect={false}
      />
    </View>
  );
}

export function AuthMessage({ children, kind }: PropsWithChildren<{ kind: 'error' | 'success' }>) {
  return <Text accessibilityRole={kind === 'error' ? 'alert' : 'text'} accessibilityLiveRegion="polite" style={kind === 'error' ? s.error : s.notice}>{children}</Text>;
}

export function AuthPrimaryButton({ label, onPress, busy = false, disabled = false }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [s.submit, pressed && s.pressed, (busy || disabled) && s.disabled]}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{label}</Text>}
    </Pressable>
  );
}

export function AuthTextLink({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="link" disabled={disabled} onPress={onPress} style={({ pressed }) => [pressed && s.pressed, disabled && s.disabled]}>
      <Text style={s.switchAction}>{label}</Text>
    </Pressable>
  );
}

export function AuthSwitchRow({ label, action, onPress, disabled = false }: { label: string; action: string; onPress: () => void; disabled?: boolean }) {
  return (
    <View style={s.switchRow}>
      <Text style={s.switchText}>{label}</Text>
      <AuthTextLink label={action} onPress={onPress} disabled={disabled} />
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 25, paddingBottom: 30, justifyContent: 'center', maxWidth: 560, width: '100%', alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: 'white', fontWeight: '900', fontSize: 15, fontStyle: 'italic' },
  brandName: { color: C.text, fontSize: 12, fontWeight: '800', letterSpacing: 3.2 },
  hero: { marginTop: 66, marginBottom: 28 },
  eyebrow: { color: C.red, fontSize: 9, fontWeight: '700', letterSpacing: 1.4, marginBottom: 10 },
  title: { color: C.text, fontSize: 31, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { color: C.muted, fontSize: 13, marginTop: 7, lineHeight: 19 },
  form: { gap: 17 },
  field: { gap: 8 },
  fieldLabel: { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  input: { height: 51, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: C.panel, paddingHorizontal: 14, color: C.text, fontSize: 14 },
  submit: { height: 50, backgroundColor: C.red, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 },
  error: { color: '#FF8589', fontSize: 12, lineHeight: 18 },
  notice: { color: C.green, fontSize: 12, lineHeight: 18 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  switchText: { color: C.muted, fontSize: 12 },
  switchAction: { color: C.text, fontSize: 12, fontWeight: '700' },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 30 },
  privacyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  privacyText: { color: C.muted, fontSize: 10 },
});
