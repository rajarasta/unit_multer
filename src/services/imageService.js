/**
 * Image Service
 * Centralized image loading and validation for demo data
 * Used by: IRIS3, ShowcasePanel, future tabs with image assets
 */

/**
 * Checks if image exists at given path
 * @param {string} imagePath - Full image path (e.g., '/demo_data/AWS_65.png')
 * @returns {Promise<string|null>} - Image URL if exists, null otherwise
 */
export const checkImageExists = async (imagePath) => {
  try {
    const response = await fetch(imagePath, { method: 'HEAD' });
    return response.ok ? imagePath : null;
  } catch (error) {
    console.warn(`Image check failed for ${imagePath}:`, error);
    return null;
  }
};

/**
 * Checks if Schüco system image exists in demo_data folder
 * @param {string} systemName - System name (e.g., 'AWS 65', 'AD UP')
 * @returns {Promise<string|null>} - Image URL if exists, null otherwise
 */
export const checkSchutoSystemImage = async (systemName) => {
  if (!systemName) return null;
  
  // Use the exact filename format as stored (with spaces, not underscores)
  const imageName = `${systemName}.png`;
  const imagePath = `/demo_data/${imageName}`;
  
  return await checkImageExists(imagePath);
};

/**
 * Checks if detail image exists in demo_data2 folder
 * @param {string} imageName - Image filename (e.g., 'shema.png', 'donji_detalj1.png')
 * @returns {Promise<string|null>} - Image URL if exists, null otherwise
 */
export const checkDetailImage = async (imageName) => {
  if (!imageName) return null;
  
  const imagePath = `/demo_data2/${imageName}`;
  return await checkImageExists(imagePath);
};

/**
 * Loads multiple images with fallback handling
 * @param {Array<string>} imagePaths - Array of image paths to check
 * @returns {Promise<Array<Object>>} - Array of {path, url, exists} objects
 */
export const loadMultipleImages = async (imagePaths) => {
  if (!Array.isArray(imagePaths)) return [];
  
  const results = await Promise.all(
    imagePaths.map(async (path) => {
      const url = await checkImageExists(path);
      return {
        path,
        url,
        exists: !!url
      };
    })
  );
  
  return results;
};

/**
 * Loads all detail images for projektiranje workflow
 * @param {Object} config - Configuration object
 * @param {string} config.shemaImage - Shema image name
 * @param {string} config.donjiDetalj - Donji detalj image name
 * @param {string} config.bocniDetalj - Bocni detalj image name  
 * @param {string} config.gornjiDetalj - Gornji detalj image name
 * @returns {Promise<Object>} - Object with loaded image URLs
 */
export const loadProjektDetailImages = async ({
  donjiDetalj = 'donji_detalj1.png',
  bocniDetalj = 'detalj_bocno.png', // Actual filename is detalj_bocno.png
  gornjiDetalj = 'gornji_detalj.png' // Actual filename is gornji_detalj.png (not gornji_detalj1.png)
} = {}) => {
  const [donji, bocni, gornji] = await Promise.all([
    checkDetailImage(donjiDetalj),
    checkDetailImage(bocniDetalj),
    checkDetailImage(gornjiDetalj)
  ]);
  
  return {
    shema: {
      image_url: null,
      name: 'Shema',
      has_image: false,
      use_css_renderer: true // Flag to indicate CSS rendering
    },
    donji_detalj: {
      image_url: donji,
      name: 'Donji detalj',
      variant: donjiDetalj.replace('.png', ''),
      has_image: !!donji
    },
    bocni_detalj: {
      image_url: bocni,
      name: 'Bočni detalj',
      has_image: !!bocni
    },
    gornji_detalj: {
      image_url: gornji,
      name: 'Gornji detalj',
      variant: gornjiDetalj.replace('.png', ''),
      has_image: !!gornji
    }
  };
};

/**
 * Preloads images for better performance
 * @param {Array<string>} imageUrls - Array of image URLs to preload
 * @returns {Promise<Array<HTMLImageElement>>} - Array of loaded image elements
 */
export const preloadImages = async (imageUrls) => {
  if (!Array.isArray(imageUrls)) return [];
  
  const loadPromises = imageUrls
    .filter(url => url) // Filter out null/undefined URLs
    .map(url => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    }));
  
  try {
    return await Promise.all(loadPromises);
  } catch (error) {
    console.warn('Some images failed to preload:', error);
    return [];
  }
};

/**
 * Gets image dimensions
 * @param {string} imageUrl - Image URL
 * @returns {Promise<Object>} - Object with width and height
 */
export const getImageDimensions = (imageUrl) => {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      reject(new Error('No image URL provided'));
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight
      });
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
    img.src = imageUrl;
  });
};