/**
 * Cost Tracking Module
 * Tracks API usage and estimates costs for AI Grader Pro analysis
 */

/**
 * Pricing (as of January 2025, subject to change)
 */
const PRICING = {
  anthropic: {
    // Claude Sonnet 4 pricing
    inputPer1M: 3.00,   // $3 per 1M input tokens
    outputPer1M: 15.00, // $15 per 1M output tokens
  },
  openai: {
    // GPT-4o pricing
    inputPer1M: 2.50,   // $2.50 per 1M input tokens
    outputPer1M: 10.00, // $10 per 1M output tokens
  },
  perplexity: {
    // Sonar Pro pricing (request-based)
    perRequest: 0.005,  // $0.005 per request (5 cents per 1000 requests)
  },
  serpapi: {
    // SerpAPI pricing (search-based)
    perSearch: 0.0025,  // $0.0025 per search (~$5 for 2000 searches)
  },
  dataforseo: {
    // DataForSEO SERP API
    perRequest: 0.0125, // $0.0125 per live request
  },
};

/**
 * Cost tracker state
 */
class CostTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.costs = {
      anthropic: { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      openai: { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      perplexity: { requests: 0, cost: 0 },
      serpapi: { requests: 0, cost: 0 },
      dataforseo: { requests: 0, cost: 0 },
    };
  }

  /**
   * Track Anthropic Claude API call
   * @param {Object} usage - Usage data from API response
   */
  trackAnthropic(usage) {
    if (!usage) return;

    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;

    this.costs.anthropic.requests++;
    this.costs.anthropic.inputTokens += inputTokens;
    this.costs.anthropic.outputTokens += outputTokens;

    const cost = (inputTokens / 1000000) * PRICING.anthropic.inputPer1M +
                 (outputTokens / 1000000) * PRICING.anthropic.outputPer1M;

    this.costs.anthropic.cost += cost;
  }

  /**
   * Track OpenAI API call
   * @param {Object} usage - Usage data from API response
   */
  trackOpenAI(usage) {
    if (!usage) return;

    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;

    this.costs.openai.requests++;
    this.costs.openai.inputTokens += inputTokens;
    this.costs.openai.outputTokens += outputTokens;

    const cost = (inputTokens / 1000000) * PRICING.openai.inputPer1M +
                 (outputTokens / 1000000) * PRICING.openai.outputPer1M;

    this.costs.openai.cost += cost;
  }

  /**
   * Track Perplexity API call
   */
  trackPerplexity() {
    this.costs.perplexity.requests++;
    this.costs.perplexity.cost += PRICING.perplexity.perRequest;
  }

  /**
   * Track SerpAPI call
   */
  trackSerpAPI() {
    this.costs.serpapi.requests++;
    this.costs.serpapi.cost += PRICING.serpapi.perSearch;
  }

  /**
   * Track DataForSEO call
   */
  trackDataForSEO() {
    this.costs.dataforseo.requests++;
    this.costs.dataforseo.cost += PRICING.dataforseo.perRequest;
  }

  /**
   * Get total estimated cost
   * @returns {number}
   */
  getTotalCost() {
    return Object.values(this.costs).reduce((total, service) => total + service.cost, 0);
  }

  /**
   * Get summary of costs
   * @returns {Object}
   */
  getSummary() {
    const totalCost = this.getTotalCost();

    return {
      totalCost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimals
      breakdown: {
        anthropic: {
          requests: this.costs.anthropic.requests,
          inputTokens: this.costs.anthropic.inputTokens,
          outputTokens: this.costs.anthropic.outputTokens,
          cost: Math.round(this.costs.anthropic.cost * 10000) / 10000,
        },
        openai: {
          requests: this.costs.openai.requests,
          inputTokens: this.costs.openai.inputTokens,
          outputTokens: this.costs.openai.outputTokens,
          cost: Math.round(this.costs.openai.cost * 10000) / 10000,
        },
        perplexity: {
          requests: this.costs.perplexity.requests,
          cost: Math.round(this.costs.perplexity.cost * 10000) / 10000,
        },
        serpapi: {
          requests: this.costs.serpapi.requests,
          cost: Math.round(this.costs.serpapi.cost * 10000) / 10000,
        },
        dataforseo: {
          requests: this.costs.dataforseo.requests,
          cost: Math.round(this.costs.dataforseo.cost * 10000) / 10000,
        },
      },
    };
  }

  /**
   * Format cost for display
   * @param {number} cost
   * @returns {string}
   */
  static formatCost(cost) {
    if (cost < 0.01) {
      return `$${(cost * 100).toFixed(4)} cents`;
    }
    return `$${cost.toFixed(4)}`;
  }
}

// Export singleton instance
export const costTracker = new CostTracker();
