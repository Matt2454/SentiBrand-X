import ProductInsight from '@/components/ProductInsight';

export default async function ProductPage({ params }: { params: Promise<{ brandName: string; productName: string }> }) {
  const resolvedParams = await params;
  console.log('ProductPage - params:', resolvedParams);
  console.log('ProductPage - brandName:', resolvedParams.brandName, 'productName:', resolvedParams.productName);
  
  const decodedBrandName = decodeURIComponent(resolvedParams.brandName);
  const decodedProductName = decodeURIComponent(resolvedParams.productName);
  
  console.log('ProductPage - decodedBrandName:', decodedBrandName, 'decodedProductName:', decodedProductName);
  
  return <ProductInsight brandName={decodedBrandName} productName={decodedProductName} />;
}
