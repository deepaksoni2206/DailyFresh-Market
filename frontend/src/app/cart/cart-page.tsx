"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./cart.module.css";
import {
  ApiCart,
  ApiCartItem,
  fetchApiCart,
  getAccessToken,
  getApiImageUrl,
  isAuthenticated,
  logout,
  placeOrder,
  removeApiCartItem,
  subscribeToAuth,
  updateApiCartItem,
} from "../cartApi";

function formatPrice(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const FREE_DELIVERY_THRESHOLD = 500;

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingItemIds, setUpdatingItemIds] = useState<number[]>([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const updateAuth = () => setAuthenticated(isAuthenticated());
    updateAuth();
    return subscribeToAuth(updateAuth);
  }, []);

  async function handleCheckout() {
    if (placingOrder) return;
    setPlacingOrder(true);
    setError("");
    try {
      const result = await placeOrder();
      sessionStorage.setItem("dailyfresh_last_order", JSON.stringify({
        orderId: result.orderId,
        totalAmount: result.totalAmount,
      }));
      router.push("/order-success");
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not place your order.");
      setPlacingOrder(false);
    }
  }

  async function loadCart(showLoading = true) {
    if (!getAccessToken()) {
      setCart(null);
      setError("Please log in to view and manage your cart.");
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    setError("");
    try {
      setCart(await fetchApiCart());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your cart.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    if (!getAccessToken()) {
      void Promise.resolve().then(() => {
        setCart(null);
        setError("Please log in to view and manage your cart.");
        setLoading(false);
      });
      return;
    }

    void fetchApiCart()
      .then((loadedCart) => setCart(loadedCart))
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load your cart.");
      })
      .finally(() => setLoading(false));
  }, []);

  const items = cart?.items ?? [];
  const pricing = cart?.pricing;
  const itemCount = items.reduce((total, item) => total + item.qty, 0);
  const subtotal = pricing?.items_total ?? 0;
  const deliveryFee = pricing?.delivery_fee ?? 0;
  const grandTotal = pricing?.grand_total ?? 0;
  const remainingForFreeDelivery = Math.max(FREE_DELIVERY_THRESHOLD - subtotal, 0);
  const freeDeliveryProgress = Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100);

  async function changeQuantity(item: ApiCartItem, change: number) {
    if (updatingItemIds.includes(item.id)) return;
    const nextQuantity = item.qty + change;
    setUpdatingItemIds((ids) => [...ids, item.id]);
    setError("");

    if (cart) {
      const nextItems = nextQuantity < 1
        ? cart.items.filter((cartItem) => cartItem.id !== item.id)
        : cart.items.map((cartItem) => cartItem.id === item.id
          ? { ...cartItem, qty: nextQuantity, subtotal: nextQuantity * Number(cartItem.product.discount_price ?? cartItem.product.price) }
          : cartItem);
      const itemsTotal = nextItems.reduce((total, cartItem) => total + cartItem.subtotal, 0);
      const nextDeliveryFee = itemsTotal > 0 && itemsTotal < FREE_DELIVERY_THRESHOLD ? 30 : 0;
      setCart({ ...cart, items: nextItems, pricing: { items_total: itemsTotal, delivery_fee: nextDeliveryFee, grand_total: itemsTotal + nextDeliveryFee } });
    }

    try {
      await updateApiCartItem(item.id, nextQuantity);
      await loadCart(false);
    } catch (updateError) {
      await loadCart(false);
      setError(updateError instanceof Error ? updateError.message : "Could not update quantity.");
    } finally {
      setUpdatingItemIds((ids) => ids.filter((id) => id !== item.id));
    }
  }

  async function removeItem(itemId: number) {
    if (updatingItemIds.includes(itemId)) return;
    setUpdatingItemIds((ids) => [...ids, itemId]);
    setError("");

    if (cart) {
      const nextItems = cart.items.filter((item) => item.id !== itemId);
      const itemsTotal = nextItems.reduce((total, item) => total + item.subtotal, 0);
      const nextDeliveryFee = itemsTotal > 0 && itemsTotal < FREE_DELIVERY_THRESHOLD ? 30 : 0;
      setCart({ ...cart, items: nextItems, pricing: { items_total: itemsTotal, delivery_fee: nextDeliveryFee, grand_total: itemsTotal + nextDeliveryFee } });
    }

    try {
      await removeApiCartItem(itemId);
      await loadCart(false);
    } catch (removeError) {
      await loadCart(false);
      setError(removeError instanceof Error ? removeError.message : "Could not remove item.");
    } finally {
      setUpdatingItemIds((ids) => ids.filter((id) => id !== itemId));
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="DailyFresh Market home">
          <span className={styles.brandIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L21 8H6" />
              <circle cx="10" cy="19" r="1.5" />
              <circle cx="17" cy="19" r="1.5" />
              <path d="m9 10 2.1 2.1L15 8.5" />
            </svg>
          </span>
          <span className={styles.brandName}>
            DailyFresh<span>-Market</span>
          </span>
        </Link>
        <div className={styles.headerActions}>
          <Link className={styles.continueLink} href="/">
            <span aria-hidden="true">←</span> Continue Shopping
          </Link>
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
          <h1>Your Fresh Cart</h1>
          <span className={styles.itemCount}>
            {itemCount} {itemCount === 1 ? "Item" : "Items"}
          </span>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <section className={styles.emptyState}>
            <p>Loading your cart...</p>
          </section>
        ) : items.length > 0 ? (
          <div className={styles.cartLayout}>
            <section className={styles.itemsSection} aria-label="Cart items">
              <div className={styles.tableHeader}>
                <span>Product</span>
                <span>Unit Price</span>
                <span>Quantity</span>
                <span>Subtotal</span>
              </div>
              <div className={styles.itemList}>
                {items.map((item) => (
                  <article className={styles.itemCard} key={item.id}>
                    <div className={styles.product}>
                      {item.product.image ? (
                        <Image
                          className={styles.productImage}
                          src={getApiImageUrl(item.product.image)!}
                          alt={item.product.name}
                          width={84}
                          height={84}
                          unoptimized
                        />
                      ) : (
                        <div className={styles.imagePlaceholder} aria-hidden="true">
                          🥬
                        </div>
                      )}
                      <div className={styles.productName}>
                        <h2>{item.product.name}</h2>
                        <p>Per {item.product.unit_value || item.product.unit}</p>
                      </div>
                    </div>
                    <span className={styles.unitPrice}>{formatPrice(
                      Number(item.product.discount_price ?? item.product.price)
                    )}</span>
                    <div className={styles.quantity} aria-label={`${item.product.name} quantity`}>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item, -1)}
                        aria-label={`Decrease ${item.product.name} quantity`}
                        disabled={updatingItemIds.includes(item.id)}
                      >
                        −
                      </button>
                      <span aria-live="polite">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item, 1)}
                        aria-label={`Increase ${item.product.name} quantity`}
                        disabled={updatingItemIds.includes(item.id) || item.qty >= item.product.stock}
                      >
                        +
                      </button>
                    </div>
                    <div className={styles.subtotal}>
                      <strong>{formatPrice(item.subtotal)}</strong>
                      <button type="button" onClick={() => removeItem(item.id)}>
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <aside className={styles.summary} aria-labelledby="summary-title">
              <h2 id="summary-title">Order Summary</h2>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryRow}>
                <span>Items Subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Estimated Delivery</span>
                <strong className={styles.free}>{deliveryFee === 0 ? "FREE" : formatPrice(deliveryFee)}</strong>
              </div>
              <p className={styles.deliveryNote}>
                <span aria-hidden="true">🎉</span>
                {deliveryFee === 0
                  ? " You unlocked FREE Delivery!"
                  : ` Delivery charge: ${formatPrice(deliveryFee)}`}
              </p>
              <div className={styles.deliveryProgressBox}>
                <p className={styles.deliveryProgressText}>
                  {remainingForFreeDelivery === 0 ? (
                    <strong>Free delivery unlocked!</strong>
                  ) : (
                    <>Add <strong>{formatPrice(remainingForFreeDelivery)}</strong> more for free delivery</>
                  )}
                </p>
                <div
                  className={styles.deliveryProgressTrack}
                  role="progressbar"
                  aria-label="Progress towards free delivery"
                  aria-valuemin={0}
                  aria-valuemax={FREE_DELIVERY_THRESHOLD}
                  aria-valuenow={Math.min(subtotal, FREE_DELIVERY_THRESHOLD)}
                >
                  <div
                    className={styles.deliveryProgressFill}
                    style={{ width: `${freeDeliveryProgress}%` }}
                  />
                </div>
                <div className={styles.deliveryProgressLabels}>
                  <span>₹0</span>
                  <span>₹500 FREE</span>
                </div>
              </div>
              <div className={styles.summaryRow}>
                <span>Discount / Savings</span>
                <strong className={styles.savings}>−₹0.00</strong>
              </div>
              <div className={styles.summaryDivider} />
              <div className={`${styles.summaryRow} ${styles.grandTotal}`}>
                <strong>Grand Total</strong>
                <div>
                  <strong>{formatPrice(grandTotal)}</strong>
                  <small>Includes all applicable taxes</small>
                </div>
              </div>
              <button
                className={styles.checkoutButton}
                type="button"
                onClick={handleCheckout}
                disabled={placingOrder}
              >
                {placingOrder ? "Placing Order..." : <>Proceed to Checkout <span aria-hidden="true">→</span></>}
              </button>
              <p className={styles.secureNote}>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 2.5 16 5v4.3c0 3.6-2.5 6.4-6 8.2-3.5-1.8-6-4.6-6-8.2V5l6-2.5Z" />
                  <path d="m7.7 9.8 1.5 1.5 3.2-3.2" />
                </svg>
                Safe &amp; Secure Checkout
              </p>
            </aside>
          </div>
        ) : (
          <section className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">🛒</span>
            <h2>Your cart is waiting for something fresh</h2>
            <p>Browse the market and add your favorite fresh finds.</p>
            <Link href="/" className={styles.emptyButton}>Start Shopping</Link>
          </section>
        )}
      </div>

      <footer className={styles.footer}>
        © 2026 DailyFresh-Market. All rights reserved. Fresh produce delivered daily.
      </footer>
    </main>
  );
}
