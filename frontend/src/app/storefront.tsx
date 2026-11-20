"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import styles from "./storefront.module.css";
import {
  ApiCart,
  addApiCartItem,
  clearApiCart,
  fetchApiCart,
  getAccessToken,
  isAuthenticated,
  logout,
  subscribeToAuth,
} from "./cartApi";

type Product = {
  id: number;
  name: string;
  category: string;
  categorySlug?: string;
  description?: string;
  price: number;
  originalPrice: number;
  unit: string;
  image: string | null;
  stock?: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
};

type StorefrontProps = {
  categoryPage?: boolean;
  initialCategory?: string;
  productId?: number;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
};

type ProductApiItem = {
  id: number;
  name: string;
  description: string;
  price: string | number;
  discount_price: string | number | null;
  unit_value: string;
  image: string | null;
  stock: number;
  is_available: boolean;
  is_featured: boolean;
  category_name: string;
  category_slug: string;
};

type CartItem = Product & { qty: number };

const CART_STORAGE_KEY = "df_cart";
const CART_EVENT = "dailyfresh-cart-change";
const CATEGORY_ICONS: Record<string, string> = {
  "fresh-vegetables": "🥕",
  "dairy-eggs": "🥛",
  "fresh-fruits": "🍎",
  beverages: "☕",
  munchies: "🍿",
  household: "⌂",
};
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");
const CATEGORY_API_URL = `${API_BASE_URL}/api/category/`;
const PRODUCT_API_URL = `${API_BASE_URL}/api/products/`;
const PRODUCT_SEARCH_API_URL = `${API_BASE_URL}/api/products/search/`;

function isCategoryList(value: unknown): value is Category[] {
  return (
    Array.isArray(value) &&
    value.every(
      (category) =>
        typeof category === "object" &&
        category !== null &&
        "id" in category &&
        typeof category.id === "number" &&
        "name" in category &&
        typeof category.name === "string" &&
        "slug" in category &&
        typeof category.slug === "string" &&
        "description" in category &&
        typeof category.description === "string" &&
        "is_active" in category &&
        typeof category.is_active === "boolean",
    )
  );
}

function isProductApiItem(value: unknown): value is ProductApiItem {
  if (typeof value !== "object" || value === null) return false;
  if (
    !("id" in value) ||
    typeof value.id !== "number" ||
    !("name" in value) ||
    typeof value.name !== "string" ||
    !("description" in value) ||
    typeof value.description !== "string" ||
    !("price" in value) ||
    !(typeof value.price === "string" || typeof value.price === "number") ||
    !Number.isFinite(Number(value.price)) ||
    !("discount_price" in value) ||
    !(
      value.discount_price === null ||
      typeof value.discount_price === "string" ||
      typeof value.discount_price === "number"
    ) ||
    (value.discount_price !== null &&
      !Number.isFinite(Number(value.discount_price))) ||
    !("unit_value" in value) ||
    typeof value.unit_value !== "string" ||
    !("image" in value) ||
    !(value.image === null || typeof value.image === "string") ||
    !("stock" in value) ||
    typeof value.stock !== "number" ||
    !Number.isInteger(value.stock) ||
    !("is_available" in value) ||
    typeof value.is_available !== "boolean" ||
    !("is_featured" in value) ||
    typeof value.is_featured !== "boolean" ||
    !("category_name" in value) ||
    typeof value.category_name !== "string" ||
    !("category_slug" in value) ||
    typeof value.category_slug !== "string"
  ) {
    return false;
  }
  return true;
}

function isProductListResponse(
  value: unknown,
): value is { Message: string; data: ProductApiItem[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "Message" in value &&
    typeof value.Message === "string" &&
    "data" in value &&
    Array.isArray(value.data) &&
    value.data.every(isProductApiItem)
  );
}

function isProductDetailResponse(
  value: unknown,
): value is { Message: string; data: ProductApiItem } {
  return (
    typeof value === "object" &&
    value !== null &&
    "Message" in value &&
    typeof value.Message === "string" &&
    "data" in value &&
    isProductApiItem(value.data)
  );
}

function toProduct(product: ProductApiItem): Product {
  const originalPrice = Number(product.price);
  const discountPrice =
    product.discount_price === null ? null : Number(product.discount_price);

  return {
    id: product.id,
    name: product.name,
    category: product.category_name,
    categorySlug: product.category_slug,
    description: product.description,
    price: discountPrice ?? originalPrice,
    originalPrice,
    unit: product.unit_value,
    image: product.image
      ? new URL(product.image, `${API_BASE_URL}/`).toString()
      : null,
    stock: product.stock,
    isAvailable: product.is_available,
    isFeatured: product.is_featured,
  };
}

