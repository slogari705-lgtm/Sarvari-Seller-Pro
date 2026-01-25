
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
      <td style="padding: 10px 8px; font-size: 11px; color: #64748b;">${idx + 1}</td>
      <td style="padding: 10px 8px; font-size: 12px; font-weight: 600; text-align: ${isRTL ? 'right' : 'left'};">
         <div style="color: #1e293b;">${it.name}</div>
         <div style="font-size: 10px; color: #94a3b8; font-weight: normal; margin-top: 2px;">${it.sku}</div>
      </td>
      <td style="padding: 10px 8px; text-align: center; font-size: 12px;">${it.quantity}</td>
      <td style="padding: 10px 8px; text-align: ${isRTL ? 'left' : 'right'}; font-size: 12px; color: #64748b;">${currency}${it.price.toLocaleString()}</td>
      <td style="padding: 10px 8px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 700; font-size: 12px; color: #1e293b;">${currency}${(it.price * it.quantity).toLocaleString()}</td>
    </tr>`).join('');

  if (layout === 'a4' || layout === 'advice') {
    const isAdvice = layout === 'advice';
    const title = isAdvice ? (isRTL ? 'د حساب بیان' : 'PAYMENT ADVICE') : (isRTL ? 'د مالیې فاکتور' : 'TAX INVOICE');
    
    // Financial reconciliation logic for Advice:
    // If the invoice was just processed, the customer's totalDebt in state ALREADY includes this invoice's balance.
    const invBalance = inv.total - inv.paidAmount;
    const currentDebt = cust ? cust.totalDebt : 0;
    const previousDebt = Math.max(0, currentDebt - invBalance);

    return `
    <!DOCTYPE html>
    <html dir="${direction}">
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Noto+Sans+Arabic:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: ${isRTL ? "'Noto Sans Arabic'" : "'Inter'"}, sans-serif; margin: 0; padding: 0; color: #1e293b; background: white; }
        .page { padding: 15mm; width: 210mm; min-height: 297mm; margin: 0 auto; box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; border-bottom: 4px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
        .shop-info h1 { margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; }
        .shop-details { margin-top: 8px; font-size: 11px; color: #64748b; line-height: 1.4; }
        .invoice-meta { text-align: ${isRTL ? 'left' : 'right'}; }
        .invoice-title { margin: 0; font-size: 28px; font-weight: 900; color: #4f46e5; }
        .ref-box { margin-top: 15px; background: #f8fafc; padding: 12px 20px; border-radius: 12px; border: 1px solid #f1f5f9; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
        .info-card { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; }
        .status-card { background: ${inv.status === 'paid' ? '#f0fdf4' : '#fef2f2'}; border-color: ${inv.status === 'paid' ? '#dcfce7' : '#fee2e2'}; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #1e293b; color: #fff; padding: 12px 10px; font-size: 10px; text-transform: uppercase; text-align: ${isRTL ? 'right' : 'left'}; }
        .financial-summary { display: flex; justify-content: flex-end; gap: 40px; margin-bottom: 40px; }
        .ledger-box { width: 300px; background: #f8fafc; border-radius: 16px; padding: 20px; border: 1px solid #f1f5f9; }
        .ledger-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px; }
        .ledger-total { display: flex; justify-content: space-between; padding-top: 15px; margin-top: 5px; font-weight: 900; font-size: 18px; }
        .sig-section { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
        .sig-box { width: 200px; text-align: center; }
        .sig-line { border-bottom: 1px solid #cbd5e1; height: 40px; margin-bottom: 10px; }
        @media print { .page { padding: 0; width: 100%; } }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="shop-info">
            <div style="width: 42px; height: 42px; background: #4f46e5; color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; margin-bottom: 12px;">S</div>
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
              <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Invoice Reference</div>
              <div style="font-size: 18px; font-weight: 900;">#INV-${inv.id.padStart(4, '0')}</div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-top: 4px;">${new Date(inv.date).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <p style="margin: 0; font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Billed To</p>
            <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 900; color: #1e293b;">${cust?.name || 'Walk-in Customer'}</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #4f46e5;">${cust?.phone || ''}</p>
            ${cust?.address ? `<p style="margin: 6px 0 0 0; font-size: 11px; color: #64748b; line-height: 1.4;">${cust.address}</p>` : ''}
          </div>
          <div class="info-card status-card">
            <p style="margin: 0; font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Payment Summary</p>
            <p style="margin: 8px 0 0 0; font-size: 22px; font-weight: 900; color: ${inv.status === 'paid' ? '#16a34a' : '#dc2626'}; text-transform: uppercase;">${inv.status}</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #64748b;">Method: ${inv.paymentMethod.toUpperCase()}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: ${isRTL ? 'left' : 'right'};">Unit</th>
              <th style="text-align: ${isRTL ? 'left' : 'right'};">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <div class="financial-summary">
          ${isAdvice ? `
          <div class="ledger-box">
            <p style="margin: 0 0 10px 0; font-size: 10px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px;">Statement of Account</p>
            <div class="ledger-row">
              <span style="color: #64748b;">Previous Balance</span>
              <span>${currency}${previousDebt.toLocaleString()}</span>
            </div>
            <div class="ledger-row">
              <span style="color: #64748b;">Current Purchase</span>
              <span>+ ${currency}${inv.total.toLocaleString()}</span>
            </div>
            <div class="ledger-row">
              <span style="color: #64748b;">Payment Made</span>
              <span style="color: #16a34a;">- ${currency}${inv.paidAmount.toLocaleString()}</span>
            </div>
            <div class="ledger-total">
              <span style="text-transform: uppercase; font-size: 14px;">Total Owed</span>
              <span style="color: #dc2626;">${currency}${currentDebt.toLocaleString()}</span>
            </div>
          </div>
          ` : `
          <div class="ledger-box">
            <div class="ledger-row">
              <span style="color: #64748b;">Subtotal</span>
              <span>${currency}${inv.total.toLocaleString()}</span>
            </div>
            <div class="ledger-row">
              <span style="color: #64748b;">Amount Paid</span>
              <span style="color: #16a34a;">${currency}${inv.paidAmount.toLocaleString()}</span>
            </div>
            <div class="ledger-total">
              <span style="text-transform: uppercase; font-size: 14px;">Balance Due</span>
              <span style="color: #dc2626;">${currency}${(inv.total - inv.paidAmount).toLocaleString()}</span>
            </div>
          </div>
          `}
        </div>

        <div class="sig-section">
          <div class="sig-box">
            <div class="sig-line"></div>
            <p style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800;">Authorized By</p>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <p style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800;">Received By</p>
          </div>
        </div>

        <div style="margin-top: 60px; text-align: center;">
          <p style="color: #94a3b8; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Thank you for your patronage</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // Thermal POS Optimized Layout
  return `
    <!DOCTYPE html>
    <html dir="${direction}">
    <head>
      <style>
        @page { margin: 0; }
        body { 
          width: 80mm; 
          margin: 0; 
          padding: 6mm 4mm; 
          font-family: 'Courier New', Courier, monospace; 
          font-size: 12px; 
          line-height: 1.2; 
          color: #000; 
          background: #fff;
          -webkit-print-color-adjust: exact;
        }
        .text-center { text-align: center; }
        .text-right { text-align: ${isRTL ? 'left' : 'right'}; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 4px 0; width: 100%; }
        .item-row { display: flex; justify-content: space-between; margin-bottom: 2px; align-items: flex-start; }
        .item-name { flex: 1; padding-right: 4px; word-break: break-all; }
        .item-qty { width: 30px; text-align: center; }
        .item-total { width: 70px; text-align: right; }
        h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
        p { margin: 1px 0; font-size: 10px; }
        .total-section { margin-top: 8px; font-size: 14px; }
        .footer { margin-top: 15px; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h2 class="bold">${shop.shopName}</h2>
        <p>${shop.shopAddress || ''}</p>
        <p>${shop.shopPhone || ''}</p>
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
           <span class="bold">INV: #${inv.id.padStart(4, '0')}</span>
           <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>
        <div style="text-align: left; font-size: 10px; margin-top: 2px;">
           TIME: ${new Date(inv.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div style="text-align: left; font-size: 10px; font-weight: bold; margin-top: 2px;">
           CUST: ${cust?.name.toUpperCase() || 'WALK-IN'}
        </div>
      </div>
      
      <div class="divider"></div>
      <div class="item-row bold" style="font-size: 10px;">
        <span class="item-name">ITEM</span>
        <span class="item-qty">QTY</span>
        <span class="item-total">PRICE</span>
      </div>
      <div class="divider"></div>
      
      ${inv.items.map(it => `
        <div class="item-row">
          <span class="item-name">${it.name.toUpperCase().slice(0, 18)}</span>
          <span class="item-qty">${it.quantity}</span>
          <span class="item-total">${currency}${(it.price * it.quantity).toLocaleString()}</span>
        </div>
      `).join('')}
      
      <div class="divider"></div>
      
      <div class="item-row bold total-section">
        <span>TOTAL</span>
        <span>${currency}${inv.total.toLocaleString()}</span>
      </div>
      <div class="item-row" style="font-size: 11px;">
        <span>PAID (${inv.paymentMethod.toUpperCase()})</span>
        <span>${currency}${inv.paidAmount.toLocaleString()}</span>
      </div>
      <div class="item-row bold">
        <span>BALANCE</span>
        <span>${currency}${(inv.total - inv.paidAmount).toLocaleString()}</span>
      </div>
      
      <div class="divider"></div>
      <div class="text-center footer">
        <p class="bold">*** THANK YOU ***</p>
        <p>HAVE A WONDERFUL DAY</p>
        <p style="font-size: 8px; margin-top: 5px;">Powered by Sarvari POS</p>
      </div>
    </body>
    </html>`;
};
