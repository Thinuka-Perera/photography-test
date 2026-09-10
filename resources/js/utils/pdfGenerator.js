import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas-pro';
import React from 'react';
import { createRoot } from 'react-dom/client';
import WhatsAppShareModal from '@/Components/WhatsAppShareModal';
import { formatReceiptQuantity, getCleanDescription } from '@/utils/format';

const loadImage = (url, format = 'image/png', quality = 1.0) => {
    return new Promise((resolve, reject) => {
        const img = new Image(); img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL(format, quality));
        };
        img.onerror = reject; img.src = url;
    });
};

const formatPDFCurrency = (value) => {
    const num = Number(value || 0);
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const renderDocumentElement = (type, data) => {
    return new Promise((resolve, reject) => {
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;width:210mm;';
        document.body.appendChild(container);

        const root = createRoot(container);

        const cleanup = () => {
            setTimeout(() => {
                root.unmount();
                if (container.parentNode) {
                    document.body.removeChild(container);
                }
            }, 100);
        };

        const loadTemplate = async () => {
            let TemplateComponent;
            if (type === 'QUOTATION') {
                const module = await import('@/Components/Documents/QuotationPrintA4');
                TemplateComponent = module.default;
            } else if (type === 'PACKAGES') {
                const module = await import('@/Components/Documents/PackagesPrintA4');
                TemplateComponent = module.default;
            } else if (type === 'EVENT') {
                const module = await import('@/Components/Documents/EventPrintA4');
                TemplateComponent = module.default;
            } else {
                reject(new Error("Unknown document type: " + type));
                cleanup();
                return;
            }

            root.render(
                React.createElement(TemplateComponent, data)
            );

            const waitForImages = () => {
                const imgs = Array.from(container.querySelectorAll('img'));
                return Promise.all(imgs.map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(imgResolve => {
                        img.addEventListener('load', imgResolve);
                        img.addEventListener('error', imgResolve);
                    });
                }));
            };

            setTimeout(async () => {
                try {
                    await waitForImages();
                    await new Promise(r => setTimeout(r, 100));

                    const invoiceEl = container.querySelector('.sg-invoice') || container.firstElementChild;
                    if (!invoiceEl) {
                        reject(new Error('Document element not found in rendered template'));
                        return;
                    }

                    resolve({ invoiceEl, cleanup });
                } catch (err) {
                    cleanup();
                    reject(err);
                }
            }, 800);
        };

        loadTemplate().catch(err => {
            cleanup();
            reject(err);
        });
    });
};

export const generateProfessionalPDF = async ({
    type = 'INVOICE', number, date, dueDate, customerName, customerPhone, items = [], subtotal, discount = 0, total, notes, shopSettings = {}, event_type = ''
}) => {
    const isPackageMode = type.toUpperCase() === 'PACKAGES';
    const isQuotationMode = type.toUpperCase() === 'QUOTATION';

    if (isQuotationMode) {
        const { invoiceEl, cleanup } = await renderDocumentElement('QUOTATION', {
            number: number || 'DRAFT',
            date: date || new Date().toLocaleDateString(),
            customerName: customerName || 'Walk-in Customer',
            customerPhone: customerPhone,
            items: items,
            subtotal: subtotal,
            discount: discount,
            total: total,
            notes: notes,
            event_type: event_type || '',
            shopSettings: shopSettings,
        });
        try {
            const doc = await generatePDFFromElement(invoiceEl);
            return doc;
        } finally {
            cleanup();
        }
    }

    if (isPackageMode) {
        const { invoiceEl, cleanup } = await renderDocumentElement('PACKAGES', {
            number: number || 'PROPOSAL',
            date: date || new Date().toLocaleDateString(),
            customerName: customerName || 'Valued Customer',
            items: items,
            shopSettings: shopSettings,
        });
        try {
            const doc = await generatePDFFromElement(invoiceEl);
            return doc;
        } finally {
            cleanup();
        }
    }

    // Default to invoice/sale conversion
    const bill = {
        bill_number: number,
        invoice_number: number,
        created_at: date,
        due_date: dueDate,
        customer_name: customerName,
        customer_phone: customerPhone,
        items: items,
        subtotal: subtotal,
        discount_amount: discount,
        total_amount: total,
        notes: notes,
    };
    return generatePDFFromBillData(bill, shopSettings);
};

