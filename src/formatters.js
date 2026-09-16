// Formatting Utilities for Financial Values

export let currentCurrency = 'INR'; // 'INR' | 'USD'

export function setCurrency(curr) {
  currentCurrency = curr;
}

/**
 * Format currency with compact labels (e.g., ₹1.24 Cr, ₹45.50 L, ₹25K)
 */
export function formatCompactCurrency(val, currency = currentCurrency) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const isNegative = val < 0;
  const absVal = Math.abs(val);

  if (currency === 'INR') {
    let formatted = '';
    if (absVal >= 1e7) {
      formatted = `₹${(absVal / 1e7).toFixed(2)} Cr`;
    } else if (absVal >= 1e5) {
      formatted = `₹${(absVal / 1e5).toFixed(2)} L`;
    } else if (absVal >= 1e3) {
      formatted = `₹${(absVal / 1e3).toFixed(1)} K`;
    } else {
      formatted = `₹${Math.round(absVal).toLocaleString('en-IN')}`;
    }
    return isNegative ? `-${formatted}` : formatted;
  } else {
    // USD formatting
    let formatted = '';
    if (absVal >= 1e9) {
      formatted = `$${(absVal / 1e9).toFixed(2)}B`;
    } else if (absVal >= 1e6) {
      formatted = `$${(absVal / 1e6).toFixed(2)}M`;
    } else if (absVal >= 1e3) {
      formatted = `$${(absVal / 1e3).toFixed(1)}K`;
    } else {
      formatted = `$${Math.round(absVal).toLocaleString('en-US')}`;
    }
    return isNegative ? `-${formatted}` : formatted;
  }
}

/**
 * Full currency formatting (e.g., ₹10,50,000)
 */
export function formatFullCurrency(val, currency = currentCurrency) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const isNegative = val < 0;
  const absVal = Math.round(Math.abs(val));

  if (currency === 'INR') {
    const formatted = `₹${absVal.toLocaleString('en-IN')}`;
    return isNegative ? `-${formatted}` : formatted;
  } else {
    const formatted = `$${absVal.toLocaleString('en-US')}`;
    return isNegative ? `-${formatted}` : formatted;
  }
}

/**
 * Percentage formatting (e.g., 12.0%)
 */
export function formatPercent(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  return `${val >= 0 ? '' : ''}${val.toFixed(decimals)}%`;
}

/**
 * Format month index to readable time string
 */
export function formatMonthTime(monthIndex) {
  const year = Math.ceil(monthIndex / 12);
  const monthInYear = ((monthIndex - 1) % 12) + 1;
  return `Month ${monthIndex} (Y${year}·M${monthInYear})`;
}
