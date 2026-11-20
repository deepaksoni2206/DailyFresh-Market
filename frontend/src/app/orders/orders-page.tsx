"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiOrder, fetchApiOrders, getAccessToken, getApiImageUrl, isAuthenticated, logout, subscribeToAuth } from "../cartApi";
import styles from "./orders.module.css";

export default function OrdersPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const updateAuth = () => setAuthenticated(isAuthenticated());
    updateAuth();
    return subscribeToAuth(updateAuth);
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      setError("Please log in to view your orders.");
      return;
    }

    fetchApiOrders()
      .then((loadedOrders) =>
        setOrders(
          [...loadedOrders].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
        )
      )
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load your orders.");
      })
      .finally(() => setLoading(false));
  }, []);

  function formatPrice(value: string | number) {
    return `₹${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
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
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M18 12H8" />
              </svg>
              Logout
            </button>
          ) : (
            <>
              <Link className={styles.authLinkSecondary} href="/login">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="8" r="3" /><path d="M5.5 20v-1.5a6.5 6.5 0 0 1 13 0V20" />
                </svg>
                Login
              </Link>
              <Link className={styles.authLink} href="/register">Register</Link>
            </>
          )}
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <div>
            <p className={styles.eyebrow}>YOUR ACCOUNT</p>
            <h1>My Orders</h1>
          </div>
          <span className={styles.orderCount}>{orders.length} {orders.length === 1 ? "Order" : "Orders"}</span>
        </div>

        {loading ? (
          <section className={styles.emptyState}><p>Loading your orders...</p></section>
        ) : error ? (
          <section className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">🔒</span>
            <h2>{error}</h2>
            <Link className={styles.emptyButton} href="/login">Login</Link>
          </section>
        ) : orders.length === 0 ? (
          <section className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">📦</span>
            <h2>No orders yet</h2>
            <p>Your fresh finds will appear here after you place an order.</p>
            <Link className={styles.emptyButton} href="/">Start Shopping</Link>
          </section>
        ) : (
          <div className={styles.orderList}>
            {orders.map((order) => (
              <article className={styles.orderCard} key={order.id}>
                <div className={styles.orderHeader}>
                  <div>
                    <span>Order</span>
                    <strong>#{order.id}</strong>
                  </div>
                  <div>
                    <span>Placed on</span>
                    <strong>{formatDate(order.created_at)}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong className={styles.status}>{order.status}</strong>
                  </div>
                  <div className={styles.orderTotal}>
                    <span>Total</span>
                    <strong>{formatPrice(order.total_amount)}</strong>
                  </div>
                </div>

                <div className={styles.itemList}>
                  {order.items.map((item) => {
                    const imageUrl = getApiImageUrl(item.product.image);
                    return (
                      <div className={styles.item} key={item.id}>
                        {imageUrl ? (
                          <Image src={imageUrl} alt={item.product.name} width={72} height={72} className={styles.productImage} unoptimized />
                        ) : (
                          <div className={styles.imagePlaceholder} aria-hidden="true">🥬</div>
                        )}
                        <div className={styles.productInfo}>
                          <strong>{item.product.name}</strong>
                          <span>{item.qty} × {item.product.unit_value || item.product.unit}</span>
                        </div>
                        <strong className={styles.itemPrice}>{formatPrice(item.price)}</strong>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