/**
 * Generate an image blob by capturing a DOM element using html2canvas.
 * Used for sharing thermal receipts as JPGs (WhatsApp-friendly image attachments).
 */
export const generateImageBlobFromElement = async (element, options = {}) => {
    const { scale = 2 } = options;
    const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    });
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
};

/**
 * Capture a DOM element as JPEG and trigger a direct browser download.
 * Reuses html2canvas via generateImageBlobFromElement (same pipeline as WhatsApp sharing).
 */
export const downloadImageFromElement = async (element, filename = 'receipt.jpg', options = {}) => {
    const blob = await generateImageBlobFromElement(element, options);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
};

/**
 * Generate a PDF by capturing a DOM element using html2canvas.
 * This produces a PDF that looks identical to the on-screen invoice.
 * @param {HTMLElement} element - The DOM element to capture
 * @param {object} options - Optional settings
 * @returns {jsPDF} doc
 */
export const generatePDFFromElement = async (element, options = {}) => {
    const {
        filename = 'Invoice.pdf',
        scale = 2,
        margin = 0,
    } = options;

    // A4 dimensions in mm
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;

    const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    const imgWidth = A4_WIDTH_MM - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });

    // If the content fits in one page, just add it
    if (imgHeight <= A4_HEIGHT_MM - (margin * 2)) {
        doc.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
    } else {
        // Scale down to fit one page
        const fitScale = (A4_HEIGHT_MM - (margin * 2)) / imgHeight;
        const scaledWidth = imgWidth * fitScale;
        const scaledHeight = imgHeight * fitScale;
        const xOffset = margin + (imgWidth - scaledWidth) / 2;
        doc.addImage(imgData, 'JPEG', xOffset, margin, scaledWidth, scaledHeight, undefined, 'FAST');
    }

    return doc;
};

/**
 * Build a hidden offscreen invoice element matching the BillPrintClientFormat
 * template, capture it, and return a jsPDF doc.
 * Used from POS/CartPanel where the invoice is not rendered on screen.
 */
