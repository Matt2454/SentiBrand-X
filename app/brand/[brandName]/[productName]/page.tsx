import ProductInsight from '@/components/ProductInsight';

export default function ProductPage({ params }: { params: { brandName: string; productName: string } }) {
  return <ProductInsight brandName={decodeURIComponent(params.brandName)} productName={decodeURIComponent(params.productName)} />;
}
