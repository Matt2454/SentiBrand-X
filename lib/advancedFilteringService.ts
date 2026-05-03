import { HfInference } from "@huggingface/inference";
import { createSupabaseClient } from './supabase';

// Advanced filtering types
interface FilterResult {
  isSpam: boolean;
  isRelevant: boolean;
  confidence: number;
  spamScore: number;
  qualityScore: number;
  relevanceScore: number;
  sentimentQuality: number;
  intent: 'customer_service' | 'product_feedback' | 'news' | 'discussion' | 'complaint' | 'praise' | 'unknown';
  topic: string;
  isSarcastic: boolean;
  isDuplicate: boolean;
  shouldReview: boolean;
  reasoning: string[];
}

interface TweetAnalysis {
  text: string;
  brand: string;
  authorHandle: string;
  postedAt: string;
}

const SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment";
const CLASSIFICATION_MODEL = "distilbert-base-uncased-finetuned-sst-2-english";

class AdvancedFilteringService {
  private hf: HfInference;
  private supabase = createSupabaseClient();

  constructor() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error("Missing HUGGINGFACE_API_KEY");
    }
    this.hf = new HfInference(apiKey);
  }

  // Layer 1: Multi-Model Spam & Quality Detection
  async detectSpam(text: string): Promise<{ isSpam: boolean; confidence: number; reasoning: string[] }> {
    const reasoning: string[] = [];
    let spamScore = 0;
    let confidence = 0;

    // Primary Spam Filter - Enhanced patterns
    const spamPatterns = [
      /GIVEAWAY/i, /CLICK HERE/i, /FREE.*\w+/i, /CRYPTO/i, /BITCOIN/i,
      /MASSIVE GAINS/i, /GET RICH/i, /TRADING SIGNALS/i, /GUADAGNA/i,
      /LINK IN BIO/i, /DM FOR/i, /\d+%\s*(OFF|DISCOUNT)/i, /WIN.*\w+/i,
      /LIMITED TIME/i, /ACT NOW/i, /DON'T MISS/i, /OFFER ENDS/i,
      /BUY NOW/i, /SHOP NOW/i, /ORDER TODAY/i, /INSTANT ACCESS/i
    ];

    const patternMatches = spamPatterns.filter(pattern => pattern.test(text));
    if (patternMatches.length > 0) {
      spamScore += patternMatches.length * 15;
      reasoning.push(`Matched ${patternMatches.length} spam patterns: ${patternMatches.map(p => p.source).join(', ')}`);
    }

    // AI Spam Detection with Few-Shot Prompting
    try {
      const aiPrompt = `Classify if this tweet is spam or genuine:

Spam examples:
- "Apple GIVEAWAY CLICK HERE for FREE iPad!!!"
- "CHECK OUT MY CRYPTO FOR MASSIVE GAINS!!!"
- "WIN FREE iPhone NOW CLICK HERE!!!"

Genuine examples:
- "Just bought the new iPhone, absolutely love the camera"
- "AMD CPU overheating issues, very disappointed"
- "Apple customer service helped me with my problem"

Tweet to classify: "${text}"

Is this spam or genuine? Answer only "spam" or "genuine":`;

      const response = await this.hf.textClassification({
        model: "microsoft/DialoGPT-medium",
        inputs: aiPrompt,
      });

      const aiResult = response[0];
      if (aiResult?.label?.toLowerCase().includes('spam')) {
        spamScore += 25;
        reasoning.push('AI model classified as spam');
      }
      confidence = Math.max(confidence, aiResult?.score || 0);
    } catch (error) {
      reasoning.push('AI spam detection failed, using pattern matching only');
    }

    // Content Quality Scoring
    const qualityIssues = this.analyzeContentQuality(text);
    if (qualityIssues.length > 0) {
      spamScore += qualityIssues.length * 10;
      reasoning.push(`Quality issues: ${qualityIssues.join(', ')}`);
    }

    // Emoji Analysis
    const emojiAnalysis = this.analyzeEmojis(text);
    if (emojiAnalysis.isSpammy) {
      spamScore += 20;
      reasoning.push('Excessive or spammy emoji usage');
    }

    const isSpam = spamScore >= 30; // Threshold for spam detection
    confidence = Math.min(confidence + (spamScore / 100), 1);

    return { isSpam, confidence, reasoning };
  }

  // Layer 2: Intent & Topic Analysis
  async analyzeIntentAndTopic(text: string, brand: string): Promise<{ intent: FilterResult['intent']; topic: string; confidence: number }> {
    try {
      const prompt = `Analyze the intent and topic of this tweet about ${brand}:

Tweet: "${text}"

Possible intents: customer_service, product_feedback, news, discussion, complaint, praise
Possible topics: product_quality, customer_service, pricing, features, company_news, stock, competition, general

Respond in format: "intent|topic|confidence"`;

      const response = await this.hf.textClassification({
        model: "microsoft/DialoGPT-medium",
        inputs: prompt,
      });

      const result = response[0];
      const parts = result?.label?.split('|') || [];
      
      return {
        intent: (parts[0] as FilterResult['intent']) || 'unknown',
        topic: parts[1] || 'general',
        confidence: parseFloat(parts[2]) || result?.score || 0.5
      };
    } catch (error) {
      // Fallback to keyword-based intent detection
      return this.fallbackIntentAnalysis(text);
    }
  }

  // Layer 3: Sarcasm Detection
  async detectSarcasm(text: string): Promise<{ isSarcastic: boolean; confidence: number }> {
    try {
      const prompt = `Detect sarcasm in this tweet:

Sarcastic examples:
- "Oh great, another Apple update that breaks everything. #blessed"
- "Love when my $2000 laptop crashes during a presentation. So reliable! 🙃"
- "Wow, customer service put me on hold for 2 hours. Best experience ever!"

Genuine examples:
- "Apple customer service was really helpful today"
- "Frustrated with the battery life on my new iPhone"
- "The new MacBook Pro is incredibly fast"

Tweet to analyze: "${text}"

Is this sarcastic? Answer only "yes" or "no":`;

      const response = await this.hf.textClassification({
        model: "microsoft/DialoGPT-medium",
        inputs: prompt,
      });

      const result = response[0];
      const isSarcastic = result?.label?.toLowerCase().includes('yes');
      
      return {
        isSarcastic: !!isSarcastic,
        confidence: result?.score || 0.5
      };
    } catch (error) {
      // Fallback sarcasm detection
      const sarcasmIndicators = [
        /🙃/g, /🤔/g, /sure.*great/i, /love.*when/i, /best.*ever/i,
        /so.*helpful/i, /can't.*wait/i, /just.*what.*needed/i
      ];
      
      const matches = sarcasmIndicators.filter(indicator => indicator.test(text));
      return {
        isSarcastic: matches.length >= 2,
        confidence: Math.min(matches.length * 0.3, 0.8)
      };
    }
  }

  // Layer 4: Brand Relevance Scoring
  async calculateBrandRelevance(text: string, brand: string): Promise<{ score: number; reasoning: string[] }> {
    const reasoning: string[] = [];
    let score = 0;

    // Brand mention analysis
    const brandLower = brand.toLowerCase();
    const textLower = text.toLowerCase();
    
    if (textLower.includes(brandLower)) {
      score += 30;
      reasoning.push('Direct brand mention');
    }

    // Product/Service context
    const productKeywords = /\b(product|service|device|phone|laptop|computer|app|software|hardware)\b/i;
    if (productKeywords.test(text)) {
      score += 20;
      reasoning.push('Product/service context');
    }

    // Brand-specific keywords
    const brandContexts = {
      'apple': ['iphone', 'ipad', 'macbook', 'ios', 'app store', 'tim cook'],
      'amd': ['processor', 'cpu', 'ryzen', 'radeon', 'gpu', 'chip'],
      'tesla': ['car', 'model', 'elon', 'electric', 'autopilot', 'supercharger'],
      'nike': ['shoes', 'running', 'sports', 'athletic', 'jordan', 'air max']
    };

    const brandKeywords = brandContexts[brandLower as keyof typeof brandContexts] || [];
    const keywordMatches = brandKeywords.filter(keyword => textLower.includes(keyword));
    if (keywordMatches.length > 0) {
      score += keywordMatches.length * 15;
      reasoning.push(`Brand-specific keywords: ${keywordMatches.join(', ')}`);
    }

    // Sentiment relevance
    const sentimentWords = /\b(love|hate|amazing|terrible|good|bad|best|worst|great|awful|perfect|broken|works|doesn't|recommend|avoid)\b/i;
    if (sentimentWords.test(text)) {
      score += 15;
      reasoning.push('Sentiment expression');
    }

    return { score: Math.min(score, 100), reasoning };
  }

  // Duplicate Detection
  async detectDuplicate(text: string, authorHandle: string): Promise<{ isDuplicate: boolean; similarity: number }> {
    try {
      // Check for exact duplicates in the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: existingTweets } = await this.supabase
        .from('brand_mentions')
        .select('raw_text, author_handle')
        .gte('posted_at', oneDayAgo)
        .limit(100);

      if (!existingTweets) return { isDuplicate: false, similarity: 0 };

      // Simple similarity check (can be enhanced with semantic similarity)
      const exactMatches = existingTweets.filter(tweet => 
        tweet.raw_text === text || 
        (tweet.author_handle === authorHandle && this.calculateSimilarity(tweet.raw_text, text) > 0.9)
      );

      return {
        isDuplicate: exactMatches.length > 0,
        similarity: exactMatches.length > 0 ? 1.0 : 0
      };
    } catch (error) {
      return { isDuplicate: false, similarity: 0 };
    }
  }

  // Main filtering function
  async filterTweet(analysis: TweetAnalysis): Promise<FilterResult> {
    const reasoning: string[] = [];
    let totalConfidence = 0;
    let factorCount = 0;

    // Layer 1: Spam Detection
    const spamResult = await this.detectSpam(analysis.text);
    if (spamResult.isSpam) {
      return {
        isSpam: true,
        isRelevant: false,
        confidence: spamResult.confidence,
        spamScore: 100,
        qualityScore: 0,
        relevanceScore: 0,
        sentimentQuality: 0,
        intent: 'unknown',
        topic: 'spam',
        isSarcastic: false,
        isDuplicate: false,
        shouldReview: false,
        reasoning: spamResult.reasoning
      };
    }

    // Layer 2: Intent & Topic Analysis
    const intentResult = await this.analyzeIntentAndTopic(analysis.text, analysis.brand);
    totalConfidence += intentResult.confidence;
    factorCount++;

    // Layer 3: Sarcasm Detection
    const sarcasmResult = await this.detectSarcasm(analysis.text);
    totalConfidence += sarcasmResult.confidence;
    factorCount++;

    // Layer 4: Brand Relevance
    const relevanceResult = await this.calculateBrandRelevance(analysis.text, analysis.brand);
    const isRelevant = relevanceResult.score >= 40; // Threshold for relevance

    // Layer 5: Duplicate Detection
    const duplicateResult = await this.detectDuplicate(analysis.text, analysis.authorHandle);

    // Content Quality Score
    const qualityScore = this.calculateQualityScore(analysis.text);

    // Sentiment Quality (affects sentiment analysis reliability)
    const sentimentQuality = sarcasmResult.isSarcastic ? 0.3 : 0.9;

    // Overall confidence
    const overallConfidence = factorCount > 0 ? totalConfidence / factorCount : 0.5;

    // Should review for edge cases
    const shouldReview = (
      relevanceResult.score >= 35 && relevanceResult.score <= 45 || // Borderline relevance
      sarcasmResult.confidence < 0.6 || // Uncertain sarcasm
      overallConfidence < 0.7 // Low overall confidence
    );

    return {
      isSpam: false,
      isRelevant,
      confidence: overallConfidence,
      spamScore: 0,
      qualityScore,
      relevanceScore: relevanceResult.score,
      sentimentQuality,
      intent: intentResult.intent,
      topic: intentResult.topic,
      isSarcastic: sarcasmResult.isSarcastic,
      isDuplicate: duplicateResult.isDuplicate,
      shouldReview,
      reasoning: [
        ...relevanceResult.reasoning,
        `Intent: ${intentResult.intent}`,
        `Topic: ${intentResult.topic}`,
        sarcasmResult.isSarcastic ? 'Detected sarcasm' : 'No sarcasm detected',
        duplicateResult.isDuplicate ? 'Potential duplicate' : 'Unique content'
      ]
    };
  }

  // Helper methods
  private analyzeContentQuality(text: string): string[] {
    const issues: string[] = [];
    
    if (text.length < 10) issues.push('Too short');
    if (text.length > 500) issues.push('Too long');
    if (text.split(/\s+/).length < 3) issues.push('Too few words');
    
    const wordCount = text.split(/\s+/).length;
    const punctuationCount = (text.match(/[.!?]/g) || []).length;
    if (wordCount > 20 && punctuationCount === 0) issues.push('No punctuation');
    
    return issues;
  }

  private analyzeEmojis(text: string): { isSpammy: boolean; count: number } {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = text.match(emojiRegex) || [];
    const wordCount = text.split(/\s+/).length;
    
    return {
      isSpammy: emojis.length > wordCount / 2 || emojis.length > 5,
      count: emojis.length
    };
  }

  private fallbackIntentAnalysis(text: string): { intent: FilterResult['intent']; topic: string; confidence: number } {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('customer service') || textLower.includes('support') || textLower.includes('help')) {
      return { intent: 'customer_service', topic: 'customer_service', confidence: 0.8 };
    }
    if (textLower.includes('broken') || textLower.includes('doesn\'t work') || textLower.includes('issue')) {
      return { intent: 'complaint', topic: 'product_quality', confidence: 0.7 };
    }
    if (textLower.includes('love') || textLower.includes('amazing') || textLower.includes('perfect')) {
      return { intent: 'praise', topic: 'general', confidence: 0.7 };
    }
    
    return { intent: 'discussion', topic: 'general', confidence: 0.5 };
  }

  private calculateQualityScore(text: string): number {
    let score = 50; // Base score
    
    // Length bonus
    if (text.length >= 20 && text.length <= 200) score += 20;
    
    // Word diversity
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (uniqueWords.size / words.length > 0.7) score += 15;
    
    // Grammar indicators (basic)
    if (text.match(/[.!?]$/)) score += 10; // Ends with punctuation
    if (text.match(/\b[A-Z][a-z]+\b/)) score += 5; // Has capitalized words
    
    return Math.min(score, 100);
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity (can be enhanced with semantic similarity)
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

export { AdvancedFilteringService, type FilterResult, type TweetAnalysis };