export const generatePDFFromBillData = async (bill, shopSettings = {}) => {
    const cfg = shopSettings;
    const templateFormat = cfg.invoice_template || 'default';

    if (templateFormat.startsWith('arachchi_') || templateFormat === 'default') {
        return new Promise((resolve, reject) => {
            const container = document.createElement('div');
            container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;width:210mm;';
            document.body.appendChild(container);

            const root = createRoot(container);

            const loadTemplate = async () => {
                let TemplateComponent;
                if (templateFormat.startsWith('arachchi_')) {
                    const module = await import('@/Components/Bills/BillPrintArachchiTemplate');
                    TemplateComponent = module.default;
                } else {
                    const module = await import('@/Components/Bills/BillPrintA4');
                    TemplateComponent = module.default;
                }

                root.render(
                    React.createElement(TemplateComponent, {
                        bill: bill,
                        settings: cfg,
                        invoiceSettings: cfg,
                        shopInfo: cfg,
                        variant: templateFormat,
                    })
                );

                // Wait for all images inside container to load
                const waitForImages = () => {
                    const imgs = Array.from(container.querySelectorAll('img'));
                    return Promise.all(imgs.map(img => {
                        if (img.complete) return Promise.resolve();
                        return new Promise(resolve => {
                            img.addEventListener('load', resolve);
                            img.addEventListener('error', resolve);
                        });
                    }));
                };

                // Wait for render to complete, images to load
                setTimeout(async () => {
                    try {
                        await waitForImages();
                        // wait an extra 100ms for safety/layout settling
                        await new Promise(r => setTimeout(r, 100));

                        const invoiceEl = container.querySelector('.invoice') || container.querySelector('.print-area') || container.firstElementChild;
                        if (invoiceEl) {
                            const oldTransform = invoiceEl.style.transform;
                            invoiceEl.style.transform = 'none';

                            // html2canvas works best if the element has explicit background
                            if (!invoiceEl.style.background && !invoiceEl.style.backgroundColor) {
                                invoiceEl.style.backgroundColor = 'white';
                            }

                            // A4 Width is ~794px at 96dpi, ensure the element is properly sized
                            const oldWidth = invoiceEl.style.width;
                            invoiceEl.style.width = '210mm';

                            const doc = await generatePDFFromElement(invoiceEl);

                            invoiceEl.style.transform = oldTransform;
                            invoiceEl.style.width = oldWidth;
                            resolve(doc);
                        } else {
                            reject(new Error("Invoice element not found in rendered template"));
                        }
                    } catch (err) {
                        reject(err);
                    } finally {
                        setTimeout(() => {
                            root.unmount();
                            document.body.removeChild(container);
                        }, 100);
                    }
                }, 800); // 800ms to ensure logo images are loaded
            };

            loadTemplate().catch(err => {
                root.unmount();
                document.body.removeChild(container);
                reject(err);
            });
        });
    }

    const items = bill?.items ?? [];
    const logoUrl = cfg.shop_logo_url || cfg.shop_logo ? `/storage/${String(cfg.shop_logo || '').replace(new RegExp('^\\\\/?storage\\\\/'), '')}` : '/Logo.png';

    const subtotal = Number(bill?.subtotal ?? 0);
    const discount = Number(bill?.discount_amount ?? 0);
    const advancePaid = Number(bill?.advance_paid ?? 0);
    const paidAmount = Number(bill?.paid_amount ?? 0);
    const balanceDue = Number(bill?.balance_due ?? 0);
    const total = Number(bill?.total_amount ?? Math.max(0, subtotal - discount));

    const fmtMoney = (v) => Number(v ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (v) => {
        if (!v) return 'N/A';
        const d = new Date(v);
        return `${String(d.getDate()).padStart(2, '0')} / ${String(d.getMonth() + 1).padStart(2, '0')} / ${d.getFullYear()}`;
    };
    const paymentLabel = bill?.payment_method
        ? String(bill.payment_method).replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        : 'Cash';

    // Build the items HTML rows
    const itemsHTML = items.map((item, i) => {
        const qty = Number(item.quantity ?? item.qty ?? 0);
        const price = Number(item.unit_price ?? item.price ?? 0);
        const line = Number(item.line_total ?? qty * price);
        const catHtml = item.category?.name
            ? `<span style="display:block;font-size:9px;color:#38bdf8;letter-spacing:1px;text-transform:uppercase;font-weight:700;margin-bottom:2px">${item.category.name}</span>`
            : '';
        const itemSize = item.size || item.variant?.size || item.stock_item?.variant?.size || item.stockItem?.variant?.size || (item.description ? (item.description.match(/\b(\d+(\.\d+)?\s*["″xX]\s*\d*(\.\d+)?["″]?)\b/)?.[1] || '-') : '-');
        return `<tr>
            <td style="text-align:center;color:#94a3b8;font-weight:600;padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px">${i + 1}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px">${catHtml}<span style="font-weight:500">${getCleanDescription(item.description, itemSize)}</span></td>
            <td style="text-align:center;padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px">${itemSize}</td>
            <td style="text-align:right;padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px">${fmtMoney(price)}</td>
            <td style="text-align:center;padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px">${qty}</td>
            <td style="text-align:right;font-weight:600;padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px">${fmtMoney(line)}</td>
        </tr>`;
    }).join('');

    // Summary rows
    let summaryHTML = `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span style="color:#64748b">Subtotal</span><span style="font-weight:600">${fmtMoney(subtotal)}</span></div>`;
    if (discount > 0) summaryHTML += `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span style="color:#64748b">Discount</span><span style="font-weight:600;color:#dc2626">- ${fmtMoney(discount)}</span></div>`;
    summaryHTML += `<div style="display:flex;justify-content:space-between;padding:12px 16px;border-radius:10px;font-weight:800;font-size:15px;margin-top:6px;background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:white"><span>TOTAL AMOUNT</span><span>${fmtMoney(total)}</span></div>`;

    const isFullyPaid = balanceDue <= 0;
    if (!isFullyPaid) {
        if (advancePaid > 0) summaryHTML += `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;margin-top:8px;color:#059669;font-weight:bold"><span>Advance Paid</span><span>${fmtMoney(advancePaid)}</span></div>`;
        if (paidAmount > 0) summaryHTML += `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;margin-top:4px;color:#059669;font-weight:bold"><span>Balance Payment</span><span>${fmtMoney(paidAmount)}</span></div>`;
        if (balanceDue > 0) summaryHTML += `<div style="display:flex;justify-content:space-between;padding:6px;font-size:13px;margin-top:8px;background:#fee2e2;border-radius:4px"><span style="font-weight:700;color:#dc2626">Balance Due</span><span style="color:#dc2626;font-weight:bold">${fmtMoney(balanceDue)}</span></div>`;
    } else if (advancePaid + paidAmount > 0) {
        summaryHTML += `<div style="display:flex;justify-content:space-between;padding:6px;font-size:13px;margin-top:8px;background:#dcfce7;border-radius:4px"><span style="font-weight:700;color:#059669">Status</span><span style="color:#059669;font-weight:bold">FULLY PAID ✓</span></div>`;
    }

    const html = `
    <div style="width:794px;min-height:1123px;background:white;display:flex;flex-direction:column;font-family:'Inter','Segoe UI',sans-serif;font-size:13px;color:#1e293b;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:white;padding:24px 30px;display:flex;justify-content:space-between;align-items:flex-start">
            <div style="display:flex;align-items:center;gap:16px">
                <img src="${logoUrl}" style="height:56px;object-fit:contain;border-radius:8px" onerror="this.style.display='none'" />
                <div>
                    <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px">${cfg.shop_name ?? 'Photography Shop'}</div>
                    <div style="font-size:10px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;margin-top:2px">${cfg.tagline ?? 'PHOTOGRAPHY'}</div>
                </div>
            </div>
            <div style="text-align:right">
                <div style="font-size:28px;font-weight:800;letter-spacing:2px;color:#38bdf8">INVOICE</div>
                <div style="font-size:10px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-top:6px">Invoice No</div>
                <div style="font-size:13px;font-weight:600;color:white;margin-top:1px">${bill?.bill_number ?? 'N/A'}</div>
                <div style="font-size:10px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-top:6px">Date</div>
                <div style="font-size:13px;font-weight:600;color:white;margin-top:1px">${fmtDate(bill?.created_at)}</div>
            </div>
        </div>
        <div style="display:flex;justify-content:space-between;padding:16px 30px;background:#f8fafc;border-bottom:2px solid #e2e8f0">
            <div>
                <h4 style="font-size:10px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px 0;font-weight:700">Bill To</h4>
                <p style="margin:2px 0;font-size:13px;font-weight:700">${bill?.customer_name || 'Walk-in Customer'}</p>
                ${bill?.customer_phone ? `<p style="margin:2px 0;font-size:13px;font-weight:500">${bill.customer_phone}</p>` : ''}
            </div>
            <div style="text-align:right">
                <h4 style="font-size:10px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px 0;font-weight:700">Payment</h4>
                <p style="margin:2px 0;font-size:13px;font-weight:500">${paymentLabel}</p>
            </div>
        </div>
        <div style="padding:0 30px">
            <table style="width:100%;border-collapse:collapse;margin-top:20px">
                <thead>
                    <tr>
                        <th style="background:#0f172a;color:#38bdf8;font-size:10px;padding:10px 12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;width:50px;border-radius:8px 0 0 0">#</th>
                        <th style="background:#0f172a;color:#38bdf8;font-size:10px;padding:10px 12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;text-align:left">Description</th>
                        <th style="background:#0f172a;color:#38bdf8;font-size:10px;padding:10px 12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;text-align:center;width:60px">Size</th>
                        <th style="background:#0f172a;color:#38bdf8;font-size:10px;padding:10px 12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;text-align:right;width:100px">Unit Price</th>
                        <th style="background:#0f172a;color:#38bdf8;font-size:10px;padding:10px 12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;text-align:center;width:70px">Qty</th>
                        <th style="background:#0f172a;color:#38bdf8;font-size:10px;padding:10px 12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;text-align:right;width:110px;border-radius:0 8px 0 0">Total</th>
                    </tr>
                </thead>
                <tbody>${itemsHTML}</tbody>
            </table>
        </div>
        <div style="padding:16px 30px;display:flex;justify-content:flex-end">
            <div style="width:260px">${summaryHTML}</div>
        </div>
        ${(cfg.invoice_note || cfg.invoiceNote) ? `<div style="padding:8px 30px;text-align:center;font-size:12px;color:#64748b;font-style:italic">${cfg.invoice_note || cfg.invoiceNote}</div>` : ''}
        <div style="margin-top:auto;padding:16px 30px;border-top:2px solid #e2e8f0">
            <div style="display:flex;justify-content:space-between;gap:30px">
                <div>
                    <h5 style="font-size:10px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin:0 0 6px 0;font-weight:700">Terms & Conditions</h5>
                    <div style="margin:2px 0;font-size:11px;color:#64748b;white-space:pre-line">${(cfg.termsConditions || cfg.invoice_terms || 'Goods once sold are not refundable or exchangeable.\nThe company is not responsible for any damages after delivery.').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                </div>
                <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end">
                    <h5 style="font-size:10px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin:0 0 6px 0;font-weight:700">Payment Information</h5>
                    ${(cfg.invoice_payment_info || cfg.paymentInfo || cfg.payment_info) ? `<div style="margin:2px 0;font-size:11px;color:#64748b;white-space:pre-line">${(cfg.invoice_payment_info || cfg.paymentInfo || cfg.payment_info).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : `<p style="margin:2px 0;font-size:11px;color:#64748b">Account: ${cfg.bank_account_no ?? '-'}</p>
                    <p style="margin:2px 0;font-size:11px;color:#64748b">Name: ${cfg.account_name ?? '-'}</p>
                    <p style="margin:2px 0;font-size:11px;color:#64748b">Bank: ${cfg.bank_details ?? '-'}</p>`}
                    <div style="margin-top:20px;text-align:center;width:160px">
                        <div style="border-bottom:1px solid #64748b;margin-bottom:4px"></div>
                        <div style="font-size:11px;font-weight:700;color:#1e293b">Received By:</div>
                    </div>
                </div>
            </div>
            <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;justify-content:center;gap:24px;font-size:10px;color:#94a3b8">
                <span>${cfg.phone ?? '-'}</span>
                <span>•</span>
                <span>${cfg.email ?? '-'}</span>
                <span>•</span>
                <span>${cfg.address ?? '-'}</span>
            </div>
        </div>
    </div>`;

    // Create a temporary offscreen container
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
    container.innerHTML = html;
    document.body.appendChild(container);
    const invoiceEl = container.firstElementChild;

    try {
        const doc = await generatePDFFromElement(invoiceEl);
        return doc;
    } finally {
        document.body.removeChild(container);
    }
};



export const executeWhatsAppShare = async (doc, filename, phoneNumber, message) => {
    let file;
    let isBlob = doc instanceof Blob;

    if (isBlob) {
        file = new File([doc], filename, { type: doc.type });
    } else {
        const pdfBlob = doc.output('blob');
        file = new File([pdfBlob], filename, { type: 'application/pdf' });
    }

    // Try native share API first (mobile devices, some modern desktop browsers)
    // This allows attaching the actual PDF directly
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                title: filename,
                text: message,
                files: [file]
            });
            return true; // Successfully shared via native menu
        } catch (error) {
            // User cancelled or share failed, fallback
            console.log('Native share failed or cancelled', error);
        }
    }

    // Otherwise, use wa.me and download the file so user can manually attach
    const cleanPhone = (phoneNumber || '').replace(/[^0-9+]/g, '');
    const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');

    // Alert the user that they need to attach the downloaded file manually
    alert('The file has been downloaded. Please attach it manually in the WhatsApp window that just opened.');
    if (isBlob) {
        const url = URL.createObjectURL(doc);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        doc.save(filename);
    }
    return false;
};

export const sharePDFOnWhatsApp = (doc, filename, phoneNumber, message) => {
    return new Promise((resolve) => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        const close = (result) => {
            root.unmount();
            container.remove();
            resolve(result);
        };

        let title = 'Document';
        if (filename.toLowerCase().includes('invoice')) title = 'Invoice';
        else if (filename.toLowerCase().includes('receipt')) title = 'Receipt';
        else if (filename.toLowerCase().includes('quotation')) title = 'Quotation';
        else if (filename.toLowerCase().includes('package')) title = 'Package Details';
        else if (filename.toLowerCase().includes('salary')) title = 'Salary Slip';

        root.render(
            React.createElement(WhatsAppShareModal, {
                show: true,
                onClose: () => close(false),
                documentDoc: doc,
                filename: filename,
                defaultPhone: phoneNumber,
                message: message,
                previewTitle: title
            })
        );
    });
};

export const generateSalaryPDF = async ({
    employee,
    details,
    month,
    year,
    shopSettings = {},
}) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    let logoDataUrl = null;
    const logoUrl = shopSettings.shop_logo_url || '/Logo.png';
    try {
        logoDataUrl = await loadImage(logoUrl);
    } catch (e) {
        console.error('Failed to load shop logo for salary PDF:', e);
    }

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text('SALARY SLIP', margin, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(201, 168, 76);
    doc.text(`${month} ${year}`.toUpperCase(), margin, 32);

    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - 22, 9, 22, 22, undefined, 'FAST');
        } catch (err) {
            console.error(err);
        }
    }

    doc.setTextColor(255, 255, 255);
    const shopName = (shopSettings.shop_name || shopSettings.name || 'PHOTOGRAPHY STUDIO').toUpperCase();
    if (logoDataUrl) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(shopName, pageWidth - margin - 25, 22, { align: 'right' });
        if (shopSettings.shop_phone || shopSettings.phone) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text(String(shopSettings.shop_phone || shopSettings.phone), pageWidth - margin - 25, 27, { align: 'right' });
        }
    } else {
        doc.text(shopName, pageWidth - margin, 25, { align: 'right' });
    }

    let currentY = 55;

    // Employee Info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('EMPLOYEE DETAILS', margin, currentY);

    currentY += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${employee.name}`, margin, currentY);
    doc.text(`EPF No: ${employee.epf_number || 'N/A'}`, pageWidth / 2, currentY);

    currentY += 7;
    doc.text(`Role: ${employee.role || 'N/A'}`, margin, currentY);
    doc.text(`Phone: ${employee.phone || 'N/A'}`, pageWidth / 2, currentY);

    currentY += 15;

    // Salary Breakdown Table
    autoTable(doc, {
        startY: currentY,
        head: [['DESCRIPTION', 'AMOUNT (LKR)']],
        body: [
            ['Basic Salary', formatPDFCurrency(details.basic_salary)],
            ['Attendance Allowance', formatPDFCurrency(details.attendance_allowance)],
            [`Overtime Pay (${(details.overtime_hours || 0).toFixed(2)} Hrs)`, formatPDFCurrency(details.overtime_pay)],
            [`Leave Bonus (Used: ${details.leave_days || 0}, Rem: ${details.remaining_leave_count || 0})`, formatPDFCurrency(details.leave_bonus || 0)],
            ['Leave Deductions', formatPDFCurrency(details.leave_deduction_amount || 0)],
            ['Commissions', formatPDFCurrency(details.commission_total || 0)],
            ['Other Allowances', formatPDFCurrency(details.other_allowances || 0)],
            ['Total Deductions (incl. Leave Ded.)', formatPDFCurrency(details.total_deductions)],
            ['Net Salary', formatPDFCurrency(details.net_salary)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: { 1: { halign: 'right' } },
        didParseCell: function (data) {
            if (data.row.index === 8) { // Net Salary (index 8 since we have 9 rows)
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [241, 245, 249];
            }
        }
    });

    currentY = doc.lastAutoTable.finalY + 15;

    // Status
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT STATUS:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(details.is_paid ? 'PAID' : 'PENDING', margin + 40, currentY);

    // Footer
    const footerY = doc.internal.pageSize.height - 20;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY, { align: 'center' });

    return doc;
};

export const generateBulkSalaryReport = async ({
    rows,
    month,
    year,
    shopSettings = {},
}) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    let logoDataUrl = null;
    const logoUrl = shopSettings.shop_logo_url || '/Logo.png';
    try {
        logoDataUrl = await loadImage(logoUrl);
    } catch (e) {
        console.error('Failed to load shop logo for bulk report:', e);
    }

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('MONTHLY SALARY SUMMARY', margin, 24);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(201, 168, 76);
    doc.text(`${month} ${year}`.toUpperCase(), margin, 31);

    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - 22, 9, 22, 22, undefined, 'FAST');
        } catch (err) {
            console.error(err);
        }
    }

    doc.setTextColor(255, 255, 255);
    const shopName = (shopSettings.shop_name || shopSettings.name || 'PHOTOGRAPHY STUDIO').toUpperCase();
    if (logoDataUrl) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(shopName, pageWidth - margin - 25, 23, { align: 'right' });
    } else {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(shopName, pageWidth - margin, 25, { align: 'right' });
    }

    autoTable(doc, {
        startY: 50,
        head: [['EMPLOYEE', 'BASIC', 'ALLOW.', 'O.T.', 'DEDUCT.', 'NET', 'STATUS']],
        body: rows.map(r => [
            r.employee.name,
            formatPDFCurrency(r.salary_profile?.basic_salary),
            formatPDFCurrency(r.total_allowances),
            formatPDFCurrency(r.overtime_pay),
            formatPDFCurrency(r.total_deductions),
            formatPDFCurrency(r.net_salary),
            r.is_paid ? 'PAID' : 'PENDING'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3 },
    });

    return doc;
};

