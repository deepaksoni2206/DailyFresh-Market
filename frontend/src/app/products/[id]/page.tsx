import { notFound } from "next/navigation";
import Storefront from "../../storefront";

export const instant = false;

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isSafeInteger(productId) || productId < 1) {
    notFound();
  }

  return <Storefront productId={productId} />;
}
