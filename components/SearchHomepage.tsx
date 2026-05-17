"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, BarChart3, MessageSquare, Sparkles } from "lucide-react";

export function SearchHomepage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Suggested brand chips as shortcuts
  const suggestedBrands = [
    "Apple", "Tesla", "Nike", "Amazon", "Google", "Microsoft"
  ];

  const handleSearch = (brand: string) => {
    if (!brand.trim()) return;
    
    setIsSearching(true);
    // Clean the brand name and route to brand analysis page
    const cleanBrand = brand.trim().replace(/\s+/g, '-');
    router.push(`/brand/${cleanBrand}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handleChipClick = (brand: string) => {
    setSearchQuery(brand);
    handleSearch(brand);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 max-w-3xl">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
            SentiBrand
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">-X</span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
            Real-time sentiment analysis for any brand in the world
          </p>

          {/* Search Bar - Hero Element */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for any brand..."
                className="w-full h-16 pl-14 pr-32 text-lg text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:ring-emerald-500/30 transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                disabled={isSearching}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isSearching}
                  className="h-12 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                >
                  {isSearching ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Analyzing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      <span>Analyze</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Suggested Brand Chips */}
          <div className="mb-12">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Popular searches:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestedBrands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => handleChipClick(brand)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full mb-12">
          <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Real-time Analysis</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Live sentiment tracking from social media mentions</p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Trend Detection</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Identify rising sentiment patterns and changes</p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">AI-Powered</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Advanced sentiment analysis with machine learning</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          <p>Analyze any brand • Real-time insights • No setup required</p>
        </div>
      </div>
    </div>
  );
}
