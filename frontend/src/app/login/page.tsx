"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "./login.module.css";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

type LoginResponse = {
  message: string;
  access: string;
  refresh: string;
  email: string;
  first_name: string;
  last_name: string;
};

function isLoginResponse(value: unknown): value is LoginResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string" &&
    "access" in value &&
    typeof value.access === "string" &&
    "refresh" in value &&
    typeof value.refresh === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    "first_name" in value &&
    typeof value.first_name === "string" &&
    "last_name" in value &&
    typeof value.last_name === "string"
  );
}

function getApiError(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return "Sign in failed. Please check your details and try again.";
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  if ("detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }

  const messages = Object.entries(payload).flatMap(([field, value]) => {
    const errors = Array.isArray(value) ? value : [value];
    return errors
      .filter((error): error is string => typeof error === "string")
      .map((error) =>
        field === "non_field_errors"
          ? error
          : `${field.replaceAll("_", " ")}: ${error}`,
      );
  });

  return messages.length
    ? messages.join(" ")
    : "Sign in failed. Please check your details and try again.";
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
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

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/api/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? "").trim(),
          password: String(data.get("password") ?? ""),
        }),
      });

      let responseBody: unknown;
      try {
        responseBody = await response.json();
      } catch {
        throw new Error(
          response.ok
            ? "Sign in succeeded, but the server returned an unreadable response."
            : `Sign in failed with HTTP ${response.status}. The server response was not valid JSON.`,
        );
      }

      if (!response.ok) {
        throw new Error(getApiError(responseBody));
      }
      if (!isLoginResponse(responseBody)) {
        throw new Error("The login server returned an unexpected response.");
      }

      try {
        sessionStorage.setItem(
          "dailyfresh_auth",
          JSON.stringify({
            access: responseBody.access,
            refresh: responseBody.refresh,
            user: {
              email: responseBody.email,
              first_name: responseBody.first_name,
              last_name: responseBody.last_name,
            },
          }),
        );
        window.dispatchEvent(new Event("dailyfresh_auth_change"));
      } catch {
        throw new Error(
          "Sign in succeeded, but this browser could not save the session. Check browser storage settings and try again.",
        );
      }

      router.replace("/index");
    } catch (submitError) {
      setError(
        submitError instanceof TypeError
          ? "Could not reach the login server. Check that Django is running at http://127.0.0.1:8000 and that CORS allows this frontend."
          : submitError instanceof Error
            ? submitError.message
            : "Sign in failed unexpectedly. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.loginCard} aria-labelledby="login-title">
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
            <h2>Good to see you again.</h2>
            <p>Your fresh favourites are just around the corner.</p>
          </div>
          <div className={styles.leafDecor} aria-hidden="true">
            <span>
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M7 22.5c0-8.6 7.1-15.3 18-16-1 10.9-7.4 18-16 18" />
                <path d="M8 25c3.4-5.5 7.6-9.8 13-13" />
              </svg>
            </span>
            <span className={styles.sprout}>
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M16 27V14m0 5c0-7-4-10-10-10 0 6 3 10 10 10Zm0-3c0-7 4-10 10-10 0 6-3 10-10 10Z" />
              </svg>
            </span>
            <span>
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M7 22.5c0-8.6 7.1-15.3 18-16-1 10.9-7.4 18-16 18" />
                <path d="M8 25c3.4-5.5 7.6-9.8 13-13" />
              </svg>
            </span>
          </div>
          <div className={styles.promiseList}>
            <p><span aria-hidden="true">✓</span> Express 15-Minute Delivery</p>
            <p><span aria-hidden="true">✓</span> Freshness Guaranteed</p>
          </div>
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.formHeading}>
            <h1 id="login-title">Welcome Back</h1>
            <p>Sign in to pick up where the good stuff begins.</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>EMAIL ADDRESS</span>
              <span className={styles.inputWrap}>
                <EmailIcon />
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  required
                />
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>PASSWORD</span>
              <span className={styles.inputWrap}>
                <PasswordIcon />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
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

            <div className={styles.formOptions}>
              <label className={styles.remember}>
                <input type="checkbox" name="remember" />
                <span>Remember me</span>
              </label>
              <Link href="/forgot-password">Forgot password?</Link>
            </div>

            {error && <p className={styles.error} role="alert">{error}</p>}
            <button className={styles.submitButton} type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign In"}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className={styles.registerPrompt}>
            New to DailyFresh? <Link href="/register">Create an account</Link>
          </p>
          <Link className={styles.backLink} href="/">← Back to Home</Link>
        </div>
      </section>
    </main>
  );
}