function subscribeToCart(onChange: () => void) {
  window.addEventListener(CART_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CART_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getCartSnapshot() {
  try {
    return localStorage.getItem(CART_STORAGE_KEY) ?? "[]";
  } catch {
    return '{"storageError":true}';
  }
}

function getServerCartSnapshot() {
  return "[]";
}

function isCartItem(value: unknown): value is CartItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "category" in value &&
    typeof value.category === "string" &&
    "price" in value &&
    typeof value.price === "number" &&
    "originalPrice" in value &&
    typeof value.originalPrice === "number" &&
    "unit" in value &&
    typeof value.unit === "string" &&
    "image" in value &&
    (typeof value.image === "string" || value.image === null) &&
    "qty" in value &&
    typeof value.qty === "number" &&
    Number.isInteger(value.qty) &&
    value.qty > 0
  );
}

function isCart(value: unknown): value is CartItem[] {
  return Array.isArray(value) && value.every(isCartItem);
}

function readCart(snapshot: string, products: Product[]) {
  try {
    const stored: unknown = JSON.parse(snapshot);
    if (
      typeof stored === "object" &&
      stored !== null &&
      "storageError" in stored &&
      stored.storageError === true
    ) {
      return {
        cart: [] as CartItem[],
        error: "Basket storage is not available in this browser.",
      };
    }
    if (!isCart(stored)) {
      return {
        cart: [] as CartItem[],
        error: "Saved basket data is invalid.",
      };
    }
    const cart = stored.map((item) => {
      const product = products.find((entry) => entry.id === item.id) ?? item;
      return { ...product, qty: item.qty };
    });
    return { cart, error: "" };
  } catch {
    return {
      cart: [] as CartItem[],
      error: "Saved basket data could not be read.",
    };
  }
}

