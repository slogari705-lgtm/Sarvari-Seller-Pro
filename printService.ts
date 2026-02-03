import { Invoice, AppState, Customer } from './types';

export type PrintLayout = 'thermal' | 'a4' | 'auto';

export const generatePrintHTML = (state: AppState, inv: Invoice, layoutType: PrintLayout): string => {
  const cust = state.customers.find(c => c.id === inv.customerId);
  const shop = state.settings;
  const isRTL = shop.language === 'ps' || shop.language === 'dr';
  const direction = isRTL ? 'rtl' : 'ltr';
  
  const activeTemplate = state.templates.find(t => t.id === shop.invoiceTemplate) || state.templates[0];
  const brandColor = activeTemplate.brandColor || '#4f46e5';
  const currency = shop.currency;

  const effectiveLayout = layoutType === 'thermal' ? 'thermal' : activeTemplate.layout;
  const invIdDisplay = `${shop.invoicePrefix || ''}${inv.id.padStart(4, '0')}`;

  let lastLoan = 0;
  let finalBalance = 0;

  if (cust) {
    const invTime = new Date(inv.date).getTime();
    const historicalInvoices = state.invoices.filter(i => 
      i.customerId === cust.id && 
      !i.isVoided && 
      !i.isDeleted &&
      new Date(i.date).getTime() <= invTime
    );
    const historicalLoans = state.loanTransactions.filter(l => 
      l.customerId === cust.id && 
      new Date(l.date).getTime() <= invTime
    );

    const debtFromInvoices = historicalInvoices.reduce((acc, i) => acc + (i.total - i.paidAmount), 0);
    const debtFromManual = historicalLoans.reduce((acc, l) => {
      if (l.type === 'debt') return acc + l.amount;
      if (l.type === 'repayment') return acc - l.amount;
      return acc;
    }, 0);

    finalBalance = debtFromInvoices + debtFromManual;
    const currentUnpaid = inv.total - inv.paidAmount;
    lastLoan = finalBalance - currentUnpaid;
  }

  if (effectiveLayout === 'thermal' || effectiveLayout === 'receipt') {
    return `
      <div dir="${direction}" style="width: 72mm; margin: 0; padding: 1mm 2mm; font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; background: #fff; line-height: 1.2;">
        <div style="text-align: center;">
          <div style="font-size: 15px; font-weight: 900; margin-bottom: 2px;">${shop.shopName.toUpperCase()}</div>
          <div style="font-size: 8px; line-height: 1.1;">
            ${shop.shopAddress ? `<div>${shop.shopAddress}</div>` : ''}
            ${shop.shopPhone ? `<div>TEL: ${shop.shopPhone}</div>` : ''}
          </div>
        </div>
        
        <div style="border-top: 1px dashed #000; margin: 3px 0;"></div>
        <div style="display: flex; justify-content: space-between;"><span style="font-weight: 900;">INV: #${invIdDisplay}</span><span>${new Date(inv.date).toLocaleDateString()}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>CLIENT:</span><span style="font-weight: 900;">${cust ? cust.name.toUpperCase() : 'WALK-IN'}</span></div>
        <div style="border-top: 1px dashed #000; margin: 3px 0;"></div>
        
        <div style="margin-bottom: 5px;">
          ${inv.items.map(it => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 10px;">
              <div style="flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${it.name.toUpperCase()}</div>
              <div style="width: 8mm; text-align: center;">x${it.quantity}</div>
              <div style="width: 20mm; text-align: right; font-weight: 900;">${currency}${(it.price * it.quantity).toLocaleString()}</div>
            </div>
          `).join('')}
        </div>

        <div style="border-top: 1px dashed #000; margin: 3px 0;"></div>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="font-weight: 900; font-size: 13px;">TOTAL</td><td style="text-align: right; font-weight: 900; font-size: 13px;">${currency}${inv.total.toLocaleString()}</td></tr>
          <tr><td>PRESENT RECEIPT</td><td style="text-align: right;">${currency}${inv.paidAmount.toLocaleString()}</td></tr>
          ${cust ? `
            <tr style="font-size: 9px; opacity: 0.7;"><td>PREVIOUS LOAN</td><td style="text-align: right;">${currency}${lastLoan.toLocaleString()}</td></tr>
            <tr style="border-top: 1px solid #000;"><td><b style="font-size: 12px;">FINAL BALANCE</b></td><td style="text-align: right;"><b style="font-size: 12px;">${currency}${finalBalance.toLocaleString()}</b></td></tr>
          ` : ''}
        </table>

        <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
        <div style="text-align: center; font-size: 9px; font-weight: 900;">
          ${activeTemplate.footerText || 'THANK YOU FOR YOUR BUSINESS'}
        </div>
      </div>
    `;
  }

  // A4 Layout
  const commonStyles = `
    .invoice-container { 
      padding: 15mm; 
      width: 210mm; 
      min-height: 297mm; 
      box-sizing: border-box; 
      background: white; 
      color: #1e293b; 
      font-family: 'Inter', sans-serif;
      position: relative;
    }
    .brand-accent { height: 4px; width: 100%; background: ${brandColor}; margin-bottom: 10mm; }
    .header { display: flex; justify-content: space-between; margin-bottom: 15mm; }
    .shop-info h1 { margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
    .shop-info p { margin: 2px 0; font-size: 11px; color: #64748b; font-weight: 600; }
    .doc-meta { text-align: right; }
    .doc-meta h2 { margin: 0; font-size: 42px; font-weight: 900; color: ${brandColor}; text-transform: uppercase; line-height: 1; }
    .doc-meta p { margin: 5px 0; font-size: 14px; font-weight: 800; font-family: monospace; }
    
    .client-box { display: flex; gap: 20mm; margin-bottom: 10mm; padding: 8mm; background: #f8fafc; border-radius: 6px; }
    .client-box div { flex: 1; }
    .client-box h4 { margin: 0 0 5px 0; font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
    .client-box p { margin: 0; font-size: 14px; font-weight: 800; text-transform: uppercase; }
    
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15mm; }
    .items-table th { padding: 5mm; text-align: left; font-size: 10px; font-weight: 900; color: #64748b; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; }
    .items-table td { padding: 5mm; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    .item-total { font-weight: 900; text-align: right; }
    
    .summary-section { display: flex; justify-content: flex-end; }
    .summary-table { width: 90mm; border-collapse: collapse; }
    .summary-table td { padding: 4mm; font-size: 14px; font-weight: 700; border-bottom: 1px solid #f1f5f9; }
    .summary-table .grand-total { background: #0f172a; color: white; font-size: 18px; font-weight: 900; }
    .summary-table .grand-total td { border: none; }
    
    .footer { position: absolute; bottom: 15mm; left: 15mm; right: 15mm; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10mm; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
  `;

  return `
    <div dir="${direction}" class="invoice-container">
      <style>${commonStyles}</style>
      <div class="brand-accent"></div>
      
      <div class="header">
        <div class="shop-info">
          <h1>${shop.shopName}</h1>
          <p>${shop.shopAddress || ''}</p>
          <p>Phone: ${shop.shopPhone || ''}</p>
          <p>Email: ${shop.shopEmail || ''}</p>
        </div>
        <div class="doc-meta">
          <h2>INVOICE</h2>
          <p>#${invIdDisplay}</p>
          <p style="color: #64748b;">${new Date(inv.date).toLocaleDateString()}</p>
        </div>
      </div>

      <div class="client-box">
        <div>
          <h4>Billed To</h4>
          <p>${cust ? cust.name : 'Walk-in Customer'}</p>
          ${cust ? `<p style="font-size: 11px; margin-top: 2px; opacity: 0.6;">Contact: ${cust.phone}</p>` : ''}
        </div>
        <div>
          <h4>Payment Method</h4>
          <p>${inv.paymentMethod}</p>
          <p style="font-size: 11px; margin-top: 2px; opacity: 0.6;">Verified Transaction</p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map(it => `
            <tr>
              <td style="font-weight: 800; text-transform: uppercase;">${it.name}</td>
              <td style="text-align: center;">${it.quantity}</td>
              <td style="text-align: right;">${currency}${it.price.toLocaleString()}</td>
              <td class="item-total">${currency}${(it.price * it.quantity).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-section">
        <table class="summary-table">
          <tr>
            <td>Subtotal</td>
            <td style="text-align: right;">${currency}${inv.subtotal.toLocaleString()}</td>
          </tr>
          ${inv.tax > 0 ? `<tr><td>Tax (${shop.taxRate}%)</td><td style="text-align: right;">${currency}${inv.tax.toLocaleString()}</td></tr>` : ''}
          ${inv.discount > 0 ? `<tr><td style="color: #e11d48;">Discount</td><td style="text-align: right; color: #e11d48;">-${currency}${inv.discount.toLocaleString()}</td></tr>` : ''}
          <tr class="grand-total">
            <td>NET TOTAL</td>
            <td style="text-align: right;">${currency}${inv.total.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="font-size: 12px; color: #64748b;">Paid Amount</td>
            <td style="text-align: right; font-size: 12px;">${currency}${inv.paidAmount.toLocaleString()}</td>
          </tr>
          ${cust ? `
            <tr style="background: #f8fafc;">
              <td style="font-size: 12px;">Outstanding Balance</td>
              <td style="text-align: right; font-size: 12px; font-weight: 900; color: #e11d48;">${currency}${finalBalance.toLocaleString()}</td>
            </tr>
          ` : ''}
        </table>
      </div>

      <div class="footer">
        ${activeTemplate.footerText || 'Authorized Document Generated by Sarvari Terminal System'}
      </div>
    </div>
  `;
};
