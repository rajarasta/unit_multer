/**
 * Price Calculator Utilities
 * Business logic for price comparisons and calculations
 * Used by: IRIS3, future accounting/pricing tabs
 */

import { TROSKOVNIK_BASELINE_PRICE } from './schutoConstants.js';

/**
 * Calculates troškovnik comparison data
 * @param {number} llmPrice - LLM estimated price
 * @param {number} baselinePrice - Troškovnik baseline price (default: 2000 EUR)
 * @returns {Object} - Comparison analysis object
 */
export const calculateTroskovnikComparison = (llmPrice, baselinePrice = TROSKOVNIK_BASELINE_PRICE) => {
  if (!llmPrice || typeof llmPrice !== 'number') {
    return null;
  }
  
  const difference = Math.abs(llmPrice - baselinePrice);
  const isHigher = llmPrice > baselinePrice;
  
  return {
    troskovnik_price: baselinePrice,
    llm_price: llmPrice,
    difference: difference,
    is_llm_higher: isHigher,
    color: isHigher ? 'red' : 'green',
    status: isHigher ? 'skuplje' : 'jeftinije',
    percentage_diff: ((difference / baselinePrice) * 100).toFixed(1)
  };
};

/**
 * Calculates total pricing from components
 * @param {Object} pricing - Pricing components object
 * @returns {Object} - Updated pricing with calculated total
 */
export const calculateTotalPricing = (pricing) => {
  if (!pricing || typeof pricing !== 'object') {
    return pricing;
  }
  
  const { materijal = 0, staklo = 0, rad = 0 } = pricing;
  const total = materijal + staklo + rad;
  
  return {
    ...pricing,
    total: total
  };
};

/**
 * Formats price for display
 * @param {number} price - Price value
 * @param {string} currency - Currency code (default: EUR)
 * @returns {string} - Formatted price string
 */
export const formatPrice = (price, currency = 'EUR') => {
  if (typeof price !== 'number' || isNaN(price)) {
    return '0 EUR';
  }
  
  return `${price.toLocaleString('hr-HR')} ${currency}`;
};

/**
 * Checks if user input contains troškovnik comparison request
 * @param {string} userInput - User voice input
 * @returns {boolean} - True if troškovnik comparison requested
 */
export const isTroskovnikComparisonRequested = (userInput) => {
  if (!userInput || typeof userInput !== 'string') {
    return false;
  }
  
  const lowerInput = userInput.toLowerCase();
  
  const troskovnikKeywords = [
    'provjeri u troškovniku',
    'provjeri troškovnik',
    'usporedba troškovnik',
    'troškovnik provjera',
    'compare with budget',
    'check budget'
  ];
  
  return troskovnikKeywords.some(keyword => lowerInput.includes(keyword));
};

/**
 * Generates pricing breakdown for display
 * @param {Object} analysis - Schüco analysis with pricing data
 * @param {string} userInput - Original user input for troškovnik check
 * @returns {Object} - Enhanced analysis with pricing breakdown
 */
export const enhancePricingAnalysis = (analysis, userInput) => {
  if (!analysis || !analysis.pricing) {
    return analysis;
  }
  
  // Calculate total if missing
  const updatedPricing = calculateTotalPricing(analysis.pricing);
  
  // Check for troškovnik comparison request
  let troskovnikComparison = null;
  if (isTroskovnikComparisonRequested(userInput) && updatedPricing.total) {
    troskovnikComparison = calculateTroskovnikComparison(updatedPricing.total);
  }
  
  return {
    ...analysis,
    pricing: updatedPricing,
    troskovnik_check: troskovnikComparison
  };
};