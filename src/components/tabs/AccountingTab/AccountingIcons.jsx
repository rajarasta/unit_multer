import React from 'react';
import { Receipt, CreditCard, Banknote, FileText, TrendingDown, TrendingUp } from 'lucide-react';

export const getAccountingIcon = (type) => {
  const iconMap = {
    invoice: Receipt,
    expense: TrendingDown,
    payment: CreditCard,
    report: FileText
  };
  
  return iconMap[type] || FileText;
};

export const getAccountingIconEmoji = (type) => {
  const emojiMap = {
    invoice: '📄',
    expense: '💸',
    payment: '💳',
    report: '📊'
  };
  
  return emojiMap[type] || '📄';
};

export const getStatusIcon = (status) => {
  const iconMap = {
    'plaćeno': '✅',
    'neplaćeno': '❌',
    'dospjelo': '🔴',
    'u tijeku': '🟡',
    'obrađeno': '✅'
  };
  
  return iconMap[status] || '⚪';
};

export const getStatusColor = (status) => {
  const colorMap = {
    'plaćeno': 'bg-green-100 text-green-800 border-green-200',
    'neplaćeno': 'bg-gray-100 text-gray-800 border-gray-200',
    'dospjelo': 'bg-red-100 text-red-800 border-red-200',
    'u tijeku': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'obrađeno': 'bg-blue-100 text-blue-800 border-blue-200'
  };
  
  return colorMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export const getAmountColor = (type, amount) => {
  if (type === 'payment') {
    return 'text-green-600 font-semibold';
  }
  if (type === 'expense') {
    return 'text-red-600 font-semibold';
  }
  if (type === 'invoice') {
    return 'text-blue-600 font-semibold';
  }
  return 'text-gray-600 font-medium';
};

const AccountingIcons = () => {
  return (
    <div className="flex items-center gap-4 text-sm text-gray-500">
      <div className="flex items-center gap-1">
        <Receipt className="w-4 h-4" />
        <span>Računi</span>
      </div>
      <div className="flex items-center gap-1">
        <TrendingDown className="w-4 h-4" />
        <span>Troškovi</span>
      </div>
      <div className="flex items-center gap-1">
        <CreditCard className="w-4 h-4" />
        <span>Uplate</span>
      </div>
      <div className="flex items-center gap-1">
        <FileText className="w-4 h-4" />
        <span>Izvještaji</span>
      </div>
    </div>
  );
};

export default AccountingIcons;