export const generateWhatsAppMessageForBill = (bill, shopSettings = {}) => {
    const separator = "──────────────────";

    const subtotal = Number(bill?.subtotal ?? 0);
    const discount = Number(bill?.discount_amount ?? 0);
    const advancePaid = Number(bill?.advance_paid ?? 0);
    const paidAmount = Number(bill?.paid_amount ?? 0);
    const total = Number(bill?.total_amount ?? Math.max(0, subtotal - discount));
    const balanceDue = Number(bill?.balance_due ?? Math.max(0, total - advancePaid - paidAmount));

    const fmtMoney = (v) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v || 0));

    let itemsText = '';
    if (bill?.items && Array.isArray(bill.items)) {
        itemsText = bill.items.map(item => {
            const qty = formatReceiptQuantity(item.quantity ?? item.qty ?? 1);
            const price = Number(item.unit_price ?? item.price ?? 0);
            const numericQty = Number(item.quantity ?? item.qty ?? 1);
            const size = item.size || item.variant?.size || item.stock_item?.variant?.size || null;
            const sizeStr = size ? ` [${size}]` : '';
            return `• ${item.description || item.name || 'Item'}${sizeStr} (x${qty})\n  ${fmtMoney(numericQty * price)}`;
        }).join('\n');
    } else if (bill?.line_items && Array.isArray(bill.line_items)) {
        itemsText = bill.line_items.map(item => {
            const qty = formatReceiptQuantity(item.quantity ?? item.qty ?? 1);
            const price = Number(item.unit_price ?? item.price ?? 0);
            const numericQty = Number(item.quantity ?? item.qty ?? 1);
            const size = item.size || item.variant?.size || item.stock_item?.variant?.size || null;
            const sizeStr = size ? ` [${size}]` : '';
            return `• ${item.description || item.name || 'Item'}${sizeStr} (x${qty})\n  ${fmtMoney(numericQty * price)}`;
        }).join('\n');
    }

    const lines = [
        `*${bill?.quote_number ? 'QUOTATION' : (bill?.title ? 'EVENT' : 'INVOICE')}: ${bill?.customer_name || bill?.client_name || 'Walk-in Customer'}*`,
        `_${bill?.quote_number ? 'Quotation' : (bill?.title ? 'Event' : 'Invoice')} #${bill?.quote_number || bill?.invoice_number || bill?.bill_number || bill?.id || 'N/A'}_`,
        "",
        `*Items:*`,
        itemsText || "• Packages/Services as discussed",
        "",
        separator,
        `*Subtotal:* ${fmtMoney(subtotal)}`,
    ];

    if (discount > 0) {
        lines.push(`*Discount:* -${fmtMoney(discount)}`);
    }

    lines.push(`*TOTAL AMOUNT: ${fmtMoney(total)}*`);
    lines.push(separator);

    if (advancePaid > 0 || paidAmount > 0) {
        lines.push("");
        if (advancePaid > 0) lines.push(`*Advance Paid:* ${fmtMoney(advancePaid)}`);
        if (paidAmount > 0) lines.push(`*Paid Amount:* ${fmtMoney(paidAmount)}`);
        lines.push(`*Balance Due: ${fmtMoney(balanceDue)}*`);
    }

    lines.push("");
    lines.push(`Thank you for choosing ${shopSettings?.shop_name || shopSettings?.name || 'us'}!`);

    return lines.filter(Boolean).join('\n');
};