export default function Storefront({
  categoryPage = false,
  initialCategory = "all",
  productId,
}: StorefrontProps) {
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    const updateAuth = () => setAuthenticated(isAuthenticated());
    updateAuth();
    return subscribeToAuth(updateAuth);
  }, []);

  const cartSnapshot = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [apiCart, setApiCart] = useState<ApiCart | null>(null);
  const [addingProductIds, setAddingProductIds] = useState<number[]>([]);
  const [writeError, setWriteError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [productRetry, setProductRetry] = useState(0);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchRetry, setSearchRetry] = useState(0);
  const [sortOrder, setSortOrder] = useState("relevance");
  const activeCategory =
    categories.find((category) => category.slug === initialCategory)?.name ??
    "All";
  const { cart, error: readError } = useMemo(
    () => readCart(cartSnapshot, products),
    [cartSnapshot, products],
  );

  useEffect(() => {
    if (productId !== undefined) return;

    const controller = new AbortController();

    async function loadCategories() {
      setCategoriesLoading(true);
      setCategoriesError("");
      try {
        const response = await fetch(CATEGORY_API_URL, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Category request failed (HTTP ${response.status}).`);
        }
        const payload: unknown = await response.json();
        if (!isCategoryList(payload)) {
          throw new Error("Category API returned data in an unexpected format.");
        }
        setCategories(payload.filter((category) => category.is_active));
      } catch (error) {
        if (controller.signal.aborted) return;
        setCategoriesError(
          error instanceof Error && error.message.startsWith("Category")
            ? error.message
            : "Could not connect to the category API. Check that the backend is running and allows frontend requests.",
        );
      } finally {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      }
    }

    void loadCategories();
    return () => controller.abort();
  }, [categoryRetry, productId]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setProductsLoading(true);
      setProductsError("");
      setProducts([]);
      try {
        if (productId !== undefined) {
          const response = await fetch(`${PRODUCT_API_URL}${productId}/`, {
            signal: controller.signal,
            cache: "no-store",
          });
          if (!response.ok) {
            throw new Error(`Product request failed (HTTP ${response.status}).`);
          }
          const payload: unknown = await response.json();
          if (!isProductDetailResponse(payload)) {
            throw new Error("Product API returned data in an unexpected format.");
          }
          setProducts([toProduct(payload.data)]);
          setSelectedQuantity(1);
          return;
        }

        const url = new URL(PRODUCT_API_URL);
        if (initialCategory !== "all") {
          url.searchParams.set("category", initialCategory);
        }
        const response = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Product request failed (HTTP ${response.status}).`);
        }
        const payload: unknown = await response.json();
        if (!isProductListResponse(payload)) {
          throw new Error("Product API returned data in an unexpected format.");
        }
        setProducts(payload.data.map(toProduct));
      } catch (error) {
        if (controller.signal.aborted) return;
        setProductsError(
          error instanceof Error && error.message.startsWith("Product")
            ? error.message
            : "Could not connect to the product API. Check that the backend is running and allows frontend requests.",
        );
      } finally {
        if (!controller.signal.aborted) setProductsLoading(false);
      }
    }

    void loadProducts();
    return () => controller.abort();
  }, [initialCategory, productId, productRetry]);

  useEffect(() => {
    const query = search.trim();
    if (!query || productId !== undefined) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError("");
    setSearchResults([]);
    const timer = window.setTimeout(() => {
      async function searchProducts() {
        setSearchLoading(true);
        setSearchError("");
        try {
          const url = new URL(PRODUCT_SEARCH_API_URL);
          url.searchParams.set("search", query);
          const response = await fetch(url, {
            signal: controller.signal,
            cache: "no-store",
          });
          if (!response.ok) {
            throw new Error(`Search request failed (HTTP ${response.status}).`);
          }
          const payload: unknown = await response.json();
          if (
            !Array.isArray(payload) ||
            !payload.every(isProductApiItem)
          ) {
            throw new Error("Search API returned data in an unexpected format.");
          }
          setSearchResults(payload.map(toProduct));
        } catch (error) {
          if (controller.signal.aborted) return;
          setSearchResults([]);
          setSearchError(
            error instanceof Error && error.message.startsWith("Search")
              ? error.message
              : "Could not search products. Check that the backend is running.",
          );
        } finally {
          if (!controller.signal.aborted) setSearchLoading(false);
        }
      }

      void searchProducts();
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, productId, searchRetry]);

  useEffect(() => {
    if (!getAccessToken()) return;
    void fetchApiCart()
      .then((cart) => setApiCart(cart))
      .catch(() => setApiCart(null));
  }, []);

  useEffect(() => {
    if (!cartOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setCartOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [cartOpen]);

  const totalItems = getAccessToken() && apiCart
    ? apiCart.items.reduce((total, item) => total + item.qty, 0)
    : cart.reduce((total, item) => total + item.qty, 0);
  const grandTotal = getAccessToken() && apiCart
    ? apiCart.pricing.grand_total
    : cart.reduce((total, item) => total + item.price * item.qty, 0);
  const isSearching = search.trim().length > 0;
  const effectiveProductsLoading = isSearching ? searchLoading : productsLoading;
  const effectiveProductsError = isSearching ? searchError : productsError;
  const visibleProducts = isSearching ? searchResults : products;
  const sortedProducts = [...visibleProducts].sort((first, second) => {
    if (sortOrder === "price-low") return first.price - second.price;
    if (sortOrder === "price-high") return second.price - first.price;
    return first.id - second.id;
  });

  function saveCart(updatedCart: CartItem[]) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
      window.dispatchEvent(new Event(CART_EVENT));
      setWriteError("");
    } catch {
      setWriteError("Basket changes could not be saved in this browser.");
    }
  }

  async function addToCart(productId: number, quantity = 1) {
    const product = products.find((item) => item.id === productId);
    if (!product || product.isAvailable === false || quantity < 1) return;

    if (getAccessToken()) {
      if (apiCart?.items.some((item) => item.product.id === productId) || addingProductIds.includes(productId)) return;
      setAddingProductIds((ids) => [...ids, productId]);
      try {
        await addApiCartItem(productId, quantity);
        setApiCart(await fetchApiCart());
        setWriteError("");
        window.dispatchEvent(new Event(CART_EVENT));
      } catch (error) {
        setWriteError(error instanceof Error ? error.message : "Could not add item to cart.");
      } finally {
        setAddingProductIds((ids) => ids.filter((id) => id !== productId));
      }
      return;
    }

    if (cart.some((item) => item.id === productId)) return;
    const quantityToAdd =
      product.stock === undefined
        ? quantity
        : Math.min(quantity, Math.max(0, product.stock));
    if (quantityToAdd === 0) return;
    const updated = [...cart, { ...product, qty: quantityToAdd }];
    saveCart(updated);
  }

  function isProductInCart(productId: number) {
    if (getAccessToken()) {
      return apiCart?.items.some((item) => item.product.id === productId) ?? false;
    }
    return cart.some((item) => item.id === productId);
  }

  async function placeOrder() {
    if (getAccessToken()) {
      try {
        await clearApiCart();
        setApiCart(await fetchApiCart());
        setWriteError("");
        window.alert("Order placed successfully!");
        setCartOpen(false);
      } catch (error) {
        setWriteError(error instanceof Error ? error.message : "The basket could not be cleared.");
      }
      return;
    }

    window.alert("Order placed successfully!");
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      window.dispatchEvent(new Event(CART_EVENT));
      setWriteError("");
      setCartOpen(false);
    } catch {
      setWriteError("The basket could not be cleared from this browser.");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.offerBar}>
        <span aria-hidden="true">🌿</span>
        Get Free Express Delivery on orders above ₹499! Use code:
        <span><strong>FRESH50</strong></span>
      </div>

      <header className={styles.header}>
        <a className={styles.brand} href="/index" aria-label="DailyFresh home">
          <span className={styles.brandIcon} aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M7 22.5c0-8.6 7.1-15.3 18-16-1 10.9-7.4 18-16 18" />
              <path d="M8 25c3.4-5.5 7.6-9.8 13-13" />
            </svg>
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>Daily<span>Fresh</span></span>
            <small>ESSENTIALS HUB</small>
          </span>
        </a>
        <label className={styles.searchBox}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            aria-label="Search products"
            placeholder="Search vegetables, dairy, snacks..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className={styles.searchShortcut} aria-hidden="true">/</span>
        </label>
        <nav className={styles.navigation} aria-label="Main navigation">
          <a
            className={styles.navLink}
            href={categoryPage || productId !== undefined ? "/categories" : "#featured"}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="2" />
              <rect x="14" y="3" width="7" height="7" rx="2" />
              <rect x="3" y="14" width="7" height="7" rx="2" />
              <rect x="14" y="14" width="7" height="7" rx="2" />
            </svg>
            Shop All
          </a>
          {!authenticated && (
            <>
              <Link className={styles.loginLink} href="/login">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.2" />
                  <path d="M5.5 20v-1.6a6.5 6.5 0 0 1 13 0V20" />
                </svg>
                Login
              </Link>
              <Link className={styles.registerLink} href="/register">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3 20v-1.5A5.5 5.5 0 0 1 8.5 13h1A5.5 5.5 0 0 1 15 18.5V20M18 8v6M15 11h6" />
                </svg>
                Register
              </Link>
            </>
          )}
          {authenticated && (
            <Link className={styles.profileLink} href="/profile">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="3.2" />
                <path d="M5.5 20v-1.6a6.5 6.5 0 0 1 13 0V20" />
              </svg>
              Profile
            </Link>
          )}
          <Link className={styles.ordersLink} href="/orders">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 4h14v16H5zM8 2v4M16 2v4M8 10h8M8 14h8M8 18h5" />
            </svg>
            My Orders
          </Link>
          <button
            id="cartBtn"
            className={styles.cartButton}
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Open cart, ${totalItems} items`}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 8h14l-1 12H6L5 8Z" />
              <path d="M9 9V6a3 3 0 0 1 6 0v3" />
            </svg>
            <span>Cart</span>
            <span id="cartBadge" className={styles.cartBadge} aria-live="polite">
              {totalItems}
            </span>
          </button>
          {authenticated && (
            <button
              className={styles.logoutLink}
              type="button"
              onClick={() => void logout()}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
                <path d="M14 8l4 4-4 4M18 12H8" />
              </svg>
              Logout
            </button>
          )}
        </nav>
      </header>

      {(readError || writeError) && (
        <p className={styles.storageError} role="alert">
          {readError || writeError}
        </p>
      )}

      <div className={`${styles.mainContent} ${categoryPage ? styles.catalogMainContent : ""}`}>
        {productId !== undefined ? (
          <section className={styles.productDetailPage}>
            {productsLoading ? (
              <p className={styles.categoryStatus}>Loading product…</p>
            ) : productsError ? (
              <div className={styles.categoryError} role="alert">
                <p>{productsError}</p>
                <button type="button" onClick={() => setProductRetry((retry) => retry + 1)}>
                  Try again
                </button>
              </div>
            ) : products[0] ? (
              <>
                <Link
                  className={styles.productDetailBack}
                  href={`/categories/${products[0].categorySlug ?? ""}`}
                >
                  <span aria-hidden="true">←</span>
                  Back to {products[0].category}
                </Link>
                <article className={styles.productDetailCard}>
                  <div className={styles.productDetailImageWrap}>
                    {products[0].image ? (
                      <Image
                        className={styles.productDetailImage}
                        src={products[0].image}
                        alt={products[0].name}
                        width={900}
                        height={900}
                        sizes="(max-width: 760px) 100vw, 42vw"
                        unoptimized
                      />
                    ) : (
                      <div className={styles.productDetailImagePlaceholder} aria-hidden="true">
                        {CATEGORY_ICONS[products[0].categorySlug ?? ""] ?? "◉"}
                      </div>
                    )}
                    <span className={styles.deliveryBadge}>⚡ 15 MINS DELIVERY</span>
                  </div>
                  <div className={styles.productDetailInfo}>
                    <span className={styles.productDetailCategory}>
                      {products[0].category}
                    </span>
                    {products[0].isFeatured && (
                      <span className={styles.productFeatured}>Featured</span>
                    )}
                    <h1>{products[0].name}</h1>
                    <p className={styles.productDetailUnit}>
                      Pack size: {products[0].unit}
                    </p>
                    <div className={styles.productDetailPrice}>
                      <strong>₹{products[0].price}</strong>
                      {products[0].originalPrice > products[0].price && (
                        <del>₹{products[0].originalPrice}</del>
                      )}
                      {products[0].originalPrice > products[0].price && (
                        <span className={styles.productDiscount}>
                          {Math.round(
                            ((products[0].originalPrice - products[0].price) /
                              products[0].originalPrice) *
                              100,
                          )}
                          % OFF
                        </span>
                      )}
                      <span>Inclusive of all taxes</span>
                    </div>
                    <div
                      className={`${styles.productStock} ${products[0].isAvailable && (products[0].stock ?? 0) > 0 ? styles.productInStock : styles.productOutOfStock}`}
                      role="status"
                    >
                      <span className={styles.stockIndicator} aria-hidden="true" />
                      {products[0].isAvailable && (products[0].stock ?? 0) > 0
                        ? `${products[0].stock} in stock`
                        : "Currently out of stock"}
                    </div>
                    <div className={styles.productPromises}>
                      <div>
                        <span aria-hidden="true">✓</span>
                        <p><strong>Quality checked</strong><small>Fresh and carefully selected</small></p>
                      </div>
                      <div>
                        <span aria-hidden="true">⚡</span>
                        <p><strong>Express delivery</strong><small>Delivered to your doorstep</small></p>
                      </div>
                    </div>
                    <div className={styles.productDescription}>
                      <h2>Product description</h2>
                      <p>{products[0].description || "No description available."}</p>
                    </div>
                    <div className={styles.productDetailActions}>
                      <div className={styles.quantityPicker}>
                        <span>Quantity</span>
                        <div className={styles.quantityControl} aria-label="Product quantity">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => setSelectedQuantity((quantity) => Math.max(1, quantity - 1))}
                          disabled={selectedQuantity <= 1}
                        >
                          −
                        </button>
                        <span aria-live="polite">{selectedQuantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() =>
                            setSelectedQuantity((quantity) =>
                              Math.min(products[0].stock ?? quantity + 1, quantity + 1),
                            )
                          }
                          disabled={
                            !products[0].isAvailable ||
                            (products[0].stock ?? 0) <= selectedQuantity
                          }
                        >
                          +
                        </button>
                        </div>
                      </div>
                      <button
                        className={`${styles.productDetailAddButton} ${isProductInCart(products[0].id) ? styles.inCart : ""}`}
                        type="button"
                        onClick={() => {
                          if (!isProductInCart(products[0].id)) void addToCart(products[0].id, selectedQuantity);
                        }}
                        disabled={!products[0].isAvailable || (products[0].stock ?? 0) < 1 || isProductInCart(products[0].id) || addingProductIds.includes(products[0].id)}
                      >
                        {isProductInCart(products[0].id) ? (
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L21 8H6" />
                            <path d="M9 11l2 2 4-5" /><circle cx="10" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4 8h16l-1.2 12H5.2L4 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" />
                          </svg>
                        )}
                        {isProductInCart(products[0].id) ? "In cart" : `Add ${selectedQuantity > 1 ? `${selectedQuantity} to` : "to"} basket`}
                      </button>
                    </div>
                  </div>
                </article>
              </>
            ) : (
              <p className={styles.noProducts}>Product not found.</p>
            )}
          </section>
        ) : categoryPage ? (
          <section className={styles.catalogLayout} id="featured">
            <aside className={styles.categorySidebar} aria-label="Product categories">
              <h2>CATEGORIES</h2>
              <Link
                className={`${styles.sidebarCategory} ${activeCategory === "All" ? styles.sidebarCategorySelected : ""}`}
                href="/categories"
                aria-current={activeCategory === "All" ? "page" : undefined}
              >
                <span className={styles.sidebarIcon} aria-hidden="true">▦</span>
                <span>All Categories</span>
              </Link>
              {categories.map((category) => (
                <Link
                  className={`${styles.sidebarCategory} ${activeCategory === category.name ? styles.sidebarCategorySelected : ""}`}
                  key={category.name}
                  href={`/categories/${category.slug}`}
                  aria-current={activeCategory === category.name ? "page" : undefined}
                >
                  <span className={styles.sidebarIcon} aria-hidden="true">{CATEGORY_ICONS[category.slug] ?? "◉"}</span>
                  <span>{category.name}</span>
                </Link>
              ))}
              {categoriesLoading && (
                <p className={styles.categoryStatus}>Loading categories…</p>
              )}
              {categoriesError && (
                <div className={styles.categoryError} role="alert">
                  <p>{categoriesError}</p>
                  <button type="button" onClick={() => setCategoryRetry((retry) => retry + 1)}>
                    Try again
                  </button>
                </div>
              )}
            </aside>

            <section className={styles.catalogProducts} aria-labelledby="catalog-title">
              <div className={styles.catalogHeading}>
                <div>
                  <h1 id="catalog-title">{activeCategory === "All" ? "All Categories" : activeCategory}</h1>
                  <p>{visibleProducts.length} items available</p>
                </div>
                <label className={styles.sortControl}>
                  <span className={styles.visuallyHidden}>Sort products</span>
                  <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                    <option value="relevance">Relevance</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </label>
              </div>
              {effectiveProductsLoading ? (
                <p className={styles.categoryStatus}>Loading products…</p>
              ) : effectiveProductsError ? (
                <div className={styles.categoryError} role="alert">
                  <p>{effectiveProductsError}</p>
                  <button
                    type="button"
                    onClick={() =>
                      isSearching
                        ? setSearchRetry((retry) => retry + 1)
                        : setProductRetry((retry) => retry + 1)
                    }
                  >
                    Try again
                  </button>
                </div>
              ) : sortedProducts.length > 0 ? (
                <div className={styles.catalogGrid}>
                  {sortedProducts.map((product) => (
                    <article className={styles.catalogCard} key={product.id}>
                      <Link
                        className={styles.productDetailImageLink}
                        href={`/products/${product.id}`}
                        aria-label={`View ${product.name}`}
                      >
                        <div className={styles.catalogImageWrap}>
                          {product.image ? (
                            <Image
                              className={styles.catalogImage}
                              src={product.image}
                              alt={product.name}
                              width={600}
                              height={400}
                              sizes="(max-width: 560px) 50vw, (max-width: 900px) 33vw, 25vw"
                              unoptimized
                            />
                          ) : (
                            <div className={styles.catalogImagePlaceholder} aria-hidden="true">
                              {CATEGORY_ICONS[product.categorySlug ?? ""] ?? "◉"}
                            </div>
                          )}
                          <span className={styles.deliveryBadge}>15 MINS</span>
                        </div>
                      </Link>
                      <Link className={styles.productDetailNameLink} href={`/products/${product.id}`}>
                        <h2>{product.name}</h2>
                      </Link>
                      <p className={styles.catalogUnit}>{product.unit}</p>
                      <div className={styles.catalogFooter}>
                        <div className={styles.price}>
                          <strong>₹{product.price}</strong>
                          {product.originalPrice > product.price && (
                            <del>₹{product.originalPrice}</del>
                          )}
                        </div>
                        <button
                          className={`${styles.catalogAddButton} ${isProductInCart(product.id) ? styles.inCart : ""}`}
                          type="button"
                          onClick={() => {
                            if (!isProductInCart(product.id)) void addToCart(product.id);
                          }}
                          disabled={addingProductIds.includes(product.id)}
                          aria-label={isProductInCart(product.id) ? `${product.name} is in cart` : `Add ${product.name} to basket`}
                        >
                          {isProductInCart(product.id) ? (
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L21 8H6" />
                              <circle cx="10" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" />
                              <path d="M9 11l2 2 4-5" />
                            </svg>
                          ) : "ADD"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className={styles.noProducts}>No products found. Try another search or category.</p>
              )}
            </section>
          </section>
        ) : (
          <>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.heroBadge}><span aria-hidden="true">✳</span> FARM FRESH GUARANTEE</span>
            <h1>Fresh Grocery &amp; Daily<br />Needs Delivered in <em>15 Mins</em></h1>
            <p>Experience peak freshness with handpicked vegetables, organic dairy, household staples, and quick snacks.</p>
            <div className={styles.heroActions}>
              <a href="#featured" className={styles.primaryButton}>Order Fresh Now <span aria-hidden="true">→</span></a>
              <a href="#categories" className={styles.secondaryButton}>Explore Categories</a>
            </div>
          </div>
          <div className={styles.heroImage}>
            <Image
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85"
              alt="Fresh vegetables at the market"
              fill
              priority
              sizes="(max-width: 700px) 100vw, 45vw"
            />
          </div>
        </section>

        <section className={styles.categoriesSection} id="categories">
          <div className={styles.sectionTitleRow}>
            <div>
              <h2>Explore Categories</h2>
              <p>Shop your daily needs by department</p>
            </div>
            <Link className={styles.textLink} href="/categories">
              View All <span aria-hidden="true">›</span>
            </Link>
          </div>
          <div className={styles.categoryGrid}>
            {categories.map((category) => (
              <Link
                className={`${styles.categoryCard} ${activeCategory === category.name ? styles.categorySelected : ""}`}
                key={category.name}
                href={`/categories/${category.slug}`}
              >
                <span className={styles.categoryIcon} aria-hidden="true">{CATEGORY_ICONS[category.slug] ?? "◉"}</span>
                <span>{category.name}</span>
              </Link>
            ))}
          </div>
          {categoriesLoading && (
            <p className={styles.categoryStatus}>Loading categories…</p>
          )}
          {categoriesError && (
            <div className={styles.categoryError} role="alert">
              <p>{categoriesError}</p>
              <button type="button" onClick={() => setCategoryRetry((retry) => retry + 1)}>
                Try again
              </button>
            </div>
          )}
          </section>

        <section className={styles.products} id="featured" aria-labelledby="products-title">
          <div className={styles.sectionTitleRow}>
            <div>
              <h2 id="products-title">Popular Fresh Essentials</h2>
              <p>Top-picked daily items with the best market rates</p>
            </div>
            <a className={styles.textLink} href="#categories">See Catalog <span aria-hidden="true">→</span></a>
          </div>
          <div id="featuredProducts" className={styles.productGrid}>
            {effectiveProductsLoading ? (
              <p className={styles.categoryStatus}>Loading products…</p>
            ) : effectiveProductsError ? (
              <div className={styles.categoryError} role="alert">
                <p>{effectiveProductsError}</p>
                <button
                  type="button"
                  onClick={() =>
                    isSearching
                      ? setSearchRetry((retry) => retry + 1)
                      : setProductRetry((retry) => retry + 1)
                  }
                >
                  Try again
                </button>
              </div>
            ) : sortedProducts.map((product) => (
              <article className={styles.productCard} key={product.id}>
                <Link
                  className={styles.productDetailImageLink}
                  href={`/products/${product.id}`}
                  aria-label={`View ${product.name}`}
                >
                  {product.image ? (
                    <Image
                      className={styles.productImage}
                      src={product.image}
                      alt={product.name}
                      width={600}
                      height={400}
                      sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <div className={styles.productImagePlaceholder} aria-hidden="true">
                      {CATEGORY_ICONS[product.categorySlug ?? ""] ?? "◉"}
                    </div>
                  )}
                </Link>
                <span className={styles.category}>{product.category}</span>
                <Link className={styles.productDetailNameLink} href={`/products/${product.id}`}>
                  <h2>{product.name}</h2>
                </Link>
                <p className={styles.unit}>{product.unit}</p>
                <div className={styles.productFooter}>
                  <div className={styles.price}>
                    <strong>₹{product.price}</strong>
                    {product.originalPrice > product.price && (
                      <del>₹{product.originalPrice}</del>
                    )}
                  </div>
                  <button
                    className={`${styles.addButton} ${isProductInCart(product.id) ? styles.inCart : ""}`}
                    type="button"
                    onClick={() => {
                      if (!isProductInCart(product.id)) void addToCart(product.id);
                    }}
                    disabled={addingProductIds.includes(product.id)}
                    aria-label={isProductInCart(product.id) ? `${product.name} is in cart` : `Add ${product.name} to cart`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      {isProductInCart(product.id) ? (
                        <>
                          <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L21 8H6" />
                          <circle cx="10" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" />
                          <path d="M9 11l2 2 4-5" />
                        </>
                      ) : <path d="M12 5v14M5 12h14" />}
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!effectiveProductsLoading && !effectiveProductsError && sortedProducts.length === 0 && (
            <p className={styles.noProducts}>
              {isSearching ? "No products found for your search." : "No products found in this category."}
            </p>
          )}
        </section>
          </>
        )}
      </div>

      <footer className={styles.footer} id="footer">
        <div className={styles.footerInner}>
          <div className={styles.footerAbout}>
            <a className={styles.footerBrand} href="/index"><span aria-hidden="true">✿</span> DailyFresh</a>
            <p>Your trusted partner for 100% farm-fresh veggies, dairy, and household essentials delivered right to your doorstep.</p>
          </div>
          <div className={styles.footerColumn}>
            <h2>QUICK LINKS</h2>
            <a href="#featured">All Products</a>
            <Link href="/login">Account Login</Link>
            <Link href="/register">Create Account</Link>
          </div>
          <div className={styles.footerColumn}>
            <h2>SUPPORT</h2>
            <a href="#footer">Help Center</a>
            <a href="#footer">Terms of Service</a>
            <a href="#footer">Privacy Policy</a>
          </div>
          <div className={styles.footerColumn}>
            <h2>CONTACT US</h2>
            <p>123 Market Road, Bengaluru, India</p>
            <a className={styles.emailLink} href="mailto:support@dailyfresh.in">support@dailyfresh.in</a>
          </div>
        </div>
        <div className={styles.copyright}>© 2026 DailyFresh. All rights reserved.</div>
      </footer>

      {cartOpen && (
        <div className={styles.drawerLayer}>
          <button
            className={styles.backdrop}
            type="button"
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
          />
          <aside
            id="cartDrawer"
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
          >
            <header className={styles.drawerHeader}>
              <h2 id="cart-title">Your Cart</h2>
              <button
                id="closeCartBtn"
                className={styles.closeButton}
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </header>

            <div id="cartItemsContainer" className={styles.cartItems}>
              {getAccessToken() && apiCart ? (
                apiCart.items.length === 0 ? (
                  <p className={styles.emptyCart}>Your basket is empty!</p>
                ) : (
                  apiCart.items.map((item) => (
                    <div className={styles.cartItem} key={item.id}>
                      <div>
                        <h3>{item.product.name}</h3>
                        <span>
                          ₹{Number(item.product.discount_price ?? item.product.price)} x {item.qty}
                        </span>
                      </div>
                      <strong>₹{item.subtotal}</strong>
                    </div>
                  ))
                )
              ) : cart.length === 0 ? (
                <p className={styles.emptyCart}>Your basket is empty!</p>
              ) : (
                cart.map((item) => (
                  <div className={styles.cartItem} key={item.id}>
                    <div>
                      <h3>{item.name}</h3>
                      <span>₹{item.price} x {item.qty}</span>
                    </div>
                    <strong>₹{item.price * item.qty}</strong>
                  </div>
                ))
              )}
            </div>

            <footer className={styles.drawerFooter}>
              <div className={styles.totalRow}>
                <span>Subtotal</span>
                <strong id="cartSubtotal">₹{grandTotal}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>Total</span>
                <strong id="cartTotal">₹{grandTotal}</strong>
              </div>
              <button
                className={styles.checkoutButton}
                type="button"
                disabled={getAccessToken() ? !apiCart || apiCart.items.length === 0 : cart.length === 0}
                onClick={placeOrder}
              >
                Place order
              </button>
              <Link className={styles.textLink} href="/cart">
                View full cart <span aria-hidden="true">→</span>
              </Link>
            </footer>
          </aside>
        </div>
      )}
    </main>
  );
}
