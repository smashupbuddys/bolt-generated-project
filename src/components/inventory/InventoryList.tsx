import React from 'react';
import { Plus, Search, QrCode, Printer, Edit, Trash2, Copy } from 'lucide-react';
import type { Product } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import ProductForm from './ProductForm';
import { supabase } from '../../lib/supabase';
import { printQRCodes } from '../../utils/barcodeGenerator';

const InventoryList = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showQR, setShowQR] = React.useState<string | null>(null);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | undefined>();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchProducts();
  }, []);

  const transformProduct = (data: any): Product => ({
    id: data.id,
    name: data.name,
    description: data.description,
    manufacturer: data.manufacturer,
    sku: data.sku,
    buyPrice: data.buy_price,
    wholesalePrice: data.wholesale_price,
    retailPrice: data.retail_price,
    stockLevel: data.stock_level,
    category: data.category,
    imageUrl: data.image_url,
    qrCode: data.qr_code,
    code128: data.code128,
    cipher: data.cipher,
    additionalInfo: data.additional_info
  });

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts((data || []).map(transformProduct));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (productData: any) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;
      setProducts(prev => [transformProduct(data), ...prev]);
      setShowForm(false);
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleEditProduct = async (productData: Omit<Product, 'id'>) => {
    if (!editingProduct) return;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id)
        .select()
        .single();

      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? transformProduct(data) : p));
      setEditingProduct(undefined);
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handlePrintLabel = (product: Product) => {
    if (!product.qrCode) return;
    try {
      printQRCodes([product.qrCode], `Print Label - ${product.sku}`);
    } catch (error) {
      console.error('Error printing label:', error);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    // Fallback method if Clipboard API is not available
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      const msg = successful ? 'successful' : 'unsuccessful';
      console.log('Fallback: Copying text command was ' + msg);
      alert('SKU copied to clipboard!');
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      alert('Failed to copy SKU. Please try again.');
    }

    document.body.removeChild(textArea);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-col md:flex-row gap-2">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search inventory..."
            className="input pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="btn btn-primary flex items-center gap-2 w-full md:w-auto"
        >
          <Plus className="h-5 w-5" />
          Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div onClick={() => setEditingProduct(product)} style={{ cursor: 'pointer' }}>
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-32 object-cover"
              />
              <div className="p-4">
                <h3 className="text-md font-semibold mb-1">{product.name}</h3>
                <p className="text-gray-700 text-xs mb-2">From ₹{product.retailPrice.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex flex-wrap text-xs text-gray-600 p-4">
              <div className="w-1/2 mb-1">
                <span className="font-medium text-gray-600">• SKU:</span>
                <button
                  onClick={() => handleCopyToClipboard(product.sku)}
                  className="inline-flex items-center hover:text-blue-600"
                  title="Copy SKU to clipboard"
                >
                  {product.sku} <Copy className="h-3 w-3 ml-1" />
                </button>
              </div>
              <div className="w-1/2 mb-1">
                <span className="font-medium text-gray-600">• Manufacturer:</span> {product.manufacturer}
              </div>
              <div className="w-1/2 mb-1">
                <span className="font-medium text-gray-600">• Stock:</span> {product.stockLevel}
              </div>
              <div className="w-1/2 mb-1">
                <span className="font-medium text-gray-600">• Buy Price:</span> ₹{product.buyPrice.toLocaleString()}
              </div>
              <div className="w-1/2 mb-1">
                <span className="font-medium text-gray-600">• Wholesale:</span> ₹{product.wholesalePrice.toLocaleString()}
              </div>
              <div className="w-1/2 mb-1">
                <span className="font-medium text-gray-600">• Retail:</span> ₹{product.retailPrice.toLocaleString()}
              </div>
            </div>

            <div className="flex justify-end space-x-2 p-4 border-t border-gray-200">
              <button
                onClick={() => handlePrintLabel(product)}
                className="text-blue-600 hover:text-blue-900"
                title="Print Label"
              >
                <Printer className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowQR(showQR === product.id ? null : product.id)}
                className="text-blue-600 hover:text-blue-900"
                title="Show QR Code"
              >
                <QrCode className="h-4 w-4" />
              </button>
              <button
                onClick={() => setEditingProduct(product)}
                className="text-blue-600 hover:text-blue-900"
                title="Edit Product"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteProduct(product.id)}
                className="text-red-600 hover:text-red-900"
                title="Delete Product"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {showQR === product.id && (
              <div className="absolute bg-white shadow-lg rounded-lg p-4 -mt-20 -ml-32">
                <QRCodeSVG value={product.qrCode} size={128} />
                <div className="text-center mt-2 text-sm text-gray-600">{product.sku}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {(showForm || editingProduct) && (
        <ProductForm
          product={editingProduct}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(undefined);
          }}
          onSubmit={editingProduct ? handleEditProduct : handleAddProduct}
        />
      )}
    </div>
  );
};

export default InventoryList;
