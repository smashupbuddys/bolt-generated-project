import React from 'react';
import { X, Info, Printer } from 'lucide-react';
import type { Product } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { generateBarcodes, printQRCodes } from '../../utils/barcodeGenerator';
import { getMarkupForProduct } from '../../utils/markupSettings';
import ImageUpload from './ImageUpload';

interface ProductFormProps {
  product?: Product;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const CATEGORIES = ['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Watches', 'Other'];
const MANUFACTURERS = ['Cartier', 'Tiffany', 'Pandora', 'Swarovski', 'Local', 'Other'];
const MRP_MULTIPLIERS = [1.5, 2, 3, 4, 10];

const ProductForm: React.FC<ProductFormProps> = ({ product, onClose, onSubmit }) => {
  const [formData, setFormData] = React.useState({
    name: product?.name || '',
    description: product?.description || '',
    manufacturer: product?.manufacturer || MANUFACTURERS[0],
    buy_price: product?.buyPrice || '',
    wholesale_price: product?.wholesalePrice || '',
    retail_price: product?.retailPrice || '',
    stock_level: product?.stockLevel || '',
    category: product?.category || CATEGORIES[0],
    image_url: product?.imageUrl || '',
    additional_info: product?.additionalInfo || ''
  });

  const [selectedMultiplier, setSelectedMultiplier] = React.useState<number | null>(null);
  const [qrCode, setQrCode] = React.useState<string>(product?.qrCode || '');
  const [imageError, setImageError] = React.useState<string>('');
  const [showMarkupInfo, setShowMarkupInfo] = React.useState(false);
  const [priceError, setPriceError] = React.useState<string | null>(null);

  const currentMarkup = React.useMemo(() => {
    return getMarkupForProduct(formData.manufacturer, formData.category);
  }, [formData.manufacturer, formData.category]);

  React.useEffect(() => {
    if (formData.name && formData.category && formData.manufacturer && 
        Number(formData.wholesale_price) > 0 && Number(formData.retail_price) > 0) {
      try {
        const barcodes = generateBarcodes(
          formData.category,
          formData.name,
          formData.manufacturer,
          Number(formData.wholesale_price),
          Number(formData.retail_price),
          formData.additional_info
        );
        setQrCode(barcodes.qrCode);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
  }, [formData.name, formData.category, formData.manufacturer, formData.wholesale_price, formData.retail_price, formData.additional_info]);

  const validatePrices = (prices: { buy_price: number; wholesale_price: number; retail_price: number }) => {
    if (prices.buy_price <= 0) {
      return 'Buy price must be greater than 0';
    }
    if (prices.wholesale_price <= prices.buy_price) {
      return 'Wholesale price must be greater than buy price';
    }
    if (prices.retail_price <= wholesale_price) {
      return 'Retail price must be greater than wholesale price';
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const prices = {
      buy_price: Number(formData.buy_price),
      wholesale_price: Number(formData.wholesale_price),
      retail_price: Number(formData.retail_price)
    };

    const error = validatePrices(prices);
    if (error) {
      setPriceError(error);
      return;
    }

    const barcodes = generateBarcodes(
      formData.category,
      formData.name,
      formData.manufacturer,
      prices.wholesale_price,
      prices.retail_price,
      formData.additional_info
    );
    
    const productData = {
      name: formData.name,
      description: formData.description,
      manufacturer: formData.manufacturer,
      buy_price: prices.buy_price,
      wholesale_price: prices.wholesale_price,
      retail_price: prices.retail_price,
      stock_level: Number(formData.stock_level),
      category: formData.category,
      image_url: formData.image_url,
      sku: barcodes.sku,
      qr_code: barcodes.qrCode,
      code128: barcodes.code128,
      cipher: barcodes.cipher,
      additional_info: formData.additional_info || null
    };

    onSubmit(productData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPriceError(null);
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      if (name === 'buy_price') {
        const buyPrice = Number(value);
        if (buyPrice > 0) {
          const markup = getMarkupForProduct(newData.manufacturer, newData.category);
          const calculatedWholesale = (buyPrice * (1 + markup));
          newData.wholesale_price = calculatedWholesale.toFixed(2);
          
          if (selectedMultiplier) {
            newData.retail_price = (calculatedWholesale * selectedMultiplier).toFixed(2);
          }
        }
      }
      
      if (name === 'manufacturer' || name === 'category') {
        const buyPrice = Number(newData.buy_price);
        if (buyPrice > 0) {
          const markup = getMarkupForProduct(newData.manufacturer, newData.category);
          const calculatedWholesale = (buyPrice * (1 + markup));
          newData.wholesale_price = calculatedWholesale.toFixed(2);
          
          if (selectedMultiplier) {
            newData.retail_price = (calculatedWholesale * selectedMultiplier).toFixed(2);
          }
        }
      }
      
      if (name === 'wholesale_price' && selectedMultiplier) {
        const wholesale = Number(value);
        if (wholesale > 0) {
          newData.retail_price = (wholesale * multiplier).toFixed(2);
        }
      }
      
      return newData;
    });
  };

  const handleMultiplierChange = (multiplier: number) => {
    setSelectedMultiplier(multiplier);
    const wholesale = Number(formData.wholesale_price);
    if (wholesale > 0) {
      setFormData(prev => ({
        ...prev,
        retail_price: (wholesale * multiplier).toFixed(2)
      }));
    }
  };

  const handlePrintQRCode = () => {
    if (!qrCode) return;
    try {
      // Generate QR codes based on stock level
      const codes = Array(Number(formData.stock_level)).fill(qrCode);
      printQRCodes(codes, `QR Codes - ${formData.name}`);
    } catch (error) {
      console.error('Error printing QR codes:', error);
      alert('Error printing QR codes. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <div className="flex gap-2">
            {qrCode && (
              <button
                type="button"
                onClick={handlePrintQRCode}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print QR Codes
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  name="name"
                  className="input"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer
                </label>
                <select
                  name="manufacturer"
                  required
                  className="input"
                  value={formData.manufacturer}
                  onChange={handleChange}
                >
                  {MANUFACTURERS.map(manufacturer => (
                    <option key={manufacturer} value={manufacturer}>
                      {manufacturer}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  required
                  className="input"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Level
                </label>
                <input
                  type="number"
                  name="stock_level"
                  required
                  min="0"
                  className="input"
                  value={formData.stock_level}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buy Price (₹)
                  </label>
                  <input
                    type="number"
                    name="buy_price"
                    required
                    min="0.01"
                    step="0.01"
                    className="input"
                    value={formData.buy_price}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <span>Wholesale Price (₹)</span>
                    <button
                      type="button"
                      onClick={() => setShowMarkupInfo(!showMarkupInfo)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </label>
                  {showMarkupInfo && (
                    <div className="text-sm text-gray-600 mb-2 bg-gray-50 p-2 rounded">
                      Current markup: {(currentMarkup * 100).toFixed(0)}%
                      <br />
                      Based on: {formData.manufacturer} ({formData.category})
                    </div>
                  )}
                  <input
                    type="number"
                    name="wholesale_price"
                    required
                    min="0.01"
                    step="0.01"
                    className="input"
                    value={formData.wholesale_price}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    name="retail_price"
                    required
                    min="0.01"
                    step="0.01"
                    className="input"
                    value={formData.retail_price}
                    onChange={handleChange}
                  />
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick MRP Multiplier
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {MRP_MULTIPLIERS.map((multiplier) => (
                        <button
                          key={multiplier}
                          type="button"
                          onClick={() => handleMultiplierChange(multiplier)}
                          className={`px-3 py-1 rounded-full text-sm ${
                            selectedMultiplier === multiplier
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {multiplier}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {priceError && (
                  <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">
                    {priceError}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <ImageUpload
                value={formData.image_url}
                onChange={(value) => setFormData(prev => ({ ...prev, image_url: value }))}
                onError={setImageError}
              />
              {imageError && (
                <p className="text-red-500 text-sm">{imageError}</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  className="input"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              {qrCode && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      QR Code Preview
                    </label>
                  </div>
                  <div className="flex flex-col items-center bg-white p-4 rounded border">
                    <QRCodeSVG value={qrCode} size={128} />
                    <div className="mt-2 text-center">
                      <p className="text-sm font-medium text-gray-900">MRP: ₹{formData.retail_price}</p>
                      <p className="text-xs text-gray-500">{JSON.parse(qrCode).sku}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
