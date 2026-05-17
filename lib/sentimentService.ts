import { HfInference } from "@huggingface/inference";
import { AdvancedFilteringService, type TweetAnalysis } from "./advancedFilteringService";

type SentimentLabel = "Negative" | "Neutral" | "Positive" | "Unknown" | "Spam";

type SentimentAnalysisResult = {
  sentiment: SentimentLabel;
  confidence: number;
  rawLabel?: string;
  error?: boolean;
  filterAnalysis?: any;
  shouldSkip?: boolean; // Skip if spam/irrelevant
};

const MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment";

const LABEL_MAP: Record<string, SentimentLabel> = {
  LABEL_0: "Negative",
  LABEL_1: "Neutral",
  LABEL_2: "Positive",
};

function getInferenceClient(): HfInference {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing HUGGINGFACE_API_KEY. Add it to your environment variables.",
    );
  }

  return new HfInference(apiKey);
}

export async function analyzeSentiment(
  text: string,
  brand?: string,
  authorHandle?: string,
): Promise<SentimentAnalysisResult> {
  try {
    // Advanced filtering first if brand is provided
    if (brand && authorHandle) {
      try {
        const filteringService = new AdvancedFilteringService();
        const analysis: TweetAnalysis = {
          text,
          brand,
          authorHandle,
          postedAt: new Date().toISOString()
        };

        const filterResult = await filteringService.filterTweet(analysis);

        // If spam or irrelevant, skip sentiment analysis
        if (filterResult.isSpam || !filterResult.isRelevant) {
          return {
            sentiment: "Spam",
            confidence: filterResult.confidence,
            filterAnalysis: filterResult,
            shouldSkip: true
          };
        }

        // Adjust sentiment confidence based on sarcasm detection
        const adjustedConfidence = filterResult.isSarcastic ? 
          Math.min(0.3, filterResult.sentimentQuality) : 
          filterResult.sentimentQuality;

      } catch (filterError) {
        console.log("Advanced filtering failed, proceeding with basic sentiment analysis");
      }
    }

    // Proceed with sentiment analysis
    const hf = getInferenceClient();
    const output = await hf.textClassification({
      model: MODEL_NAME,
      inputs: text,
    });

    const topResult = output[0];
    const mappedLabel = topResult?.label ? LABEL_MAP[topResult.label] : undefined;

    return {
      sentiment: mappedLabel ?? "Unknown",
      confidence: topResult?.score ?? 0,
      rawLabel: topResult?.label,
    };
  } catch (error) {
    console.error("Errore durante l'analisi AI:", error);

    return {
      sentiment: "Neutral",
      confidence: 0,
      error: true,
    };
  }
}

// Legacy function for backward compatibility
export async function analyzeSentimentBasic(
  text: string,
): Promise<SentimentAnalysisResult> {
  return analyzeSentiment(text);
}
