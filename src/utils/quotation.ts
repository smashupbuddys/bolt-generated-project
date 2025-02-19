import { format } from 'date-fns';
import type { QuotationItem } from '../types/quotation';

export const generateQuotationNumber = () => {
  return `Q${format(new Date(), 'yyyyMMdd')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
};

export const calculateTotals = (items: QuotationItem[], discount: number) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  const gstAmount = total * 0.18; // 18% GST
  const finalTotal = total + gstAmount;

  return {
    subtotal,
    discountAmount,
    total,
    gstAmount,
    finalTotal
  };
};

export const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  })}`;
};

export const validateQuotation = (items: QuotationItem[]) => {
  if (items.length === 0) {
    return 'Please add items to the quotation';
  }

  for (const item of items) {
    if (item.quantity > item.product.stockLevel) {
      return `Insufficient stock for ${item.product.name}`;
    }
    if (item.quantity <= 0) {
      return `Invalid quantity for ${item.product.name}`;
    }
    if (item.price <= 0) {
      return `Invalid price for ${item.product.name}`;
    }
  }

  return null;
};

export const getDiscountLimits = (
  customerType: 'wholesaler' | 'retailer',
  isAdvancedDiscountEnabled: boolean
) => {
  if (isAdvancedDiscountEnabled) {
    return {
      max: 100,
      presets: [5, 10, 15, 20, 25, 30]
    };
  }

  return customerType === 'retailer'
    ? {
        max: 3,
        presets: [1, 2, 3]
      }
    : {
        max: 10,
        presets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      };
};
