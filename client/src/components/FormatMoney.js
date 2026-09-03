import { jsx as _jsx } from "react/jsx-runtime";
export function formatMoneyMinor(amountMinor, currency = 'INR') {
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
export const FormatMoney = ({ amountMinor, currency = 'INR', className = '' }) => {
    return _jsx("span", { className: `font-mono ${className}`, children: formatMoneyMinor(amountMinor, currency) });
};
