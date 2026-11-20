"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./order-success.module.css";

export default function OrderSuccessPage() {
  const [orderId, setOrderId] = useState<number | null>(null);
  const [total, setTotal] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rawOrder = sessionStorage.getItem("dailyfresh_last_order");
      if (!rawOrder) return;
      const order = JSON.parse(rawOrder) as { orderId?: unknown; totalAmount?: unknown };
      if (typeof order.orderId === "number") setOrderId(order.orderId);
      if (typeof order.totalAmount === "string") setTotal(order.totalAmount);
    } catch {
      setOrderId(null);
      setTotal(null);
    }
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="DailyFresh Market home">
          <span className={styles.brandIcon} aria-hidden="true">✿</span>
          <span>DailyFresh<span>-Market</span></span>
        </Link>
      </header>

      <section className={styles.card} aria-live="polite">
        <div className={styles.successIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="m5 12 4.4 4.4L19 6.8" />
          </svg>
        </div>
        <p className={styles.eyebrow}>ORDER CONFIRMED</p>
        <h1>Your order is successful!</h1>
        <p className={styles.message}>
          Thank you for shopping with DailyFresh. We have received your order and will prepare it soon.
        </p>

        <div className={styles.summary}>
          <div>
            <span>Order ID</span>
            <strong>{orderId ? `#${orderId}` : "Confirmed"}</strong>
          </div>
          <div>
            <span>Total Amount</span>
            <strong>{total ? `₹${Number(total).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Paid"}</strong>
          </div>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primaryButton} href="/orders">View My Orders</Link>
          <Link className={styles.secondaryButton} href="/">Continue Shopping</Link>
        </div>
      </section>
    </main>
  );
}
