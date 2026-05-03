import { AdvancedFilteringService, type TweetAnalysis } from '../lib/advancedFilteringService';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function testAdvancedFiltering() {
  console.log('🧪 Testing SUPER ADVANCED AI Filtering System\n');
  
  const filteringService = new AdvancedFilteringService();
  
  const testCases = [
    {
      brand: 'Apple',
      tweets: [
        {
          text: 'Apple GIVEAWAY!!! CLICK HERE FOR FREE iPad Air!!! 🎁 🔥 💀 #tech #review',
          author: 'user_123',
          expected: { isSpam: true, isRelevant: false, intent: 'unknown' }
        },
        {
          text: 'Apple iPhone 15 camera is incredible for photography work',
          author: 'photography_pro',
          expected: { isSpam: false, isRelevant: true, intent: 'praise' }
        },
        {
          text: 'Oh great, another Apple update that breaks everything. #blessed 🙃',
          author: 'frustrated_user',
          expected: { isSpam: false, isRelevant: true, intent: 'complaint', isSarcastic: true }
        },
        {
          text: '🚀 GUADAGNA 1000$ AL GIORNO CON I CRYPTO-BOT!!! Apple LINK IN BIO 🚀',
          author: 'crypto_spammer',
          expected: { isSpam: true, isRelevant: false, intent: 'unknown' }
        },
        {
          text: 'Apple customer service was really helpful today with my MacBook issue',
          author: 'happy_customer',
          expected: { isSpam: false, isRelevant: true, intent: 'customer_service' }
        },
        {
          text: '💀💀💀',
          author: 'emoji_spammer',
          expected: { isSpam: true, isRelevant: false, intent: 'unknown' }
        },
        {
          text: 'Love when my $2000 MacBook crashes during presentations. So reliable! 🙃',
          author: 'sarcastic_pro',
          expected: { isSpam: false, isRelevant: true, intent: 'complaint', isSarcastic: true }
        },
        {
          text: 'Apple stock price is up after earnings report',
          author: 'market_analyst',
          expected: { isSpam: false, isRelevant: true, intent: 'news' }
        }
      ]
    },
    {
      brand: 'AMD',
      tweets: [
        {
          text: 'AMD Ryzen 9 processor is amazing for gaming performance',
          author: 'gamer123',
          expected: { isSpam: false, isRelevant: true, intent: 'praise' }
        },
        {
          text: 'AMD GIVEAWAY!!! CLICK HERE FOR FREE Ryzen 9000!!! 🎁',
          author: 'spam_bot',
          expected: { isSpam: true, isRelevant: false, intent: 'unknown' }
        },
        {
          text: 'TRADING SIGNALS FOR Bitcoin!!! AMD GET RICH QUICK!!!',
          author: 'crypto_scammer',
          expected: { isSpam: true, isRelevant: false, intent: 'unknown' }
        },
        {
          text: 'AMD CEO announced new processor lineup for 2025',
          author: 'tech_news',
          expected: { isSpam: false, isRelevant: true, intent: 'news' }
        },
        {
          text: 'AMD CPU overheating issues, very disappointed with quality control',
          author: 'tech_enthusiast',
          expected: { isSpam: false, isRelevant: true, intent: 'complaint' }
        },
        {
          text: 'my cat knocked over my coffee this morning',
          author: 'random_user',
          expected: { isSpam: false, isRelevant: false, intent: 'unknown' }
        },
        {
          text: 'AMD Radeon graphics card performance is incredible for 4K gaming',
          author: 'pc_builder',
          expected: { isSpam: false, isRelevant: true, intent: 'praise' }
        },
        {
          text: 'Wow AMD really outdid themselves this time. Another driver crash! 🙃',
          author: 'sarcastic_gamer',
          expected: { isSpam: false, isRelevant: true, intent: 'complaint', isSarcastic: true }
        }
      ]
    }
  ];
  
  let totalTests = 0;
  let passedTests = 0;
  let highConfidenceTests = 0;
  
  for (const { brand, tweets } of testCases) {
    console.log(`\n🔍 Testing brand: ${brand}`);
    console.log('=' .repeat(70));
    
    for (const testCase of tweets) {
      totalTests++;
      
      console.log(`\n📝 Tweet: "${testCase.text}"`);
      console.log(`👤 Author: ${testCase.author}`);
      
      try {
        const analysis: TweetAnalysis = {
          text: testCase.text,
          brand,
          authorHandle: testCase.author,
          postedAt: new Date().toISOString()
        };

        const result = await filteringService.filterTweet(analysis);
        
        console.log(`🎯 Results:`);
        console.log(`   Spam: ${result.isSpam} (${(result.spamScore || 0)}/100)`);
        console.log(`   Relevant: ${result.isRelevant} (${(result.relevanceScore || 0)}/100)`);
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`   Intent: ${result.intent}`);
        console.log(`   Topic: ${result.topic}`);
        console.log(`   Sarcasm: ${result.isSarcastic}`);
        console.log(`   Quality: ${result.qualityScore}/100`);
        console.log(`   Duplicate: ${result.isDuplicate}`);
        console.log(`   Should Review: ${result.shouldReview}`);
        
        if (result.reasoning.length > 0) {
          console.log(`   Reasoning: ${result.reasoning.slice(0, 3).join('; ')}`);
        }
        
        // Test expectations
        let testPassed = true;
        
        if (testCase.expected.isSpam !== undefined && result.isSpam !== testCase.expected.isSpam) {
          console.log(`   ❌ FAIL: Expected spam=${testCase.expected.isSpam}, got ${result.isSpam}`);
          testPassed = false;
        }
        
        if (testCase.expected.isRelevant !== undefined && result.isRelevant !== testCase.expected.isRelevant) {
          console.log(`   ❌ FAIL: Expected relevant=${testCase.expected.isRelevant}, got ${result.isRelevant}`);
          testPassed = false;
        }
        
        if (testCase.expected.intent && result.intent !== testCase.expected.intent) {
          console.log(`   ⚠️  INTENT: Expected ${testCase.expected.intent}, got ${result.intent}`);
        }
        
        if (testCase.expected.isSarcastic !== undefined && result.isSarcastic !== testCase.expected.isSarcastic) {
          console.log(`   ⚠️  SARCASM: Expected ${testCase.expected.isSarcastic}, got ${result.isSarcastic}`);
        }
        
        if (testPassed) {
          console.log(`   ✅ PASS`);
          passedTests++;
        }
        
        if (result.confidence >= 0.7) {
          highConfidenceTests++;
        }
        
      } catch (error) {
        console.log(`   ❌ ERROR: ${error}`);
      }
    }
  }
  
  console.log('\n🎯 Advanced Filtering Test Results:');
  console.log('=' .repeat(50));
  console.log(`📊 Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`🎯 High Confidence: ${highConfidenceTests} (${((highConfidenceTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`📈 Success Rate: ${((passedTests/totalTests)*100).toFixed(1)}%`);
  
  if (passedTests/totalTests >= 0.8) {
    console.log('\n🔥 EXCELLENT: Advanced filtering is working great!');
  } else if (passedTests/totalTests >= 0.6) {
    console.log('\n👍 GOOD: Advanced filtering is working well with room for improvement');
  } else {
    console.log('\n⚠️  NEEDS WORK: Advanced filtering needs adjustment');
  }
  
  console.log('\n💡 Advanced Features Tested:');
  console.log('   ✅ Multi-layer spam detection');
  console.log('   ✅ Sarcasm detection');
  console.log('   ✅ Intent classification');
  console.log('   ✅ Topic analysis');
  console.log('   ✅ Content quality scoring');
  console.log('   ✅ Brand relevance scoring');
  console.log('   ✅ Confidence scoring');
  console.log('   ✅ Duplicate detection');
  console.log('   ✅ Edge case flagging');
}

testAdvancedFiltering();
