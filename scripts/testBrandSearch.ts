import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function testBrandSearch() {
  console.log('🔍 Testing brand search functionality...\n');
  
  // Test brands that should work
  const testBrands = [
    'Apple',
    'Tesla', 
    'Nike',
    'NonExistentBrand123' // Should handle gracefully
  ];
  
  for (const brand of testBrands) {
    console.log(`\n📊 Testing brand: "${brand}"`);
    
    try {
      const response = await fetch(`http://localhost:3000/brand/${brand}`);
      
      if (response.ok) {
        console.log(`✅ Successfully loaded brand page for "${brand}"`);
        
        // Check if it's actually loading data (not just error page)
        const text = await response.text();
        if (text.includes('Failed to load brand insights')) {
          console.log(`❌ Brand page shows error for "${brand}"`);
        } else if (text.includes('Loading...')) {
          console.log(`⏳ Brand page is loading for "${brand}"`);
        } else {
          console.log(`✅ Brand page loaded successfully for "${brand}"`);
        }
      } else {
        console.log(`❌ Failed to load brand page for "${brand}" - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error testing brand "${brand}":`, error);
    }
  }
  
  console.log('\n🎯 Search flow test complete!');
  console.log('\n💡 Try these searches manually:');
  testBrands.forEach(brand => {
    console.log(`   - http://localhost:3000/brand/${brand}`);
  });
}

testBrandSearch();
