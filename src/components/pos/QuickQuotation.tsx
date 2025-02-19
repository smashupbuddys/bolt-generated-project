import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, Plus, Minus, Trash2, Printer, Search, Calculator, Save, FileText } from 'lucide-react';
import type { Product, Customer, VideoCall } from '../../types';
import PrintQuotation from './PrintQuotation';
import SavedQuotations from './SavedQuotations';
import { supabase } from '../../lib/supabase';
import { parseQRCode } from '../../utils/barcodeGenerator';
import { useSearchParams } from 'react-router-dom';
import debounce from '../../utils/debounce';
import { format } from 'date-fns';
import { generateQuotationNumber, calculateTotals, formatCurrency, validateQuotation, getDiscountLimits } from '../../utils/quotation';
import ProductSearch from './ProductSearch';

interface QuotationItem {
  product: {
    id: string;
    name: string;
    description: string;
    manufacturer: string;
    sku: string;
    buyPrice: number;
    wholesalePrice: number;
    retailPrice: number;
    stockLevel: number;
    category: string;
    imageUrl: string;
    qrCode: string;
    code128: string;
    cipher: string;
    additionalInfo?: string;
  };
  quantity: number;
  price: number;
  originalPrice: number;
}

function QuickQuotation() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [customerType, setCustomerType] = useState<'wholesaler' | 'retailer'>('retailer');
  const [scanning, setScanning] = useState(false);
  const [scannedSku, setScannedSku] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [videoCall, setVideoCall] = useState<VideoCall | null>(null);
  const [isCounterSale, setIsCounterSale] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [secretCode, setSecretCode] = useState('');
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [isAdvancedDiscountEnabled, setIsAdvancedDiscountEnabled] = useState(false);
  const [showSavedQuotations, setShowSavedQuotations] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState(generateQuotationNumber());
  const [validationError, setValidationError] = useState<string | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const customerId = searchParams.get('customer');
    const callId = searchParams.get('call');
    
    if (customerId || callId) {
      fetchCustomerAndCall(customerId, callId);
    }
    fetchCustomers();
    setQuotationNumber(generateQuotationNumber());
  }, [searchParams]);

  const fetchCustomerAndCall = async (customerId: string | null, callId: string | null) => {
    try {
      if (customerId) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();

        if (customerData) {
          setSelectedCustomer(customerData);
          setCustomerType(customerData.type);
          setIsCounterSale(false);
        }
      }

      if (callId) {
        const { data: callData } = await supabase
          .from('video_calls')
          .select('*')
          .eq('id', callId)
          .single();

        if (callData) {
          setVideoCall(callData);
        }
      }
    } catch (error) {
      console.error('Error fetching customer/call:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (data) {
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    if (customerId === 'counter') {
      setSelectedCustomer(null);
      setIsCounterSale(true);
      setCustomerType('retailer');
    } else {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomer(customer);
        setCustomerType(customer.type);
        setIsCounterSale(false);
      }
    }
  };

  const handleSaveQuotation = async () => {
    const validationError = validateQuotation(items);
    if (validationError) {
      setValidationError(validationError);
      return;
    }

    try {
      const quotationData = {
        customer_id: selectedCustomer?.id || null,
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: Number(item.price),
          discount: Number(discount),
          product: {
            name: item.product.name,
            sku: item.product.sku,
            description: item.product.description,
            manufacturer: item.product.manufacturer,
            category: item.product.category,
            imageUrl: item.product.imageUrl
          }
        })),
        total_amount: calculateTotals(items, discount).total,
        status: 'draft',
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        video_call_id: videoCall?.id || null,
        bill_status: 'pending',
        bill_generated_at: null,
        bill_sent_at: null,
        bill_paid_at: null,
        quotation_number: quotationNumber
      };

      const { data, error } = await supabase
        .from('quotations')
        .insert([quotationData])
        .select()
        .single();

      if (error) throw error;

      alert('Quotation saved successfully!');
      return data;
    } catch (error) {
      console.error('Error saving quotation:', error);
      alert('Error saving quotation. Please try again.');
    }
  };

  const loadSavedQuotation = async (quotationId: string) => {
    try {
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (quotationError) throw quotationError;

      if (!quotation.items || !Array.isArray(quotation.items)) {
        throw new Error('Invalid quotation data');
      }

      const newItems = quotation.items.map((item: any) => ({
        product: {
          id: item.product_id,
          name: item.product.name,
          description: item.product.description || '',
          manufacturer: item.product.manufacturer || '',
          sku: item.product.sku,
          buyPrice: Number(item.price),
          wholesalePrice: Number(item.price),
          retailPrice: Number(item.price),
          stockLevel: 999,
          category: item.product.category || '',
          imageUrl: item.product.image_url || '',
          qrCode: '',
          code128: '',
          cipher: '',
          additionalInfo: ''
        },
        quantity: item.quantity,
        price: Number(item.price),
        originalPrice: Number(item.price)
      }));

      setItems(newItems);
      setDiscount(quotation.items[0]?.discount || 0);
      setQuotationNumber(quotation.quotation_number || generateQuotationNumber());
      setShowSavedQuotations(false);

      if (quotation.customer_id) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', quotation.customer_id)
          .single();

        if (customerData) {
          setSelectedCustomer(customerData);
          setCustomerType(customerData.type);
          setIsCounterSale(false);
        }
      }
    } catch (error) {
      console.error('Error loading quotation:', error);
      alert('Error loading quotation. Please try again.');
    }
  };

  const handlePrint = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      const printWindow = window.open('', '_blank', 'width=1000,height=800');
      if (!printWindow) {
        alert('Please allow pop-ups to print quotations.');
        return;
      }

      const printContent = document.getElementById('print-quotation');
      if (!printContent) return;

      const styleSheets = Array.from(document.styleSheets)
        .map(styleSheet => {
          try {
            return Array.from(styleSheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch (e) {
            console.log('Error accessing stylesheet:', e);
            return '';
          }
        })
        .join('\n');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Quotation #${quotationNumber}</title>
            <style>
              ${styleSheets}
              @page {
                size: A4;
                margin: 1cm;
              }
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
                padding: 0;
                margin: 0;
                background: white;
              }
              @media print {
                .no-print {
                  display: none !important;
                }
                body {
                  padding: 1cm;
                }
              }
            </style>
          </head>
          <body>
            ${printContent.outerHTML}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();
    }, 250);
  };

  const addProduct = useCallback((product: Product) => {
    setItems(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;
        
        if (newQuantity > product.stockLevel) {
          alert(`Cannot add more ${product.name}. Stock limit reached!`);
          return prev;
        }

        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: newQuantity }
            : item
        );
      }

      const price = customerType === 'wholesaler' ? 
        Number(product.wholesalePrice) : 
        Number(product.retailPrice);

      return [...prev, {
        product,
        quantity: 1,
        price,
        originalPrice: Number(product.wholesalePrice)
      }];
    });
  }, [customerType]);

  const handleProductSelect = (product: Product) => {
    addProduct(product);
  };

  const processScannedInput = useCallback(
    debounce(async (input: string) => {
      if (!input) return;

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('sku', input)
          .single();

        if (error) throw error;
        if (!data) {
          console.error('Product not found:', input);
          return;
        }

        const product: Product = {
          id: data.id,
          name: data.name,
          description: data.description || '',
          manufacturer: data.manufacturer,
          sku: data.sku,
          buyPrice: Number(data.buy_price),
          wholesalePrice: Number(data.wholesalePrice),
          retailPrice: Number(data.retailPrice),
          stockLevel: Number(data.stock_level),
          category: data.category,
          imageUrl: data.image_url || '',
          qrCode: data.qr_code || '',
          code128: data.code128 || '',
          cipher: data.cipher || '',
          additionalInfo: data.additional_info || ''
        };

        if (product.stockLevel <= 0) {
          alert(`Cannot add more ${product.name}. Stock limit reached!`);
          return;
        }

        addProduct(product);
        setScannedSku('');

      } catch (error) {
        console.error('Error processing SKU:', input, error);
      }
    }, 300),
    [addProduct]
  );

  useEffect(() => {
    if (scanning) {
      scanInputRef.current?.focus();
    }
  }, [scanning]);

  useEffect(() => {
    if (scanning && scannedSku) {
      processScannedInput(scannedSku);
    }
  }, [scannedSku, scanning, processScannedInput]);

  const { subtotal, discountAmount, total, gstAmount, finalTotal } = calculateTotals(items, discount);

  const { max: maxDiscount, presets: discountPresets } = getDiscountLimits(customerType, isAdvancedDiscountEnabled);

  const handleDiscountChange = (value: number) => {
    if (!isAdvancedDiscountEnabled) {
      if (customerType === 'retailer' && value > 3) {
        alert('Retail customers can only receive up to 3% discount');
        return;
      }
      if (customerType === 'wholesaler' && value > 10) {
        alert('Wholesale customers can only receive up to 10% discount');
        return;
      }
    }
    setDiscount(value);
  };

  const handleCompleteSale = async () => {
    const validationError = validateQuotation(items);
    if (validationError) {
      setValidationError(validationError);
      return;
    }

    try {
      const now = new Date().toISOString();
      
      const quotationData = {
        customer_id: selectedCustomer?.id || null,
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: Number(item.price),discount: Number(discount),
          product: {
            name: item.product.name,
            sku: item.product.sku,
            description: item.product.description,
            manufacturer: item.product.manufacturer,
            category: item.product.category,
            imageUrl: item.product.imageUrl
          }
        })),
        total_amount: calculateTotals(items, discount).total,
        status: 'accepted',
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        video_call_id: videoCall?.id || null,
        bill_status: 'generated',
        bill_generated_at: now,
        bill_sent_at: null,
        bill_paid_at: null,
        quotation_number: quotationNumber
      };

      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([quotationData])
        .select('id, customer_id, items, total_amount, status, valid_until, video_call_id, bill_status, bill_generated_at, bill_sent_at, bill_paid_at, quotation_number')
        .single();

      if (quotationError) throw quotationError;

      if (selectedCustomer) {
        const { error: customerError } = await supabase
          .from('customers')
          .update({
            total_purchases: (Number(selectedCustomer.total_purchases) || 0) + total,
            last_purchase_date: now
          })
          .eq('id', selectedCustomer.id);

        if (customerError) throw customerError;
      }

      for (const item of items) {
        const { error } = await supabase
          .from('products')
          .update({
            stock_level: Math.max(0, item.product.stockLevel - item.quantity)
          })
          .eq('id', item.product.id);

        if (error) throw error;
      }

      handlePrint();
      setItems([]);
      setDiscount(0);
      generateQuotationNumber();
      alert('Sale completed successfully!');
    } catch (error) {
      console.error('Error completing sale:', error);
    }
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, change: number) => {
    setItems(prev => {
      const newItems = [...prev];
      const item = newItems[index];
      const newQuantity = item.quantity + change;

      if (newQuantity < 1) {
        return prev.filter((_, i) => i !== index);
      }

      if (newQuantity > item.product.stockLevel) {
        alert(`Cannot add more ${item.product.name}. Stock limit reached!`);
        return prev;
      }

      newItems[index] = {
        ...item,
        quantity: newQuantity
      };
      return newItems;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center flex-col md:flex-row gap-2">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">Quick Quotation</h2>
            {videoCall && (
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                Video Call Quotation
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSavedQuotations(true)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Saved Quotations
            </button>
            <button
              onClick={handleSaveQuotation}
              disabled={items.length === 0}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save as Draft
            </button>
            <button
              onClick={() => setScanning(!scanning)}
              className={`btn ${scanning ? 'btn-secondary' : 'btn-primary'} flex items-center gap-2`}
            >
              <QrCode className="h-4 w-4" />
              {scanning ? 'Stop Scanning' : 'Start Scanning'}
            </button>
            <button
              onClick={handlePrint}
              disabled={items.length === 0}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {/* Customer Selection */}
        <div className="flex items-center gap-4">
          <select
            value={selectedCustomer?.id || (isCounterSale ? 'counter' : '')}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="input flex-1"
          >
            <option value="counter">Counter Sale</option>
            <optgroup label="Customers">
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.type})
                  {videoCall && videoCall.customer_id === customer.id && ' - Video Call Customer'}
                </option>
              ))}
            </optgroup>
          </select>
          <select
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value as 'wholesaler' | 'retailer')}
            className="input w-40"
            disabled={!isCounterSale}
          >
            <option value="retailer">Retail</option>
            <option value="wholesaler">Wholesale</option>
          </select>
        </div>

        {/* Product Search/Scan */}
        {scanning ? (
          <input
            type="text"
            value={scannedSku}
            onChange={(e) => setScannedSku(e.target.value)}
            placeholder="Scan barcode or enter SKU..."
            className="input w-full"
            ref={scanInputRef}
          />
        ) : (
          <ProductSearch onSelect={handleProductSelect} />
        )}

        {/* Items List */}
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr key={`${item.product.id}-${index}`}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{item.product.category}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{item.product.sku}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                    <div className="text-sm text-gray-500">{item.product.description}</div>
                  </td>
                  <td className="px-6 py-4">{formatCurrency(item.price)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(index, -1)}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, 1)}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">{formatCurrency(item.price * item.quantity)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals and Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Discount Calculator */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Quick Calculator</h3>
              {!isAdvancedDiscountEnabled && (
                <button
                  onClick={() => setShowSecretInput(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Enable Advanced
                </button>
              )}
            </div>

            {showSecretInput && (
              <div className="flex gap-2">
                <input
                  type="password"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  placeholder="Enter secret code"
                  className="input flex-1"
                  autoComplete="off"
                />
                <button
                  onClick={() => {
                    if (secretCode === 'SECRET') {
                      setIsAdvancedDiscountEnabled(true);
                      setShowSecretInput(false);
                      setSecretCode('');
                    } else {
                      alert('Invalid code');
                    }
                  }}
                  className="btn btn-primary"
                >
                  Submit
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={maxDiscount}
                value={discount}
                onChange={(e) => handleDiscountChange(Number(e.target.value))}
                className="input w-20"
              />
              <span className="text-gray-600">% Discount</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {discountPresets.map(percent => (
                <button
                  key={percent}
                  onClick={() => handleDiscountChange(percent)}
                  className={`px-3 py-2 rounded text-sm ${
                    discount === percent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {percent}%
                </button>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <h3 className="font-medium">Order Summary</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discount}%):</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (18%):</span>
                <span>{formatCurrency(gstAmount)}</span>
              </div>

              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total:</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <button
                onClick={handleCompleteSale}
                disabled={items.length === 0}
                className="w-full btn btn-primary"
              >
                Complete Sale
              </button>
              
              <button
                onClick={handlePrint}
                disabled={items.length === 0}
                className="w-full btn btn-secondary"
              >
                Print Quotation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print Preview (hidden) */}
      {showPrintPreview && (
        <div id="print-quotation" className="hidden">
          <PrintQuotation
            items={items}
            customerType={customerType}
            total={total}
            customer={selectedCustomer}
            discount={discount}
            videoCall={videoCall}
            quotationNumber={quotationNumber}
          />
        </div>
      )}

      {/* Saved Quotations Modal */}
      {showSavedQuotations && (
        <SavedQuotations
          customerId={selectedCustomer?.id}
          onClose={() => setShowSavedQuotations(false)}
          onSelect={loadSavedQuotation}
        />
      )}
    </div>
  );
}

export default QuickQuotation;
