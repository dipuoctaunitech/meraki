import { ProductDetailPage } from "@/components/ProductDetailPage";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  return <ProductDetailPage id={id} />;
}
