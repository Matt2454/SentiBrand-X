"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Filter, ChevronDown } from "lucide-react";

interface BrandSelectorProps {
  onBrandSelect: (brand: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function BrandSelector({ 
  onBrandSelect, 
  placeholder = "Select a brand...", 
  className = "" 
}: BrandSelectorProps) {
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // ZERO FETCH on mount - no data loading until brand selection
  // Hardcoded brands from our seeding script to avoid any initial fetch
  const hardcodedBrands = [
    "Apple", "Samsung", "Nike", "Adidas", "Coca-Cola", "Pepsi", 
    "McDonald's", "Burger King", "BMW", "Mercedes", "Tesla", 
    "Toyota", "Microsoft", "Google", "Amazon", "Netflix", 
    "Disney", "Nintendo", "Sony", "Spotify"
  ];

  // Load brands on-demand when component is first interacted with
  const loadBrandsOnDemand = async () => {
    if (brands.length > 0) return; // Already loaded
    
    try {
      setLoading(true);
      setError("");

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase credentials");
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Query only the 'brand' column for deduplication
      const { data, error } = await supabase
        .from("brand_mentions")
        .select("brand")
        .order("brand");

      if (error) {
        throw error;
      }

      // Remove duplicates and sort
      const uniqueBrands = [...new Set((data || []).map(m => m.brand))].sort();
      setBrands(uniqueBrands);

    } catch (err) {
      console.error("Error fetching brands:", err);
      setError(err instanceof Error ? err.message : "Failed to load brands");
      // Fallback to hardcoded brands if fetch fails
      setBrands(hardcodedBrands.sort());
    } finally {
      setLoading(false);
    }
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const brand = e.target.value;
    setSelectedBrand(brand);
    
    // Load brands on first interaction if not already loaded
    if (brands.length === 0) {
      loadBrandsOnDemand();
    }
    
    // Pass null for "All Brands", otherwise pass the selected brand
    onBrandSelect(brand === "" ? null : brand);
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Filter className="h-4 w-4 text-zinc-500 animate-pulse" />
        <div className="h-10 flex-1 rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Filter className="h-4 w-4 text-red-500" />
        <select
          disabled
          className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 outline-none ring-red-500/30 transition focus:ring-4 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100"
        >
          <option>Error loading brands</option>
        </select>
      </div>
    );
  }

  // Use hardcoded brands as default, or loaded brands if available
  const displayBrands = brands.length > 0 ? brands : hardcodedBrands;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Filter className="h-4 w-4 text-zinc-500" />
      <div className="relative flex-1">
        <select
          value={selectedBrand}
          onChange={handleBrandChange}
          onFocus={loadBrandsOnDemand} // Load brands when dropdown is focused
          className="w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-8 text-sm text-zinc-900 outline-none ring-emerald-500/30 transition focus:ring-4 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
        >
          <option value="">{placeholder}</option>
          {displayBrands.map(brand => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
      </div>
      
      {selectedBrand && (
        <div className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedBrand}</span>
        </div>
      )}
    </div>
  );
}
