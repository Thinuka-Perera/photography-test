import React, { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import Modal from '@/Components/Modal';
import { X, Printer, Download, Barcode } from 'lucide-react';

function BarcodeItem({ value, size, grade, sku, productName, price }) {
    const svgRef = useRef(null);

    useEffect(() => {
        if (svgRef.current && value) {
            try {
                JsBarcode(svgRef.current, value, {
                    format: "CODE128",
                    width: 2,
                    height: 50,
                    displayValue: true,
                    fontOptions: "bold",
                    fontSize: 18,
                    textMargin: 4,
                    margin: 10,
                });
            } catch (e) {
                console.error("Barcode rendering failed", e);
            }
        }
    }, [value]);

    const handlePrint = (quantity = 1) => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            alert("Popup blocker is enabled. Please allow popups to print barcodes.");
            return;
        }

        const svgHtml = svgRef.current.outerHTML;
        const formattedPrice = price ? 'Rs. ' + Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

        let labelItemsHtml = "";
        for (let i = 0; i < quantity; i++) {
            labelItemsHtml += `
                <div class="label-container">
                    <div class="product-title">${productName}</div>
                    <div class="product-spec">${[size, grade].filter(Boolean).join(' / ') || 'Default'}</div>
                    ${formattedPrice ? `<div class="product-price">${formattedPrice}</div>` : ''}
                    <div class="barcode-svg">${svgHtml}</div>
                </div>
            `;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Barcode - ${sku}</title>
                    <style>
                        @page {
                            size: 38mm 25mm;
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            font-family: system-ui, -apple-system, sans-serif;
                            background: white;
                        }
                        .label-container {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                            width: 38mm;
                            height: 25mm;
                            box-sizing: border-box;
                            page-break-after: always;
                            padding: 1mm;
                            overflow: hidden;
                        }
                        .product-title {
                            font-size: 8px;
                            font-weight: bold;
                            text-transform: uppercase;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            max-width: 95%;
                            color: #000;
                            margin-bottom: 1px;
                        }
                        .product-spec {
                            font-size: 7px;
                            color: #444;
                            margin-bottom: 1px;
                            font-weight: 500;
                        }
                        .product-price {
                            font-size: 7px;
                            font-weight: bold;
                            color: #000;
                            margin-bottom: 2px;
                        }
                        .barcode-svg {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            width: 100%;
                        }
                        .barcode-svg svg {
                            width: 100% !important;
                            height: auto !important;
                            max-height: 14mm;
                        }
                        .barcode-svg svg text {
                            font-weight: bold !important;
                        }
                    </style>
                </head>
                <body>
                    ${labelItemsHtml}
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDownloadSvg = () => {
        const svgContent = svgRef.current.outerHTML;
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `barcode-${sku}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPng = () => {
        // Convert SVG to Canvas and download as PNG
        try {
            const svgString = svgRef.current.outerHTML;
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const DOMURL = window.URL || window.webkitURL || window;
            const url = DOMURL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Use a default size for high quality
                canvas.width = 300;
                canvas.height = 160;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 10, 10, 280, 140);

                const pngUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = pngUrl;
                link.download = `barcode-${sku}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                DOMURL.revokeObjectURL(url);
            };
            img.src = url;
        } catch (e) {
            console.error("Failed to generate PNG barcode download", e);
        }
    };

    const [qty, setQty] = React.useState(1);

    return (
        <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 gap-4">
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {sku}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {[size, grade].filter(Boolean).join(' / ') || 'Default Variant'}
                    </span>
                    {price && (
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            · Rs. {Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    )}
                </div>
                <div className="text-xs text-slate-400">Barcode Text: <span className="font-mono">{value}</span></div>
            </div>

            <div className="bg-white p-3 rounded-2xl dark:bg-white flex items-center justify-center min-w-[200px]" style={{ filter: 'contrast(1.2)' }}>
                <svg ref={svgRef}></svg>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center border border-slate-200 dark:border-slate-650 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <span className="px-3 text-xs text-slate-400 font-bold uppercase tracking-wider">Qty:</span>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-2 py-1.5 text-center border-0 border-l border-slate-205 dark:border-slate-600 bg-transparent text-sm focus:ring-0 text-slate-800 dark:text-slate-200 font-bold"
                    />
                </div>
                <button
                    onClick={() => handlePrint(qty)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                >
                    <Printer className="w-4 h-4" />
                    Print
                </button>
                <button
                    onClick={handleDownloadSvg}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
                    title="Download SVG"
                >
                    <Download className="w-4 h-4" />
                    SVG
                </button>
                <button
                    onClick={handleDownloadPng}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
                    title="Download PNG"
                >
                    <Download className="w-4 h-4" />
                    PNG
                </button>
            </div>
        </div>
    );
}

export default function BarcodePrintModal({ product, isOpen, onClose }) {
    if (!product) return null;

    // A variant gets a barcode from variant.barcode, fallback to SKU if needed
    const variants = product.variants || [];

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="4xl">
            <div className="p-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-500">
                            <Barcode className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {product.name} Barcodes
                            </h3>
                            <p className="text-xs text-slate-400">
                                Category: {product.category?.name || 'GEN'} · Generate, download, and print labels.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                        title="Close Modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {variants.length === 0 ? (
                        <div className="text-center py-8 text-slate-450 dark:text-slate-500">
                            This product does not have any variants.
                        </div>
                    ) : (
                        variants.map((v) => {
                            const barcodeVal = v.barcode || v.sku;
                            return (
                                <BarcodeItem
                                    key={v.id}
                                    value={barcodeVal}
                                    size={v.size}
                                    grade={v.grade_type}
                                    sku={v.sku}
                                    productName={product.name}
                                    price={v.selling_price}
                                />
                            );
                        })
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}
