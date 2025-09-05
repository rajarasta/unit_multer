import React from 'react';

/**
 * ProgressBar - Komponenta za prikaz progress bar-a
 * 
 * @param {number} progress - Progress value (0-100)
 * @param {string} message - Progress message
 * @param {string} variant - Color variant (blue, green, yellow, red)
 */
export default function ProgressBar({ 
  progress = 0, 
  message = '', 
  variant = 'blue',
  className = ''
}) {
  const getColorClasses = () => {
    switch (variant) {
      case 'green':
        return 'bg-green-50 border-green-200 text-green-800 bg-green-600';
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 bg-yellow-600';
      case 'red':
        return 'bg-red-50 border-red-200 text-red-800 bg-red-600';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800 bg-blue-600';
    }
  };

  const colors = getColorClasses();
  const [bgColor, borderColor, textColor, barColor] = colors.split(' ');

  return (
    <div className={`${bgColor} border-b px-6 py-3 ${className}`}>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className={`font-medium ${textColor}`}>
          {message || 'Obrađuje...'}
        </span>
        <span className={textColor}>
          {Math.round(progress)}%
        </span>
      </div>
      <div className={`w-full bg-white/50 rounded-full h-2 overflow-hidden`}>
        <div 
          className={`${barColor} h-2 rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}