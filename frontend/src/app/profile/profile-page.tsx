"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ApiUserProfile,
  fetchApiUserProfile,
  getAccessToken,
  isAuthenticated,
  logout,
  subscribeToAuth,
  updateApiUserProfile,
} from "../cartApi";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const updateAuth = () => setAuthenticated(isAuthenticated());
    updateAuth();
    return subscribeToAuth(updateAuth);
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      void Promise.resolve().then(() => {
        setError("Please log in to view your profile.");
        setLoading(false);
      });
      return;
    }

    fetchApiUserProfile()
      .then((loadedProfile) => {
        setProfile(loadedProfile);
        setPhone(loadedProfile.phone);
        setCity(loadedProfile.city);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your profile.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updatedProfile = await updateApiUserProfile({ phone: phone.trim(), city: city.trim() });
      setProfile(updatedProfile);
      setPhone(updatedProfile.phone);
      setCity(updatedProfile.city);
      setNotice("Your profile has been updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="DailyFresh Market home">
          <span className={styles.brandIcon} aria-hidden="true">✿</span>
          <span>DailyFresh<span>-Market</span></span>
        </Link>
        <div className={styles.headerActions}>
          <Link className={styles.continueLink} href="/">← Continue Shopping</Link>
          {authenticated ? (
            <button className={styles.authLink} type="button" onClick={() => void logout()}>
              Logout
            </button>
          ) : (
            <Link className={styles.authLink} href="/login">Login</Link>
          )}
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <div>
            <p className={styles.eyebrow}>YOUR ACCOUNT</p>
            <h1>My Profile</h1>
            <p className={styles.description}>Manage your contact details and delivery location.</p>
          </div>
          <Link className={styles.ordersLink} href="/orders">View orders <span aria-hidden="true">→</span></Link>
        </div>

        {loading ? (
          <section className={styles.stateCard} role="status">Loading your profile...</section>
        ) : error && !profile ? (
          <section className={styles.stateCard}>
            <span className={styles.lockIcon} aria-hidden="true">🔒</span>
            <h2>{error}</h2>
            <Link className={styles.submitButton} href="/login">Login</Link>
          </section>
        ) : profile ? (
          <form className={styles.profileCard} onSubmit={handleSubmit}>
            <div className={styles.cardHeading}>
              <span className={styles.avatar} aria-hidden="true">
                {profile.first_name.charAt(0).toUpperCase()}
              </span>
              <div>
                <h2>{profile.first_name} {profile.last_name}</h2>
                <p>Personal information</p>
              </div>
            </div>

            <div className={styles.fields}>
              <label className={styles.field}>
                <span>First name</span>
                <input value={profile.first_name} readOnly aria-readonly="true" />
                <small>This field cannot be changed.</small>
              </label>
              <label className={styles.field}>
                <span>Last name</span>
                <input value={profile.last_name} readOnly aria-readonly="true" />
                <small>This field cannot be changed.</small>
              </label>
              <label className={styles.field}>
                <span>Email address</span>
                <input type="email" value={profile.email} readOnly aria-readonly="true" />
                <small>This field cannot be changed.</small>
              </label>
              <label className={styles.field}>
                <span>Phone number</span>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Add your phone number"
                />
              </label>
              <label className={styles.field}>
                <span>City</span>
                <input
                  type="text"
                  name="city"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Add your city"
                />
              </label>
            </div>

            {error && <p className={styles.error} role="alert">{error}</p>}
            {notice && <p className={styles.notice} role="status">{notice}</p>}
            <div className={styles.formFooter}>
              <p>Your name and email are read-only. Only phone and city can be updated.</p>
              <button className={styles.submitButton} type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </main>
  );
}
