import React from 'react';
import type { QuotationItem } from './QuickQuotation';
import type { Customer, VideoCall } from '../../types';
import { format } from 'date-fns';
import { Diamond } from 'lucide-react';

interface PrintQuotationProps {
  items: QuotationItem[];
  customerType: 'wholesaler' | 'retailer';
  total: number;
  customer?: Customer | null;
  discount: number;
  videoCall?: VideoCall | null;
  quotationNumber?: string;
}

const PrintQuotation: React.FC<PrintQuotationProps> = ({
  items,
  customerType,
  total,
  customer,
  discount,
  videoCall,
  quotationNumber = `Q${format(new Date(), 'yyyyMMdd')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
}) => {
  const printSettings = JSON.parse(localStorage.getItem('printSettings') || '{}');
  const { showHeader, showFooter, showLogo, headerText, footerText, termsText, additionalNotes, showPriceBreakdown, showDiscount, discountPercent } = {
    showHeader: true,
    showFooter: true,
    showLogo: true,
    headerText: 'Jewelry Management System',
    footerText: 'Thank you for your business!\nFor any queries, please contact: +91 1234567890',
    termsText: '1. Quotation valid for 7 days from the date of issue\n2. Prices are subject to change without prior notice\n3. GST will be charged as applicable\n4. Delivery timeline will be confirmed upon order confirmation',
    additionalNotes: '',
    showPriceBreakdown: true,
    showDiscount: false,
    discountPercent: 0,
    ...printSettings
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const gstAmount = (total * 0.18); // 18% GST
  const finalTotal = total + gstAmount;

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 print:p-4">
      {/* Header */}
      {showHeader && (
        <div className="text-center mb-8">
          {showLogo && (
            <div className="mb-4">
              {/* You can add your logo here */}
              <Diamond className="h-8 w-8 text-blue-600 mx-auto" />
              <div className="text-3xl font-bold text-blue-600">JMS</div>
            </div>
          )}
          <h1 className="text-2xl font-bold">{headerText}</h1>
          <p className="text-gray-600">Quotation</p>
          <div className="mt-4 flex justify-between text-sm text-gray-500">
            <div>
              <p>Date: {format(new Date(), 'dd/MM/yyyy')}</p>
              <p>Customer Type: {customerType === 'wholesaler' ? 'Wholesale' : 'Retail'}</p>
            </div>
            <div>
              <p>Quotation #: {quotationNumber}</p>
              <p>Valid Until: {format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details */}
      {customer && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Bill To:</h3>
              <p className="font-medium">{customer.name}</p>
              <p className="text-sm text-gray-600">{customer.address}</p>
              <p className="text-sm text-gray-600">{customer.city}, {customer.state} {customer.pincode}</p>
              {customer.gst_number && (
                <p className="text-sm text-gray-600">GSTIN: {customer.gst_number}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Phone: {customer.phone}</p>
              {customer.email && (
                <p className="text-sm text-gray-600">Email: {customer.email}</p>
              )}
              <p className="text-sm text-gray-600">Customer Type: {customerType}</p>
              {videoCall && (
                <p className="text-sm text-blue-600 mt-2">Video Call Quotation</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      <table className="w-full mb-6">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="py-2 text-left text-sm font-semibold text-gray-600">Description</th>
            <th className="py-2 text-right text-sm font-semibold text-gray-600">Unit Price</th>
            <th className="py-2 text-right text-sm font-semibold text-gray-600">Quantity</th>
            <th className="py-2 text-right text-sm font-semibold text-gray-600">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item, index) => (
            <tr key={index}>
              <td className="py-3">
                <div className="font-medium">{item.product.name}</div>
                <div className="text-sm text-gray-500">SKU: {item.product.sku}</div>
                {item.product.description && (
                  <div className="text-sm text-gray-500">{item.product.description}</div>
                )}
              </td>
              <td className="py-3 text-right">₹{item.price.toLocaleString()}</td>
              <td className="py-3 text-right">{item.quantity}</td>
              <td className="py-3 text-right">₹{(item.price * item.quantity).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-2">
          {showPriceBreakdown && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              
              {showDiscount && discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({discountPercent}%):</span>
                  <span>-₹{discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (18%):</span>
                <span>₹{gstAmount.toLocaleString()}</span>
              </div>
            </>
          )}
          
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
            <span>Total:</span>
            <span>₹{finalTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Terms and Bank Details */}
      <div className="grid grid-cols-2 gap-6 border-t border-gray-200 pt-6">
        <div>
          <h3 className="text-sm font-semibold mb-2">Terms & Conditions:</h3>
          <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
            {termsText.split('\n').map((term, index) => (
              <li key={index}>{term}</li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2">Bank Details:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Bank Name: HDFC Bank</p>
            <p>Account Name: Jewelry Management System</p>
            <p>Account Number: XXXXX XXXXX XXX</p>
            <p>IFSC Code: HDFC0XXXXX</p>
            <p>Branch: Diamond District</p>
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      {additionalNotes && (
        <div className="text-sm text-gray-600 mt-4">
          <p className="font-medium mb-2">Additional Notes:</p>
          <p className="whitespace-pre-line">{additionalNotes}</p>
        </div>
      )}

      {/* Footer */}
      {showFooter && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p>Thank you for your business!</p>
              <p>For any queries, please contact:</p>
              <p>Phone: +91 98765 43210</p>
              <p>Email: sales@jewelryms.com</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium mb-8">For Jewelry Management System</p>
              <p className="text-sm text-gray-600">Authorized Signatory</p>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintQuotation;
