import React, { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, type TextInputProps } from "react-native";
import { Redirect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { Check, ShieldAlert } from "lucide-react-native";
import { Button, Txt, useTheme } from "@krizaka/ui/native";
import { BotChallenge } from "@/components/BotChallenge";
import { BusyMark } from "@/components/BusyMark";
import { OrochiaMark } from "@/components/OrochiaMark";
import { VerifyEmail } from "@/components/VerifyEmail";
import { t } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { OROCHIA_URL } from "@/lib/config";
import { withTap } from "@/lib/haptics";
import { checkUsername, isAdult, isoDate, openSignUp, signUpProblem, type SignUpField, type SignUpForm, type UsernameCheck } from "@/lib/signup";
import { space } from "@/lib/theme";

/** How long typing pauses before the username is checked with the server. */
export const USERNAME_DEBOUNCE_MS = 400;

function useField() {
  const { theme, radius } = useTheme();
  return (invalid?: boolean) => ({
    borderWidth: 1,
    borderColor: invalid ? theme.danger : theme.borderDefault,
    backgroundColor: theme.surface1,
    color: theme.textPrimary,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: 16,
  });
}

/** A labelled text field with its hint or its error under it (until @krizaka/ui/native has one: krizaka/krizaka-ui#122). */
function Field({ label, error, hint, inputRef, ...input }: TextInputProps & { label: string; error?: string; hint?: React.ReactNode; inputRef?: React.Ref<TextInput> }) {
  const { theme } = useTheme();
  const style = useField();
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{label}</Txt>
      <TextInput ref={inputRef} accessibilityLabel={label} placeholderTextColor={theme.textMuted} autoCapitalize="none" autoCorrect={false} style={style(Boolean(error))} {...input} />
      {error ? (
        <Txt variant="caption" tone="danger">
          {error}
        </Txt>
      ) : (
        hint
      )}
    </View>
  );
}

/** A box to tick, read by screen readers as a checkbox (until @krizaka/ui/native has one: krizaka/krizaka-ui#122). */
function Tick({ checked, onChange, label, error }: { checked: boolean; onChange: (v: boolean) => void; label: string; error?: string }) {
  const { theme, radius } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        onPress={withTap(() => onChange(!checked))}
        hitSlop={6}
        style={{ flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 44 }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.sm,
            borderWidth: 1.5,
            borderColor: checked ? theme.accent : error ? theme.danger : theme.borderStrong,
            backgroundColor: checked ? theme.accent : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {checked && <Check size={16} color={theme.onAccent} strokeWidth={3} />}
        </View>
        <Txt style={{ flex: 1 }}>{label}</Txt>
      </Pressable>
      {error && (
        <Txt variant="caption" tone="danger">
          {error}
        </Txt>
      )}
    </View>
  );
}

/** The username's state, checked live with the server (debounced), with a free one offered when it is taken. */
function useUsernameCheck(username: string) {
  const value = username.trim().toLowerCase();
  const [answer, setAnswer] = useState<{ for: string; result: UsernameCheck | null } | null>(null);
  useEffect(() => {
    if (!value) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      checkUsername(value, abort.signal)
        .then((result) => !abort.signal.aborted && setAnswer({ for: value, result }))
        // Unreachable: say nothing — the server checks again at sign-up.
        .catch(() => !abort.signal.aborted && setAnswer({ for: value, result: null }));
    }, USERNAME_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [value]);
  const current = answer?.for === value ? answer : null;
  return { checking: Boolean(value) && !current, result: current?.result ?? null };
}

