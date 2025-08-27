import React from 'react';

export function Card({ className = '', style, ...props }) {
  return <div className="l-card p-4" style={style} {...props} />;
}

export function Section({ className = '', style, ...props }) {
  return <div className="l-section p-3" style={style} {...props} />;
}

export function Button({ variant='default', className='', ...props }) {
  const v = variant === 'primary' ? 'al-btn--primary' : '';
  return <button className="l-btn" {...props} />;
}