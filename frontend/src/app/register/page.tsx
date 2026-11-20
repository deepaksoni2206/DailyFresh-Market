"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "./register.module.css";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

function passwordStrength(password: string) {
  if (password.length < 6) return { label: "Weak", level: 1 };
  if (password.length < 9) return { label: "Medium", level: 2 };
  if (/[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)) {
    return { label: "Strong", level: 4 };
  }
  return { label: "Good", level: 3 };
}

function getApiError(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    return "Registration failed. Please try again.";
  }

  const messages = Object.entries(payload).flatMap(([field, value]) => {
    const errors = Array.isArray(value) ? value : [value];
    return errors
      .filter((error): error is string => typeof error === "string")
      .map((error) =>
        field === "non_field_errors" || field === "detail"
          ? error
          : `${field.replaceAll("_", " ")}: ${error}`,
      );
  });

  return messages.length
    ? messages.join(" ")
    : "Registration failed. Please check your details and try again.";
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20v-1.6a6.5 6.5 0 0 1 13 0V20" />
    </svg>
  );
}

function PasswordIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ crossed = false }: { crossed?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {crossed && <path d="m4 4 16 16" />}
    </svg>
  );
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const strength = passwordStrength(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const passwordValue = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    if (passwordValue !== confirmPassword) {
      setPasswordMismatch(true);
      setMessage("");
      setApiError("");
      return;
    }

    setPasswordMismatch(false);
    setMessage("");
    setApiError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: String(data.get("firstName") ?? "").trim(),
          last_name: String(data.get("lastName") ?? "").trim(),
          email: String(data.get("email") ?? "").trim(),
          password: passwordValue,
          confirm_password: confirmPassword,
        }),
      });

      let responseBody: unknown;
      try {
        responseBody = await response.json();
      } catch {
        throw new Error(
          response.ok
            ? "Registration succeeded, but the server returned an unreadable response."
            : `Registration failed with HTTP ${response.status}. The server response was not valid JSON.`,
        );
      }

      if (!response.ok) {
        throw new Error(getApiError(responseBody));
      }

      const successMessage =
        typeof responseBody === "object" &&
        responseBody !== null &&
        "message" in responseBody &&
        typeof responseBody.message === "string"
          ? responseBody.message
          : "Your account has been created successfully.";

      setMessage(successMessage);
      setPassword("");
      form.reset();
    } catch (error) {
      setApiError(
        error instanceof TypeError
          ? "Could not reach the registration server. Check that Django is running at http://127.0.0.1:8000 and that CORS allows this frontend."
          : error instanceof Error
            ? error.message
            : "Registration failed unexpectedly. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.registerCard} aria-labelledby="register-title">
        <aside className={styles.visualPanel}>
          <Image
            className={styles.backgroundImage}
            src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1200&q=90"
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 100vw, 400px"
          />
          <div className={styles.visualOverlay} />
          <Link className={styles.brand} href="/" aria-label="DailyFresh home">
            Daily<span>Fresh</span>
          </Link>
          <div className={styles.visualMessage}>
            <h2>Join the Fresh Tribe</h2>
            <p>100% Organic, farm-picked essentials delivered fast.</p>
          </div>
          <div className={styles.leafDecor} aria-hidden="true">
            <span><svg viewBox="0 0 32 32" fill="none"><path d="M7 22.5c0-8.6 7.1-15.3 18-16-1 10.9-7.4 18-16 18" /><path d="M8 25c3.4-5.5 7.6-9.8 13-13" /></svg></span>
            <span className={styles.sprout}><svg viewBox="0 0 32 32" fill="none"><path d="M16 27V14m0 5c0-7-4-10-10-10 0 6 3 10 10 10Zm0-3c0-7 4-10 10-10 0 6-3 10-10 10Z" /></svg></span>
            <span><svg viewBox="0 0 32 32" fill="none"><path d="M7 22.5c0-8.6 7.1-15.3 18-16-1 10.9-7.4 18-16 18" /><path d="M8 25c3.4-5.5 7.6-9.8 13-13" /></svg></span>
          </div>
          <div className={styles.promiseList}>
            <p><span aria-hidden="true">✓</span> Express 15-Minute Delivery</p>
            <p><span aria-hidden="true">✓</span> Freshness Guaranteed</p>
          </div>
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.formHeading}>
            <h1 id="register-title">Create Free Account</h1>
            <p>Already registered? <Link href="/login">Sign in here</Link></p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.nameRow}>
              <label className={styles.field}>
                <span className={styles.label}>FIRST NAME</span>
                <span className={styles.inputWrap}>
                  <PersonIcon />
                  <input name="firstName" type="text" autoComplete="given-name" placeholder="First name" required minLength={2} />
                </span>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>LAST NAME</span>
                <span className={styles.inputWrap}>
                  <PersonIcon />
                  <input name="lastName" type="text" autoComplete="family-name" placeholder="Last name" required minLength={2} />
                </span>
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>EMAIL ADDRESS</span>
              <span className={styles.inputWrap}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
                <input name="email" type="email" autoComplete="email" placeholder="name@example.com" required />
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>PASSWORD</span>
              <span className={styles.inputWrap}>
                <PasswordIcon />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  className={styles.eyeButton}
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon crossed={showPassword} />
                </button>
              </span>
              <span className={styles.strength}>
                <span className={styles.strengthTrack}>
                  <span className={`${styles.strengthFill} ${styles[`strength${strength.level}`]}`} />
                </span>
                <span>{strength.label}</span>
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>CONFIRM PASSWORD</span>
              <span className={`${styles.inputWrap} ${passwordMismatch ? styles.inputError : ""}`}>
                <PasswordIcon />
                <input
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  minLength={6}
                  required
                  aria-invalid={passwordMismatch}
                  onChange={() => setPasswordMismatch(false)}
                />
                <button
                  className={styles.eyeButton}
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon crossed={showPassword} />
                </button>
              </span>
            </label>

            {passwordMismatch && (
              <p className={styles.error} role="alert">Passwords do not match. Please try again.</p>
            )}
            {apiError && <p className={styles.error} role="alert">{apiError}</p>}
            {message && <p className={styles.notice} role="status">{message}</p>}

            <label className={styles.terms}>
              <input type="checkbox" name="terms" required />
              <span>I agree to the <a href="#terms">Terms</a> &amp; <a href="#privacy">Privacy Policy</a></span>
            </label>

            <button className={styles.submitButton} type="submit" disabled={submitting}>
              {submitting ? "Creating account..." : "Create Account"}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <Link className={styles.backLink} href="/">← Back to Home</Link>
        </div>
      </section>
    </main>
  );
}