function SignUpFormView() {
  const { theme } = useTheme();
  const style = useField();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [isAgeVerified, setAgeVerified] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [form, setForm] = useState<SignUpForm | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeKey, setChallengeKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SignUpField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const usernameRef = useRef<TextInput>(null);
  const displayNameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const open = useCallback(() => openSignUp().then(setForm, (e: unknown) => setFormError(signUpProblem(e).form)), []);
  useEffect(() => {
    let live = true;
    openSignUp().then(
      (f) => live && setForm(f),
      (e: unknown) => live && setFormError(signUpProblem(e).form),
    );
    return () => {
      live = false;
    };
  }, []);

  const name = useUsernameCheck(username);
  const birth = day && month && year.length === 4 ? isoDate(day, month, year) : null;
  const birthInvalid = Boolean(day && month && year.length === 4 && !birth);
  const underage = Boolean(birth && !isAdult(birth));
  const passwordOk = password.length >= 10;
  const challengeReady = !form?.challenge || Boolean(challengeToken);
  const ready = Boolean(form && email.trim() && username.trim() && password && birth && !underage && isAgeVerified && acceptTerms && challengeReady);

  const clear = (field: SignUpField) => setFieldErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));

  const submit = async () => {
    if (!form || !birth || busy) return;
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await signUp({ email: email.trim(), username: username.trim().toLowerCase(), displayName, password, dateOfBirth: birth, isAgeVerified, acceptTerms }, form, challengeToken);
    } catch (e) {
      const problem = signUpProblem(e);
      setFieldErrors(problem.fields);
      setFormError(problem.form);
      // A challenge token is good once; a refused form token is asked for again.
      if (form.challenge) {
        setChallengeToken(null);
        setChallengeKey((k) => k + 1);
      }
      if (problem.reopen) void open();
    } finally {
      setBusy(false);
    }
  };

  const usernameHint = (() => {
    const value = username.trim().toLowerCase();
    if (!value) return <Txt variant="caption" tone="muted">{t("signUp.usernameFormat")}</Txt>;
    if (name.checking) return <Txt variant="caption" tone="muted">{t("signUp.usernameChecking")}</Txt>;
    const result = name.result;
    if (!result) return null;
    if (result.available)
      return (
        <Txt variant="caption" tone="success">
          {t("signUp.usernameFree", { username: value })}
        </Txt>
      );
    const words = result.reason === "format" ? t("signUp.usernameFormat") : t(result.reason === "reserved" ? "signUp.usernameReserved" : "signUp.usernameTaken", { suggestion: result.suggestion ?? "" });
    return (
      <View style={{ gap: 6, alignItems: "flex-start" }}>
        <Txt variant="caption" tone="danger">
          {words}
        </Txt>
        {result.suggestion && result.reason !== "format" && (
          <Button label={t("signUp.useSuggestion", { suggestion: result.suggestion })} variant="outline" size="sm" shape="pill" onPress={withTap(() => setUsername(result.suggestion ?? ""))} />
        )}
      </View>
    );
  })();

  const only = (v: string, max: number) => {
    clear("dateOfBirth");
    return v.replace(/\D/g, "").slice(0, max);
  };
  const onDay = (v: string) => {
    const clean = only(v, 2);
    setDay(clean);
    if (clean.length === 2) monthRef.current?.focus();
  };
  const onMonth = (v: string) => {
    const clean = only(v, 2);
    setMonth(clean);
    if (clean.length === 2) yearRef.current?.focus();
  };
  const onYear = (v: string) => setYear(only(v, 4));

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ alignItems: "center", gap: space.sm }}>
        <OrochiaMark size={64} title={t("app.name")} />
        <Txt variant="display" style={{ textAlign: "center" }}>
          {t("signUp.title")}
        </Txt>
        <Txt tone="secondary" style={{ textAlign: "center" }}>
          {t("signUp.subtitle")}
        </Txt>
      </View>

      <Field
        label={t("signUp.email")}
        testID="sign-up-email"
        placeholder={t("signUp.emailPlaceholder")}
        value={email}
        onChangeText={(v) => (setEmail(v), clear("email"))}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => usernameRef.current?.focus()}
        error={fieldErrors.email}
      />
      <Field
        label={t("signUp.username")}
        testID="sign-up-username"
        placeholder={t("signUp.usernamePlaceholder")}
        value={username}
        onChangeText={(v) => (setUsername(v.replace(/^@/, "")), clear("username"))}
        autoComplete="username-new"
        textContentType="username"
        inputRef={usernameRef}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => displayNameRef.current?.focus()}
        error={fieldErrors.username}
        hint={usernameHint}
      />
      <Field
        label={t("signUp.displayName")}
        testID="sign-up-display-name"
        placeholder={t("signUp.displayNamePlaceholder")}
        value={displayName}
        onChangeText={(v) => (setDisplayName(v), clear("displayName"))}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        inputRef={displayNameRef}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={fieldErrors.displayName}
      />
      <Field
        label={t("signUp.password")}
        testID="sign-up-password"
        placeholder={t("signUp.passwordRule")}
        value={password}
        onChangeText={(v) => (setPassword(v), clear("password"))}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        inputRef={passwordRef}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => dayRef.current?.focus()}
        error={fieldErrors.password}
        hint={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Check size={12} color={passwordOk ? theme.success : theme.textMuted} />
            <Txt variant="caption" tone={passwordOk ? "success" : "muted"}>
              {t("signUp.passwordRule")}
            </Txt>
          </View>
        }
      />

      <View style={{ gap: 6 }}>
        <Txt variant="label">{t("signUp.birthDate")}</Txt>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <TextInput
            testID="sign-up-day"
            ref={dayRef}
            accessibilityLabel={t("signUp.dayLabel")}
            placeholder={t("signUp.day")}
            placeholderTextColor={theme.textMuted}
            value={day}
            onChangeText={onDay}
            keyboardType="number-pad"
            autoComplete="birthdate-day"
            style={[style(Boolean(fieldErrors.dateOfBirth) || birthInvalid || underage), { flex: 1, textAlign: "center" }]}
          />
          <TextInput
            ref={monthRef}
            testID="sign-up-month"
            accessibilityLabel={t("signUp.monthLabel")}
            placeholder={t("signUp.month")}
            placeholderTextColor={theme.textMuted}
            value={month}
            onChangeText={onMonth}
            keyboardType="number-pad"
            autoComplete="birthdate-month"
            style={[style(Boolean(fieldErrors.dateOfBirth) || birthInvalid || underage), { flex: 1, textAlign: "center" }]}
          />
          <TextInput
            ref={yearRef}
            testID="sign-up-year"
            accessibilityLabel={t("signUp.yearLabel")}
            placeholder={t("signUp.year")}
            placeholderTextColor={theme.textMuted}
            value={year}
            onChangeText={onYear}
            keyboardType="number-pad"
            autoComplete="birthdate-year"
            style={[style(Boolean(fieldErrors.dateOfBirth) || birthInvalid || underage), { flex: 1.4, textAlign: "center" }]}
          />
        </View>
        {fieldErrors.dateOfBirth ? (
          <Txt variant="caption" tone="danger">
            {fieldErrors.dateOfBirth}
          </Txt>
        ) : birthInvalid ? (
          <Txt variant="caption" tone="danger">
            {t("signUp.birthDateInvalid")}
          </Txt>
        ) : (
          <Txt variant="caption" tone="muted">
            {t("signUp.birthDateHint")}
          </Txt>
        )}
      </View>

      {underage && (
        <View accessibilityRole="alert" style={{ flexDirection: "row", gap: space.sm, padding: space.md, borderRadius: 12, borderWidth: 1, borderColor: theme.danger, backgroundColor: theme.surface1 }}>
          <ShieldAlert size={18} color={theme.danger} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="label" tone="danger">
              {t("signUp.underageTitle")}
            </Txt>
            <Txt variant="caption" tone="secondary">
              {t("signUp.underageBody")}
            </Txt>
          </View>
        </View>
      )}

      <View style={{ gap: space.xs }}>
        <Tick checked={isAgeVerified} onChange={(v) => (setAgeVerified(v), clear("isAgeVerified"))} label={t("signUp.ageCertify")} error={fieldErrors.isAgeVerified} />
        <Tick checked={acceptTerms} onChange={(v) => (setAcceptTerms(v), clear("acceptTerms"))} label={t("signUp.acceptTerms")} error={fieldErrors.acceptTerms} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md, paddingLeft: 32 }}>
          <Txt variant="caption" tone="accent" role="link" onPress={() => void WebBrowser.openBrowserAsync(`${OROCHIA_URL}/legal/terms`)}>
            {t("signUp.terms")}
          </Txt>
          <Txt variant="caption" tone="accent" role="link" onPress={() => void WebBrowser.openBrowserAsync(`${OROCHIA_URL}/legal/privacy`)}>
            {t("signUp.privacy")}
          </Txt>
        </View>
      </View>

      {form?.challenge && <BotChallenge key={challengeKey} onToken={setChallengeToken} />}

      {formError && (
        <Txt tone="danger" accessibilityLiveRegion="polite">
          {formError}
        </Txt>
      )}
      {busy && <BusyMark label={t("signUp.submitting")} />}
      <Button label={t("signUp.submit")} variant="primary" size="lg" onPress={withTap(() => void submit())} loading={busy} disabled={!ready} />
      <Button label={t("signUp.haveAccount")} variant="ghost" size="md" onPress={withTap(() => (router.canGoBack() ? router.back() : router.replace("/me")))} />
    </View>
  );
}

/**
 * Create an account in the app — on the web's sign-up API, where every rule lives (lib/signup.ts) — then confirm the
 * e-mail address, then on to the feed, signed in. A signed-in person is never shown the form.
 */
export default function SignUp() {
  const insets = useSafeAreaInsets();
  const { user, pending } = useAuth();
  if (user) return <Redirect href="/" />;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + space.xxl }}>
        {pending ? <VerifyEmail onVerified={() => router.replace("/")} /> : <SignUpFormView />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
