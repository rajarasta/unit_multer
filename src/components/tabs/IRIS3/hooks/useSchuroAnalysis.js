/**
 * useSchuroAnalysis Hook
 * Manages Schüco system analysis functionality for IRIS3 Prodaja tab
 * Handles LLM response processing, image loading, and troškovnik comparison
 */

import { useState } from 'react';
import { checkSchutoSystemImage } from '../../../../services/imageService.js';
import { parseSchutoResponse, createFallbackSchutoAnalysis } from '../../../../utils/jsonParser.js';
import { enhancePricingAnalysis } from '../../../../utils/priceCalculator.js';

export const useSchuroAnalysis = () => {
  const [schuroAnalysis, setSchuroAnalysis] = useState(null);
  const [showMiniContainers, setShowMiniContainers] = useState(false);
  const [prodajaResponse, setProdajaResponse] = useState('');

  const executeProdajaTool = async (llmResponse, userInput) => {
    try {
      // Try to parse LLM response
      let analysis = parseSchutoResponse(llmResponse);
      
      if (!analysis) {
        // Fallback to smart mock analysis
        console.warn('LLM parsing failed, using fallback analysis');
        analysis = createFallbackSchutoAnalysis(userInput);
      }
      
      // Load system image
      let imageUrl = null;
      if (analysis.brochure && analysis.brochure.system) {
        imageUrl = await checkSchutoSystemImage(analysis.brochure.system);
      }
      
      // Enhance analysis with pricing and troškovnik comparison
      const enhancedAnalysis = enhancePricingAnalysis(analysis, userInput);
      
      // Add image data to brochure
      enhancedAnalysis.brochure = {
        ...enhancedAnalysis.brochure,
        image_url: imageUrl,
        has_image: !!imageUrl
      };
      
      // Update state
      setSchuroAnalysis(enhancedAnalysis);
      setShowMiniContainers(true);
      
      // Generate response message
      const troskovnikComparison = enhancedAnalysis.troskovnik_check;
      const responseMessage = troskovnikComparison 
        ? `${analysis.analysis?.sistema_selected} - ${analysis.tip?.selected} | Troškovnik: ${troskovnikComparison.difference}€ ${troskovnikComparison.status}`
        : `Analiziram Schüco sistem: ${analysis.analysis?.sistema_selected || 'N/A'} - ${analysis.tip?.selected || 'N/A'}`;
      
      setProdajaResponse(responseMessage);
      return responseMessage;
      
    } catch (error) {
      console.error('Prodaja tool execution error:', error);
      
      // Create fallback analysis on any error
      const fallbackAnalysis = createFallbackSchutoAnalysis(userInput);
      const enhancedFallback = enhancePricingAnalysis(fallbackAnalysis, userInput);
      
      // Load image for fallback
      const imageUrl = await checkSchutoSystemImage(enhancedFallback.brochure.system);
      enhancedFallback.brochure.image_url = imageUrl;
      enhancedFallback.brochure.has_image = !!imageUrl;
      
      setSchuroAnalysis(enhancedFallback);
      setShowMiniContainers(true);
      
      const troskovnikComparison = enhancedFallback.troskovnik_check;
      const fallbackMessage = troskovnikComparison 
        ? `[DEMO] ${enhancedFallback.analysis.sistema_selected} - ${enhancedFallback.tip.selected} | Troškovnik: ${troskovnikComparison.difference}€ ${troskovnikComparison.status}`
        : `[SMART DEMO] ${enhancedFallback.analysis.sistema_selected} - ${enhancedFallback.tip.selected} (iz transkripte)`;
      
      setProdajaResponse(fallbackMessage);
      return fallbackMessage;
    }
  };

  const clearAnalysis = () => {
    setSchuroAnalysis(null);
    setShowMiniContainers(false);
    setProdajaResponse('');
  };

  return {
    schuroAnalysis,
    showMiniContainers,
    prodajaResponse,
    executeProdajaTool,
    clearAnalysis,
    setShowMiniContainers
  };
};

export default useSchuroAnalysis;