"use client";

import { useParams } from "next/navigation";
import BrandDeepInsight from "../../../components/BrandDeepInsight";

export default function BrandDetail() {
  const params = useParams();
  const brandName = decodeURIComponent(params.brandName as string);
  
  return <BrandDeepInsight brandName={brandName} />;
}
