import { HfInference } from "@huggingface/inference";

type SentimentLabel = "Negative" | "Neutral" | "Positive" | "Unknown";

type SentimentAnalysisResult = {
  sentiment: SentimentLabel;
  confidence: number;
  rawLabel?: string;
  error?: boolean;
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
): Promise<SentimentAnalysisResult> {
  try {
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