/**
 * Generate a letterhead-style PDF for Events (weddings, etc.)
 * Uses the geometric diamond header with logo and a professional footer.
 * Content area shows event details, packages, and financial summary.
 */




export const generateEventLetterheadPDF = async ({
    event = {},
    paymentSummary = {},
    photographyPkgs = [],
    videographyPkgs = [],
    customSections = [],
    shopSettings = {},
}) => {
    const { invoiceEl, cleanup } = await renderDocumentElement('EVENT', {
        event,
        paymentSummary,
        photographyPkgs,
        videographyPkgs,
        customSections,
        shopSettings,
    });
    try {
        const doc = await generatePDFFromElement(invoiceEl);
        return doc;
    } finally {
        cleanup();
    }
};;

/**
 * Render BillPrintThermal offscreen and return the capture-ready DOM node.
 */
const renderThermalBillElement = (bill, shopSettings = {}) => {
    // Accept either { shopInfo, invoiceSettings } or a legacy flat merged object.
    const shopInfo = shopSettings.shopInfo ?? shopSettings;
    const invoiceSettings = shopSettings.invoiceSettings ?? {};

    return new Promise((resolve, reject) => {
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;width:80mm;';
        document.body.appendChild(container);

        const root = createRoot(container);

        const cleanup = () => {
            setTimeout(() => {
                root.unmount();
                if (container.parentNode) {
                    document.body.removeChild(container);
                }
            }, 100);
        };

        const loadTemplate = async () => {
            const module = await import('@/Components/Bills/BillPrintThermal');
            const TemplateComponent = module.default;

            root.render(
                React.createElement(TemplateComponent, {
                    bill,
                    shopInfo,
                    invoiceSettings,
                })
            );

            const waitForImages = () => {
                const imgs = Array.from(container.querySelectorAll('img'));
                return Promise.all(imgs.map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(imgResolve => {
                        img.addEventListener('load', imgResolve);
                        img.addEventListener('error', imgResolve);
                    });
                }));
            };

            setTimeout(async () => {
                try {
                    await waitForImages();
                    await new Promise(r => setTimeout(r, 100));

                    const thermalEl = container.querySelector('.print-thermal-container') || container.firstElementChild;
                    if (!thermalEl) {
                        reject(new Error('Thermal element not found in rendered template'));
                        return;
                    }

                    thermalEl.style.transform = 'none';
                    if (!thermalEl.style.background && !thermalEl.style.backgroundColor) {
                        thermalEl.style.backgroundColor = 'white';
                    }
                    thermalEl.style.width = '80mm';

                    resolve({ thermalEl, cleanup });
                } catch (err) {
                    cleanup();
                    reject(err);
                }
            }, 800);
        };

        loadTemplate().catch(err => {
            cleanup();
            reject(err);
        });
    });
};

/**
 * Generate a JPEG blob for the thermal receipt format offscreen (WhatsApp sharing).
 * Uses html2canvas via generateImageBlobFromElement for a mobile-friendly image attachment.
 */
export const generateThermalImageFromBillData = async (bill, shopSettings = {}) => {
    const { thermalEl, cleanup } = await renderThermalBillElement(bill, shopSettings);

    try {
        return await generateImageBlobFromElement(thermalEl);
    } finally {
        cleanup();
    }
};

/**
 * Generate a PDF for the thermal receipt format offscreen and return it.
 */
export const generateThermalPDFFromBillData = async (bill, shopSettings = {}) => {
    const { thermalEl, cleanup } = await renderThermalBillElement(bill, shopSettings);

    try {
        const canvas = await html2canvas(thermalEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: thermalEl.scrollWidth,
            windowHeight: thermalEl.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const imgWidth = 80;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: [imgWidth, imgHeight],
            compress: true,
        });

        doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
        return doc;
    } finally {
        cleanup();
    }
};