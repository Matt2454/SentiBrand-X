import type { BrandMention } from "../types/dashboard";

export interface InfluenceScore {
  rawScore: number;
  weightedScore: number;
  impactLevel: "low" | "medium" | "high" | "viral";
  engagementRatio: number;
}

export interface InfluenceConfig {
  baseWeight: number;
  viralMultiplier: number;
  followerWeight: number;
  engagementWeight: number;
}

const DEFAULT_INFLUENCE_CONFIG: InfluenceConfig = {
  baseWeight: 1,
  viralMultiplier: 2.5,
  followerWeight: 0.0001, // 1 point per 10k followers
  engagementWeight: 0.01, // 1 point per 100 engagements
};

/**
 * Calculate the influence score of a mention based on followers and engagement
 * Formula: Impact = (Followers × BaseWeight) + (Engagement × ViralMultiplier)
 */
export function calculateInfluenceScore(
  mention: BrandMention,
  config: InfluenceConfig = DEFAULT_INFLUENCE_CONFIG
): InfluenceScore {
  const followers = mention.author_followers || 0;
  const engagement = (mention.likes || 0) + (mention.retweets || 0) + (mention.replies || 0);
  
  // Calculate the raw influence score
  const reachScore = followers * config.followerWeight;
  const engagementScore = engagement * config.engagementWeight * config.viralMultiplier;
  const rawScore = reachScore + engagementScore;
  
  // Calculate engagement ratio (engagement per follower)
  const engagementRatio = followers > 0 ? engagement / followers : 0;
  
  // Determine impact level based on engagement ratio and absolute score
  let impactLevel: InfluenceScore["impactLevel"] = "low";
  
  if (engagementRatio > 0.1 || rawScore > 100) {
    impactLevel = "viral";
  } else if (engagementRatio > 0.05 || rawScore > 50) {
    impactLevel = "high";
  } else if (engagementRatio > 0.02 || rawScore > 20) {
    impactLevel = "medium";
  }
  
  // Apply additional weighting for viral content
  let weightedScore = rawScore;
  if (impactLevel === "viral") {
    weightedScore *= 1.5; // 50% boost for viral content
  } else if (impactLevel === "high") {
    weightedScore *= 1.2; // 20% boost for high impact
  }
  
  return {
    rawScore: Math.round(rawScore * 100) / 100,
    weightedScore: Math.round(weightedScore * 100) / 100,
    impactLevel,
    engagementRatio: Math.round(engagementRatio * 10000) / 10000, // 4 decimal places
  };
}

/**
 * Calculate weighted sentiment score that considers influence
 * Negative sentiment with high influence should have more impact
 */
export function calculateWeightedSentiment(
  mentions: BrandMention[],
  sentimentLabel: "positive" | "neutral" | "negative"
): number {
  let totalWeightedScore = 0;
  let totalInfluence = 0;
  
  mentions.forEach(mention => {
    const influence = calculateInfluenceScore(mention);
    let sentimentWeight = 0;
    
    switch (sentimentLabel) {
      case "positive":
        sentimentWeight = 1;
        break;
      case "neutral":
        sentimentWeight = 0;
        break;
      case "negative":
        sentimentWeight = -1;
        // Negative sentiment with high influence gets extra weight
        if (influence.impactLevel === "viral") {
          sentimentWeight *= 2; // Double impact for viral negative content
        } else if (influence.impactLevel === "high") {
          sentimentWeight *= 1.5; // 50% extra impact for high negative content
        }
        break;
    }
    
    totalWeightedScore += sentimentWeight * influence.weightedScore;
    totalInfluence += influence.weightedScore;
  });
  
  return totalInfluence > 0 ? totalWeightedScore / totalInfluence : 0;
}

/**
 * Detect potential crisis situations based on negative viral content
 */
export function detectCrisisAlerts(mentions: BrandMention[]): {
  hasCrisis: boolean;
  crisisLevel: "low" | "medium" | "high" | "critical";
  alerts: Array<{
    mention: BrandMention;
    influence: InfluenceScore;
    reason: string;
  }>;
} {
  const alerts: Array<{
    mention: BrandMention;
    influence: InfluenceScore;
    reason: string;
  }> = [];
  
  mentions.forEach(mention => {
    const influence = calculateInfluenceScore(mention);
    
    // Check for crisis indicators
    if (influence.impactLevel === "viral" && influence.weightedScore > 100) {
      alerts.push({
        mention,
        influence,
        reason: "Viral negative content with high influence detected"
      });
    } else if (influence.engagementRatio > 0.15) {
      alerts.push({
        mention,
        influence,
        reason: "Extremely high engagement ratio"
      });
    } else if (influence.impactLevel === "high" && influence.weightedScore > 50) {
      alerts.push({
        mention,
        influence,
        reason: "High-impact negative content"
      });
    }
  });
  
  // Determine crisis level
  let crisisLevel: "low" | "medium" | "high" | "critical" = "low";
  let hasCrisis = false;
  
  if (alerts.length >= 5) {
    crisisLevel = "critical";
    hasCrisis = true;
  } else if (alerts.length >= 3) {
    crisisLevel = "high";
    hasCrisis = true;
  } else if (alerts.length >= 1) {
    crisisLevel = "medium";
    hasCrisis = true;
  }
  
  return {
    hasCrisis,
    crisisLevel,
    alerts: alerts.sort((a, b) => b.influence.weightedScore - a.influence.weightedScore)
  };
}

/**
 * Get trending mentions based on engagement ratio
 */
export function getTrendingMentions(mentions: BrandMention[], limit: number = 10): Array<{
  mention: BrandMention;
  influence: InfluenceScore;
  trendScore: number;
}> {
  const scored = mentions.map(mention => {
    const influence = calculateInfluenceScore(mention);
    // Trend score combines influence with recency (newer content gets bonus)
    const recencyBonus = mention.posted_at ? 
      Math.max(0, 1 - (Date.now() - new Date(mention.posted_at).getTime()) / (7 * 24 * 60 * 60 * 1000)) : 0;
    const trendScore = influence.weightedScore * (1 + recencyBonus);
    
    return {
      mention,
      influence,
      trendScore: Math.round(trendScore * 100) / 100
    };
  });
  
  return scored
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, limit);
}
