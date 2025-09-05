import React, { useMemo } from 'react';

/**
 * EditableField - Komponenta za prikaz i uređivanje polja
 * 
 * Prikazuje podatak kao read-only ili kao input field ovisno o edit mode
 * Podržava različite tipove podataka (text, number, date)
 * 
 * @param {string} label - Label za polje
 * @param {*} value - Trenutna vrijednost
 * @param {string} fieldPath - Putanja do polja (za onChange callback)
 * @param {Function} onChange - Callback za promjene
 * @param {boolean} editMode - Da li je omogućeno uređivanje
 * @param {string} type - Tip input-a (text, date, number)
 * @param {string} placeholder - Placeholder tekst
 * @param {boolean} isNumeric - Da li je polje numeričko
 * @param {boolean} required - Da li je polje obavezno
 * @param {Function} validator - Custom validacija funkcija
 */
export default function EditableField({ 
  label, 
  value, 
  fieldPath, 
  onChange, 
  editMode = false, 
  type = 'text', 
  placeholder = 'N/A', 
  isNumeric = false,
  required = false,
  validator = null,
  className = '',
  ...inputProps 
}) {
  
  // Calculated display value
  const displayValue = useMemo(() => {
    if (value === null || value === undefined || value === '') {
      return placeholder;
    }
    
    if (isNumeric) {
      const num = Number(value);
      return isNaN(num) ? placeholder : num.toFixed(2);
    }
    
    return String(value);
  }, [value, isNumeric, placeholder]);

  // Validation state
  const validationError = useMemo(() => {
    if (!editMode || !validator) return null;
    
    try {
      return validator(value);
    } catch (error) {
      return error.message;
    }
  }, [value, editMode, validator]);

  // Handle input change
  const handleChange = (e) => {
    let newValue = e.target.value;
    
    // Convert numeric values
    if (isNumeric && newValue !== '') {
      newValue = parseFloat(newValue) || 0;
    }
    
    onChange?.(fieldPath, newValue);
  };

  // Determine input type
  const inputType = (() => {
    if (type === 'date') return 'date';
    if (isNumeric) return 'number';
    return 'text';
  })();

  // Style classes
  const labelClasses = `
    block text-sm font-medium mb-1 
    ${required ? 'text-gray-800' : 'text-gray-700'}
    ${validationError ? 'text-red-700' : ''}
  `;

  const displayClasses = `
    p-3 bg-gray-100 rounded-lg font-medium transition-colors
    ${isNumeric ? 'text-right' : ''}
    ${!value && value !== 0 ? 'text-gray-400 italic' : 'text-gray-800'}
    ${editMode ? 'cursor-text hover:bg-gray-200' : ''}
  `;

  const inputClasses = `
    w-full px-3 py-2 border rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    ${isNumeric ? 'text-right' : ''}
    ${validationError 
      ? 'border-red-300 bg-red-50 text-red-700' 
      : 'border-gray-300 bg-white text-gray-900'
    }
    disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
  `;

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Label */}
      <label className={labelClasses}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {/* Input or Display */}
      {editMode ? (
        <div>
          <input
            type={inputType}
            step={isNumeric ? "0.01" : undefined}
            value={value === null || value === undefined ? '' : String(value)}
            onChange={handleChange}
            className={inputClasses}
            placeholder={placeholder}
            required={required}
            {...inputProps}
          />
          
          {/* Validation Error */}
          {validationError && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
              {validationError}
            </p>
          )}
        </div>
      ) : (
        <div 
          className={displayClasses}
          onClick={() => editMode && document.querySelector(`input[data-field="${fieldPath}"]`)?.focus()}
        >
          {displayValue}
        </div>
      )}
      
      {/* Helper Text */}
      {type === 'date' && !editMode && value && (
        <p className="text-xs text-gray-500">
          {new Date(value).toLocaleDateString('hr-HR', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </p>
      )}
    </div>
  );
}

/**
 * Pre-configured field components za česte use case-ove
 */

export function CurrencyField({ value, currency = 'EUR', ...props }) {
  const displayValue = useMemo(() => {
    if (!value && value !== 0) return 'N/A';
    return `${Number(value).toFixed(2)} ${currency}`;
  }, [value, currency]);

  return (
    <EditableField
      {...props}
      value={value}
      isNumeric={true}
      placeholder={`0.00 ${currency}`}
    />
  );
}

export function DateField({ value, ...props }) {
  return (
    <EditableField
      {...props}
      value={value}
      type="date"
      placeholder="Odaberite datum"
    />
  );
}

export function NumberField({ value, decimals = 2, ...props }) {
  return (
    <EditableField
      {...props}
      value={value}
      isNumeric={true}
      step={decimals > 0 ? `0.${'0'.repeat(decimals - 1)}1` : '1'}
    />
  );
}

export function TextAreaField({ value, onChange, fieldPath, editMode, label, rows = 3, ...props }) {
  const handleChange = (e) => {
    onChange?.(fieldPath, e.target.value);
  };

  if (!editMode) {
    return (
      <EditableField
        {...props}
        value={value}
        onChange={onChange}
        fieldPath={fieldPath}
        editMode={editMode}
        label={label}
      />
    );
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium mb-1 text-gray-700">
        {label}
      </label>
      <textarea
        value={value || ''}
        onChange={handleChange}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-y"
        {...props}
      />
    </div>
  );
}