import Storefront from "../../storefront";

type CategoriesPageProps = {
  params: Promise<{ category?: string[] }>;
};

export function generateStaticParams() {
  return [
    { category: [] },
    { category: ["fresh-vegetables"] },
    { category: ["vegetables"] },
    { category: ["dairy-eggs"] },
    { category: ["fresh-fruits"] },
    { category: ["beverages"] },
    { category: ["munchies"] },
    { category: ["household"] },
  ];
}

export default async function CategoriesPage({ params }: CategoriesPageProps) {
  const { category = [] } = await params;
  return <Storefront categoryPage initialCategory={category[0] ?? "all"} />;
}
