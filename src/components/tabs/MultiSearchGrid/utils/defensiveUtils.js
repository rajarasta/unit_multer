/**
 * Defensive Programming Utilities
 * Comprehensive protection against "Cannot read properties of undefined" errors
 */

// Safe property access with optional chaining fallbacks
export const safeGet = (obj, path, defaultValue = null) => {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result == null || typeof result !== 'object') {
        return defaultValue;
      }
      result = result[key];
    }
    return result ?? defaultValue;
  } catch (error) {
    console.warn(`Safe access failed for path "${path}":`, error);
    return defaultValue;
  }
};

// Safe array operations
export const safeArray = (arr, defaultArray = []) => {
  return Array.isArray(arr) ? arr : defaultArray;
};

export const safeMap = (arr, mapFn, defaultArray = []) => {
  const safeArr = safeArray(arr, defaultArray);
  try {
    return safeArr.map(mapFn);
  } catch (error) {
    console.warn('Safe map failed:', error);
    return defaultArray;
  }
};

export const safeFilter = (arr, filterFn, defaultArray = []) => {
  const safeArr = safeArray(arr, defaultArray);
  try {
    return safeArr.filter(filterFn);
  } catch (error) {
    console.warn('Safe filter failed:', error);
    return defaultArray;
  }
};

export const safeFind = (arr, findFn, defaultValue = null) => {
  const safeArr = safeArray(arr, []);
  try {
    return safeArr.find(findFn) ?? defaultValue;
  } catch (error) {
    console.warn('Safe find failed:', error);
    return defaultValue;
  }
};

// Safe object operations
export const safeObject = (obj, defaultObject = {}) => {
  return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : defaultObject;
};

export const safeObjectKeys = (obj) => {
  return Object.keys(safeObject(obj, {}));
};

export const safeObjectValues = (obj) => {
  return Object.values(safeObject(obj, {}));
};

export const safeObjectEntries = (obj) => {
  return Object.entries(safeObject(obj, {}));
};

// Safe string operations
export const safeString = (str, defaultString = '') => {
  return typeof str === 'string' ? str : String(str || defaultString);
};

export const safeTrim = (str) => {
  return safeString(str).trim();
};

// Safe number operations
export const safeNumber = (num, defaultNumber = 0) => {
  const parsed = Number(num);
  return isNaN(parsed) ? defaultNumber : parsed;
};

// Safe function operations
export const safeFunction = (fn, defaultFn = () => {}) => {
  return typeof fn === 'function' ? fn : defaultFn;
};

export const safeCall = (fn, ...args) => {
  try {
    const safeFn = safeFunction(fn);
    return safeFn(...args);
  } catch (error) {
    console.warn('Safe function call failed:', error);
    return null;
  }
};

// Component prop validation helpers
export const withDefaults = (props, defaults) => {
  const safeProps = safeObject(props, {});
  const safeDefaults = safeObject(defaults, {});
  
  return {
    ...safeDefaults,
    ...safeProps
  };
};

// Safe component render helper
export const safeRender = (renderFn, fallbackContent = null) => {
  try {
    return safeFunction(renderFn)() || fallbackContent;
  } catch (error) {
    console.error('Component render failed:', error);
    return fallbackContent || (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 text-sm">Component failed to render</p>
        <details className="mt-2">
          <summary className="text-xs text-red-600 cursor-pointer">Error details</summary>
          <pre className="text-xs text-red-500 mt-1 whitespace-pre-wrap">
            {error.message}
          </pre>
        </details>
      </div>
    );
  }
};

// Event handler safety
export const safeEventHandler = (handler, ...defaultArgs) => {
  return (event, ...args) => {
    try {
      const safeHandler = safeFunction(handler);
      safeHandler(event, ...args, ...defaultArgs);
    } catch (error) {
      console.warn('Event handler failed:', error);
    }
  };
};

// Store/state safety
export const safeStore = (store, defaultState = {}) => {
  try {
    const state = safeFunction(store)();
    return safeObject(state, defaultState);
  } catch (error) {
    console.warn('Store access failed:', error);
    return defaultState;
  }
};

// Layout configuration safety
export const safeLayoutConfig = (config) => {
  const defaultConfig = {
    rows: 2,
    cols: 2,
    total: 4
  };
  
  const safeConfig = safeObject(config, defaultConfig);
  
  return {
    rows: safeNumber(safeConfig.rows, defaultConfig.rows),
    cols: safeNumber(safeConfig.cols, defaultConfig.cols),
    total: safeNumber(safeConfig.total, defaultConfig.total)
  };
};

// Unit configuration safety
export const safeUnit = (unit) => {
  const defaultUnit = {
    id: 'default-unit',
    unitName: 'default',
    contentType: 'default',
    dropdownValue: 'tekst',
    mode: 'input',
    prompt: 'Enter query...',
    aiSource: 'local1',
    model: 'Model A'
  };
  
  return withDefaults(unit, defaultUnit);
};

// Grid layout item safety
export const safeLayoutItem = (item) => {
  const defaultItem = {
    i: 'default',
    x: 0,
    y: 0,
    w: 6,
    h: 8,
    minW: 3,
    minH: 4
  };
  
  const safeItem = withDefaults(item, defaultItem);
  
  return {
    ...safeItem,
    x: safeNumber(safeItem.x),
    y: safeNumber(safeItem.y),
    w: safeNumber(safeItem.w),
    h: safeNumber(safeItem.h),
    minW: safeNumber(safeItem.minW),
    minH: safeNumber(safeItem.minH)
  };
};

// Audio safety
export const safeAudio = (audioSystem) => {
  const defaultAudio = {
    playSound: () => {},
    click: () => {},
    layoutChange: () => {},
    modeSwitch: () => {},
    fusionSuccess: () => {},
    dragStart: () => {},
    dragEnd: () => {},
    undo: () => {},
    redo: () => {},
    ambient: {
      start: () => {},
      stop: () => {},
      setVolume: () => {}
    }
  };
  
  return withDefaults(audioSystem, defaultAudio);
};

// Animation safety
export const safeAnimation = (animationFn, element, options = {}) => {
  try {
    if (!element || typeof animationFn !== 'function') {
      return null;
    }
    return animationFn(element, options);
  } catch (error) {
    console.warn('Animation failed:', error);
    return null;
  }
};

// Development helpers
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

export const safeLog = (...args) => {
  if (isDevelopment()) {
    console.log(...args);
  }
};

export const safeWarn = (...args) => {
  if (isDevelopment()) {
    console.warn(...args);
  }
};

export const safeError = (...args) => {
  console.error(...args);
};

// Higher-order component for comprehensive error boundary
export const withSafeProps = (Component, defaultProps = {}) => {
  return (props) => {
    const safeProps = withDefaults(props, defaultProps);
    
    return safeRender(
      () => <Component {...safeProps} />,
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700 text-sm">
          Component {Component.name || 'Unknown'} failed to render with safe props
        </p>
      </div>
    );
  };
};