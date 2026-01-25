
import { Invoice, Customer, AppState } from '../types';

export type PrintLayout = 'a4' | 'advice' | 'thermal';

export const generatePrintHTML = (state: AppState, inv: Invoice, layout: PrintLayout): string => {
  const cust = state.customers.find(c => c.id === inv.customerId);
  const currency = state.settings.currency;
  const shop = state.settings;
  const isRTL = shop.language === 'ps' || shop.language === 'dr';
  const direction = isRTL ? 'rtl' : 'ltr';

  // Item List HTML
  const itemsHTML = inv.items.map((it, idx) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 12px 8px; font-size: 11px; color: #64748b;">${idx + 1}</td>
      <td style="padding: 12px 8px; font-size: 12px; font-weight: 600; text-align: ${isRTL ? 'right' : 'left'};">
         <div style="color: #1e293b;">${it.name}</div>
         <div style="font-size: 10px; color: #94a3b8; font-weight: normal; margin-top: 2px;">${it.sku}</div>
      </td>
      <td style="padding: 12px 8px; text-align: center; font-size: 12px;">${it.quantity}</td>
      <td style="padding: 12px 8px; text-align: ${isRTL ? 'left' : 'right'}; font-size: 12px; color: #64748b;">${currency}${it.price.toLocaleString()}</td>
      <td style="padding: 12px 8px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 700; font-size: 12px; color: #1e293b;">${currency}${(it.price * it.quantity).toLocaleString()}</td>
    </tr>`).join('');

  if (layout === 'a4' || layout === 'advice') {
    const isAdvice = layout === 'advice';
    const title = isAdvice ? (isRTL ? 'د تادیې خبرتیا' : 'PAYMENT ADVICE') : (isRTL ? 'د مالیې فاکتور' : 'TAX INVOICE');
    
    // Financial reconciliation logic for Advice
    const prevDebt = cust ? (cust.totalDebt + (inv.total - inv.paidAmount)) : 0;
    const closingBalance = cust ? cust.totalDebt : (inv.total - inv.paidAmount);

    return `
    <!DOCTYPE html>
    <html dir="${direction}">
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Noto+Sans+Arabic:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: ${isRTL ? "'Noto Sans Arabic'" : "'Inter'"}, sans-serif; margin: 0; padding: 0; color: #1e293b; }
        .page { padding: 15mm; background: #fff; width: 210mm; min-height: 297mm; margin: 0 auto; box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; border-bottom: 4px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
        .shop-info h1 { margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
        .shop-details { margin-top: 8px; font-size: 11px; color: #64748b; line-height: 1.5; }
        .invoice-meta { text-align: ${isRTL ? 'left' : 'right'}; }
        .invoice-title { margin: 0; font-size: 32px; font-weight: 900; color: #4f46e5; letter-spacing: -1px; }
        .ref-box { margin-top: 15px; background: #f8fafc; padding: 12px 20px; border-radius: 12px; display: inline-block; border: 1px solid #f1f5f9; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
        .info-card { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; }
        .status-card { background: ${inv.status === 'paid' ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${inv.status === 'paid' ? '#dcfce7' : '#fee2e2'}; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th { background: #1e293b; color: #fff; padding: 12px 10px; font-size: 10px; text-transform: uppercase; text-align: ${isRTL ? 'right' : 'left'}; }
        .summary-box { width: 300px; margin-${isRTL ? 'right' : 'left'}: auto; background: #f8fafc; border-radius: 16px; padding: 20px; border: 1px solid #f1f5f9; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; }
        .summary-total { display: flex; justify-content: space-between; padding-top: 15px; margin-top: 5px; font-weight: 900; font-size: 18px; }
        .footer { margin-top: 60px; display: flex; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 30px; }
        .sig-line { border-bottom: 1px solid #e2e8f0; width: 100%; margin-bottom: 8px; height: 40px; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 150px; opacity: 0.03; font-weight: 900; pointer-events: none; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="watermark">${inv.status.toUpperCase()}</div>
        <div class="header">
          <div class="shop-info">
            <div style="width: 48px; height: 48px; background: #4f46e5; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; margin-bottom: 15px;">S</div>
            <h1>${shop.shopName}</h1>
            <div class="shop-details">
              <div>${shop.shopAddress || ''}</div>
              <div>Phone: ${shop.shopPhone || ''}</div>
              <div>Email: ${shop.shopEmail || ''}</div>
            </div>
          </div>
          <div class="invoice-meta">
            <h2 class="invoice-title">${title}</h2>
            <div class="ref-box">
              <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Reference No.</div>
              <div style="font-size: 18px; font-weight: 900;">#INV-${inv.id.padStart(4, '0')}</div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-top: 4px;">${new Date(inv.date).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Billed To</p>
            <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 900;">${cust?.name || 'Walk-in Customer'}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 700; color: #4f46e5;">${cust?.phone || ''}</p>
            ${cust?.address ? `<p style="margin: 6px 0 0 0; font-size: 11px; color: #64748b; line-height: 1.4;">${cust.address}</p>` : ''}
          </div>
          <div class="info-card status-card">
            <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Financial Status</p>
            <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 900; color: ${inv.status === 'paid' ? '#16a34a' : '#dc2626'}; text-transform: uppercase;">${inv.status}</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #64748b;">Method: ${inv.paymentMethod.toUpperCase()}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; border-radius: ${isRTL ? '0 8px 8px 0' : '8px 0 0 8px'};">#</th>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: ${isRTL ? 'left' : 'right'};">Price</th>
              <th style="text-align: ${isRTL ? 'left' : 'right'}; border-radius: ${isRTL ? '8px 0 0 8px' : '0 8px 8px 0'};">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <div style="display: flex; justify-content: flex-end;">
          <div class="summary-box">
            <div class="summary-row">
              <span style="color: #64748b; font-size: 12px; font-weight: 600;">Subtotal</span>
              <span style="font-weight: 700;">${currency}${inv.total.toLocaleString()}</span>
            </div>
            <div class="summary-row">
              <span style="color: #64748b; font-size: 12px; font-weight: 600;">Payment Applied</span>
              <span style="font-weight: 700; color: #16a34a;">${currency}${inv.paidAmount.toLocaleString()}</span>
            </div>
            ${isAdvice ? `
            <div class="summary-row" style="background: #fff; margin-top: 5px; padding: 5px;">
              <span style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">Balance from this sale</span>
              <span style="font-weight: 700;">${currency}${(inv.total - inv.paidAmount).toLocaleString()}</span>
            </div>
            ` : ''}
            <div class="summary-total">
              <span style="text-transform: uppercase;">${isAdvice ? 'Final Balance' : 'Amount Due'}</span>
              <span style="color: #dc2626;">${currency}${closingBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <div style="width: 200px;">
            <p style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800;">Authorized By</p>
            <div class="sig-line"></div>
            <p style="font-size: 9px; color: #64748b;">${shop.shopName} Digital Terminal</p>
          </div>
          <div style="width: 200px; text-align: ${isRTL ? 'left' : 'right'};">
            <p style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800;">Receiver</p>
            <div class="sig-line"></div>
            <p style="font-size: 9px; color: #64748b;">Customer Signature</p>
          </div>
        </div>

        <div style="margin-top: 60px; text-align: center;">
          <p style="color: #94a3b8; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Thank you for your business!</p>
          <div style="font-size: 8px; color: #e2e8f0; margin-top: 10px;">ID: ${inv.id}-${inv.date.replace(/[^0-9]/g, '')}</div>
        </div>
      </div>
    </body>
    </html>`;
  }

  // Thermal Layout Optimization
  return `
    <!DOCTYPE html>
    <html dir="${direction}">
    <head>
      <style>
        body { width: 80mm; margin: 0; padding: 5mm; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.2; color: #000; background: #fff; }
        .text-center { text-align: center; }
        .text-right { text-align: ${isRTL ? 'left' : 'right'}; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .item-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
        .total-section { font-size: 14px; margin-top: 5px; }
        h2 { margin: 0; font-size: 18px; }
        p { margin: 2px 0; }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h2 class="bold">${shop.shopName.toUpperCase()}</h2>
        <p>${shop.shopAddress || ''}</p>
        <p>${shop.shopPhone || ''}</p>
        <div class="divider"></div>
        <p class="bold">INV: #${inv.id.padStart(4, '0')}</p>
        <p>${new Date(inv.date).toLocaleString()}</p>
        <p>${cust ? 'CUST: ' + cust.name.toUpperCase() : 'WALK-IN CUSTOMER'}</p>
      </div>
      <div class="divider"></div>
      <div style="display: flex; justify-content: space-between;" class="bold">
        <span>ITEM</span>
        <span>QTY</span>
        <span>PRICE</span>
      </div>
      <div class="divider"></div>
      ${inv.items.map(it => `
        <div class="item-row">
          <span style="flex: 1;">${it.name.toUpperCase().slice(0, 15)}</span>
          <span style="width: 20px; text-align: center;">${it.quantity}</span>
          <span class="text-right">${currency}${(it.price * it.quantity).toLocaleString()}</span>
        </div>
      `).join('')}
      <div class="divider"></div>
      <div class="item-row bold total-section">
        <span>TOTAL</span>
        <span>${currency}${inv.total.toLocaleString()}</span>
      </div>
      <div class="item-row">
        <span>PAID (${inv.paymentMethod.toUpperCase()})</span>
        <span>${currency}${inv.paidAmount.toLocaleString()}</span>
      </div>
      <div class="item-row bold">
        <span>BALANCE</span>
        <span>${currency}${(inv.total - inv.paidAmount).toLocaleString()}</span>
      </div>
      <div class="divider"></div>
      <div class="text-center" style="margin-top: 15px;">
        <p class="bold">*** THANK YOU ***</p>
        <p>STAY BLESSED</p>
      </div>
    </body>
    </html>`;
};
