import React from 'react';

export function Card({ className = '', style, ...props }) {
  return <div className={`l-card ${className}`} style={style} {...props} />;
}

export function Section({ className = '', style, ...props }) {
  return <div className={`l-section ${className}`} style={style} {...props} />;
}

export function Button({ variant = 'default', className = '', ...props }) {
  const variantClass =
    variant === 'primary' ? 'l-btn--primary' :
    variant === 'subtle' ? 'l-btn--subtle' :
    variant === 'outline' ? 'l-btn--outline' : '';
  return <button className={`l-btn ${variantClass} ${className}`} {...props} />;
}
