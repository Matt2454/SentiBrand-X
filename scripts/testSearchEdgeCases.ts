import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function testSearchEdgeCases() {
  console.log('🧪 Testing search edge cases...\n');
  
  const edgeCases = [
    { brand: 'Coca-Cola', description: 'Brand with hyphen' },
    { brand: 'McDonald\'s', description: 'Brand with apostrophe' },
    { brand: 'BMW', description: 'Short brand name' },
    { brand: 'Microsoft', description: 'Tech giant' },
    { brand: 'RandomBrandXYZ', description: 'Non-existent brand' },
    { brand: '', description: 'Empty brand name' }
  ];
  
  for (const { brand, description } of edgeCases) {
    console.log(`\n🔍 Testing: ${description} "${brand}"`);
    
    if (!brand) {
      console.log('⚠️  Skipping empty brand test');
      continue;
    }
    
    try {
      const startTime = Date.now();
      const response = await fetch(`http://localhost:3000/brand/${brand}`, {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      const loadTime = Date.now() - startTime;
      
      console.log(`   ⏱️  Load time: ${loadTime}ms`);
      console.log(`   📊 Status: ${response.status}`);
      
      if (response.ok) {
        const text = await response.text();
        
        // Check for success indicators
        const hasData = text.includes('sentiment') || text.includes('mentions');
        const hasError = text.includes('Failed to load') || text.includes('Error');
        const isLoading = text.includes('Loading...');
        
        if (hasError) {
          console.log(`   ❌ Page shows error`);
        } else if (isLoading) {
          console.log(`   ⏳ Page is still loading`);
        } else if (hasData) {
          console.log(`   ✅ Page loaded with data`);
        } else {
          console.log(`   📄 Page loaded (empty state)`);
        }
      } else {
        console.log(`   ❌ HTTP Error: ${response.status}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`   ⏰ Timeout after 10 seconds`);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n🎯 Edge case testing complete!');
  console.log('\n💡 The search functionality should handle:');
  console.log('   ✅ Existing brands with data');
  console.log('   ✅ Non-existent brands (empty state)');
  console.log('   ✅ Special characters in brand names');
  console.log('   ✅ Fast loading times');
}

testSearchEdgeCases();
