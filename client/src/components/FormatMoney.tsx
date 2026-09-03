import React from 'react';

export function formatMoneyMinor(amountMinor: number, currency = 'INR'): string {
  const major = amountMinor / 100;
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(major);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(major);
}

export const FormatMoney: React.FC<{ amountMinor: number; currency?: string; className?: string }> = ({
  amountMinor,
  currency = 'INR',
  className = ''
}) => {
  return <span className={`font-mono ${className}`}>{formatMoneyMinor(amountMinor, currency)}</span>;
};
