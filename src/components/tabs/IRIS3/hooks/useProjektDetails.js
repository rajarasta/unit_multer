/**
 * useProjektDetails Hook
 * Manages Projektiranje workflow functionality for IRIS3
 * Handles standard detail loading, detail switching, and image management
 */

import { useState } from 'react';
import { loadProjektDetailImages, checkDetailImage } from '../../../../services/imageService.js';
import { DETAIL_VARIANTS } from '../../../../utils/schutoConstants.js';

export const useProjektDetails = () => {
  const [projektDetails, setProjektDetails] = useState(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);

  const executeProjektiranjeStandardniTool = async (userInput, currentSchuroAnalysis) => {
    try {
      // Handle "apply standard details" command
      if (userInput.toLowerCase().includes('primjeni standardne detalje') || 
          userInput.toLowerCase().includes('standardni detalji')) {
        
        const currentSystem = currentSchuroAnalysis?.analysis?.sistema_selected || 'AWS 65';
        
        // Load default detail images (using actual filenames)
        const detailImages = await loadProjektDetailImages({
          donjiDetalj: 'donji_detalj1.png',
          bocniDetalj: 'detalj_bocno.png', // Correct filename
          gornjiDetalj: 'gornji_detalj.png' // Correct filename
        });
        
        const projektData = {
          system: currentSystem,
          product_type: currentSchuroAnalysis?.tip?.selected || 'prozor',
          details: detailImages,
          transferred_from_prodaja: true,
          original_analysis: currentSchuroAnalysis
        };
        
        setProjektDetails(projektData);
        setShowProjectDetails(true);
        
        return `Primjenjeni standardni detalji za ${currentSystem}`;
      }
      
      // Handle detail switching commands
      if (projektDetails) {
        // Switch lower detail
        if (userInput.toLowerCase().includes('promijeni donji') || 
            userInput.toLowerCase().includes('donji detalj 2')) {
          return await switchDetailVariant('donji_detalj', DETAIL_VARIANTS.donji_detalj);
        }
        
        // Switch upper detail
        if (userInput.toLowerCase().includes('promijeni gornji') || 
            userInput.toLowerCase().includes('gornji detalj 2')) {
          return await switchDetailVariant('gornji_detalj', DETAIL_VARIANTS.gornji_detalj);
        }
      }
      
      return 'Nepoznata naredba za projektiranje. Koristite "Primjeni standardne detalje", "Promijeni donji detalj" ili "Promijeni gornji detalj"';
      
    } catch (error) {
      console.error('Projektiranje tool error:', error);
      return 'Greška pri primjeni standardnih detalja';
    }
  };

  const switchDetailVariant = async (detailType, variants) => {
    if (!projektDetails || !variants) return 'Greška pri promjeni detalja';
    
    const currentVariant = projektDetails.details[detailType]?.variant;
    const currentIndex = variants.indexOf(currentVariant);
    const nextIndex = (currentIndex + 1) % variants.length;
    const newVariant = variants[nextIndex];
    
    const newImageUrl = await checkDetailImage(`${newVariant}.png`);
    
    const updatedDetails = {
      ...projektDetails,
      details: {
        ...projektDetails.details,
        [detailType]: {
          ...projektDetails.details[detailType],
          image_url: newImageUrl,
          variant: newVariant,
          has_image: !!newImageUrl
        }
      }
    };
    
    setProjektDetails(updatedDetails);
    return `Promijenjen ${detailType.replace('_', ' ')} na ${newVariant}`;
  };

  const clearProjektDetails = () => {
    setProjektDetails(null);
    setShowProjectDetails(false);
  };

  const loadStandardDetails = async (system, productType) => {
    const detailImages = await loadProjektDetailImages();
    
    const projektData = {
      system: system || 'AWS 65',
      product_type: productType || 'prozor',
      details: detailImages,
      transferred_from_prodaja: true,
      original_analysis: null
    };
    
    setProjektDetails(projektData);
    setShowProjectDetails(true);
    
    return projektData;
  };

  return {
    projektDetails,
    showProjectDetails,
    executeProjektiranjeStandardniTool,
    switchDetailVariant,
    clearProjektDetails,
    loadStandardDetails,
    setShowProjectDetails,
    setProjektDetails
  };
};

export default useProjektDetails;