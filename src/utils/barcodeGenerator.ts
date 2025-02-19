import { format } from 'date-fns';

export type BarcodeFormat = 'QR' | 'CODE128' | 'CIPHER';

interface BarcodeData {
  sku: string;
  qrCode: string;
  code128: string;
  cipher: string;
}

export function generateSKU(category: string, name: string, manufacturer: string): string {
  const cleanCategory = category.replace(/[^A-Z0-9]/gi, '').substring(0, 2).toUpperCase();
  const cleanManufacturer = manufacturer.replace(/[^A-Z0-9]/gi, '').substring(0, 3).toUpperCase();
  const timestamp = format(new Date(), 'yyMMdd');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${cleanCategory}${cleanManufacturer}${timestamp}${random}`;
}

export function generateBarcodes(
  category: string,
  name: string,
  manufacturer: string,
  wholesalePrice: number,
  retailPrice: number,
  additionalData: string = ''
): BarcodeData {
  const sku = generateSKU(category, name, manufacturer);
  
  // Create a JSON object with product details including MRP
  const productData = {
    sku,
    name,
    category,
    manufacturer,
    mrp: retailPrice.toFixed(2),
    wholesale: wholesalePrice.toFixed(2),
    additionalData
  };

  // Convert to JSON string for QR code
  const qrData = JSON.stringify(productData);
  
  return {
    sku,
    qrCode: qrData,
    code128: sku,
    cipher: sku
  };
}

export function parseQRCode(qrCode: string): Record<string, any> | null {
  try {
    return JSON.parse(qrCode);
  } catch (error) {
    console.error('Error parsing QR code data:', error);
    return null;
  }
}

export function printQRCodes(qrCodes: string[], title: string = 'Print QR Codes'): void {
  try {
    // Validate QR codes first
    const validCodes = qrCodes.filter(code => {
      try {
        const data = JSON.parse(code);
        return data && data.sku && data.name && data.mrp;
      } catch {
        return false;
      }
    });

    if (validCodes.length === 0) {
      throw new Error('No valid QR codes to print');
    }

    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please check your popup blocker settings.');
    }

    // Generate HTML content
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body { 
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              page-break-inside: auto;
            }
            .qr-item {
              text-align: center;
              padding: 10px;
              border: 1px solid #ccc;
              break-inside: avoid;
              background: white;
            }
            .qr-item img {
              max-width: 100%;
              height: auto;
            }
            .qr-item p {
              margin: 5px 0;
            }
            .loading {
              text-align: center;
              padding: 20px;
              font-size: 16px;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .qr-grid {
                page-break-inside: auto;
              }
              .qr-item {
                page-break-inside: avoid;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div id="loading" class="loading no-print">Generating QR codes...</div>
          <div class="qr-grid">
            ${validCodes.map((code, index) => {
              const data = JSON.parse(code);
              return `
                <div class="qr-item">
                  <div id="qr-${index}"></div>
                  <p style="font-weight: bold;">MRP: ₹${data.mrp}</p>
                  <p style="font-size: 12px;">${data.name}</p>
                  <p style="font-size: 12px; color: #666;">${data.sku}</p>
                </div>
              `;
            }).join('')}
          </div>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/qrcode.min.js"></script>
          <script>
            let loadingCount = 0;
            const totalCodes = ${validCodes.length};

            function updateLoading() {
              loadingCount++;
              const loadingEl = document.getElementById('loading');
              if (loadingEl) {
                loadingEl.textContent = \`Generating QR codes... (\${loadingCount}/\${totalCodes})\`;
              }
              if (loadingCount === totalCodes) {
                if (loadingEl) loadingEl.style.display = 'none';
                setTimeout(() => {
                  window.print();
                  document.body.innerHTML = '<h1 style="text-align: center; margin-top: 50px;">Printing completed. You can close this window.</h1>';
                }, 500);
              }
            }

            Promise.all(${JSON.stringify(validCodes)}.map((code, index) => 
              new Promise((resolve, reject) => {
                try {
                  QRCode.toCanvas(
                    document.getElementById('qr-' + index),
                    code,
                    { 
                      width: 128,
                      margin: 2,
                      errorCorrectionLevel: 'H'
                    },
                    (error) => {
                      if (error) reject(error);
                      else {
                        updateLoading();
                        resolve();
                      }
                    }
                  );
                } catch (error) {
                  reject(error);
                }
              })
            )).catch(error => {
              console.error('Error generating QR codes:', error);
              document.body.innerHTML = '<h1 style="text-align: center; color: red; margin-top: 50px;">Error generating QR codes. Please try again.</h1>';
            });
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  } catch (error) {
    console.error('Error printing QR codes:', error);
    alert(error.message || 'Error printing QR codes. Please try again.');
  }
}
