import ProductDetailClient from "./ProductDetailClient";

export default function ProductPage({ params }: { params: { id: string } }) {
  return <ProductDetailClient productId={params.id} />;
}
