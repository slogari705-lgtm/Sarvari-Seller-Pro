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
  const exRate = inv.exchangeRate || shop.exchangeRate || 1;
  const secondaryCurrency = shop.secondaryCurrency || 'USD';

  const effectiveLayout = layoutType === 'thermal' ? 'thermal' : activeTemplate.layout;
  
  // Padding invoice ID to 3 digits (e.g., 001)
  const invIdDisplay = `${shop.invoicePrefix || ''}${inv.id.padStart(3, '0')}`;

  let lastLoan = 0;
  let finalBalance = 0;

  if (cust) {
    const invTime = new Date(inv.date).getTime();
    const previousInvoices = state.invoices.filter(i => 
      i.customerId === cust.id && 
      !i.isVoided && 
      !i.isDeleted &&
      new Date(i.date).getTime() < invTime
    );
    const previousLoans = state.loanTransactions.filter(l => 
      l.customerId === cust.id && 
      new Date(l.date).getTime() < invTime
    );

    const debtFromInvoices = previousInvoices.reduce((acc, i) => acc + (i.total - i.paidAmount), 0);
    const debtFromManual = previousLoans.reduce((acc, l) => {
      if (l.type === 'debt') return acc + l.amount;
      if (l.type === 'repayment') return acc - l.amount;
      return acc;
    }, 0);

    lastLoan = debtFromInvoices + debtFromManual;
    finalBalance = lastLoan + (inv.total - inv.paidAmount);
  }

  const paymentSectionData = {
    term: inv.paymentTerm || (inv.status === 'paid' ? 'Immediate' : 'Credit'),
    transType: inv.paymentMethod.toUpperCase(),
    currency: shop.currency,
    invTotal: inv.subtotal + (inv.tax || 0),
    discount: inv.discount || 0,
    receipt: inv.paidAmount,
    lastLoan: lastLoan,
    finalBalance: finalBalance
  };

  if (effectiveLayout === 'thermal' || effectiveLayout === 'receipt') {
    return `
      <div dir="${direction}" style="width: 72mm; margin: 0 auto; padding: 0.2mm; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #000; background: #fff; line-height: 1.0;">
        <div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 1.5mm; margin-bottom: 1.5mm; display: flex; flex-direction: column; align-items: center;">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="height: 10mm; margin-bottom: 1mm; object-fit: contain;" />` : ''}
          <div style="font-size: 12px; font-weight: 900;">${shop.shopName.toUpperCase()}</div>
          <div style="font-size: 8px;">${shop.shopAddress || ''}</div>
          <div style="font-size: 8px;">${shop.shopPhone ? `TEL: ${shop.shopPhone}` : ''}</div>
          <div style="font-size: 16px; font-weight: 900; margin-top: 1.5mm; border: 1px solid #000; padding: 0.5mm 3mm; display: inline-block;">INVOICE</div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 0.5mm; font-size: 9px;">
          <span>NO: #${invIdDisplay}</span>
          <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>
        <div style="margin-bottom: 0.5mm; font-weight: 900; font-size: 9px;">CLIENT: ${cust ? cust.name.toUpperCase() : 'WALK-IN'}</div>
        ${cust ? `<div style="margin-bottom: 1mm; font-size: 8px;">TEL: ${cust.phone}</div>` : ''}
        
        <table style="width: 100%; font-size: 8px; border-collapse: collapse; border-bottom: 1px dashed #000;">
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; padding: 0.3mm 0;">ITEM</th>
              <th style="text-align: center;">QTY</th>
              <th style="text-align: right;">SUM</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(it => `
              <tr>
                <td style="padding: 0.3mm 0;">${it.name.toUpperCase().substring(0, 20)}</td>
                <td style="text-align: center;">${it.quantity}</td>
                <td style="text-align: right;">${(it.price * it.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; font-size: 8.5px; margin-top: 0.5mm;">
          <tr><td>TERM:</td><td style="text-align: right; font-weight: 900;">${paymentSectionData.term.toUpperCase()}</td></tr>
          <tr><td>TYPE:</td><td style="text-align: right;">${paymentSectionData.transType} [${paymentSectionData.currency}]</td></tr>
          <tr style="border-top: 1px solid #eee;"><td>INV TOTAL:</td><td style="text-align: right;">${currency}${paymentSectionData.invTotal.toLocaleString()}</td></tr>
          ${paymentSectionData.discount > 0 ? `<tr><td>DISCOUNT:</td><td style="text-align: right;">-${currency}${paymentSectionData.discount.toLocaleString()}</td></tr>` : ''}
          <tr><td>RECEIPT:</td><td style="text-align: right; font-weight: 900;">${currency}${paymentSectionData.receipt.toLocaleString()}</td></tr>
          <tr><td>LAST LOAN:</td><td style="text-align: right;">${currency}${paymentSectionData.lastLoan.toLocaleString()}</td></tr>
          <tr style="border-top: 1px solid #000; font-weight: 900; font-size: 10px;">
            <td style="padding-top: 0.5mm;">BALANCE:</td>
            <td style="text-align: right; padding-top: 0.5mm;">${currency}${paymentSectionData.finalBalance.toLocaleString()}</td>
          </tr>
          ${exRate !== 1 ? `
            <tr style="font-size: 7px; opacity: 0.8;">
              <td>${secondaryCurrency} RATE: ${exRate}</td>
              <td style="text-align: right;">${secondaryCurrency}${(paymentSectionData.finalBalance * exRate).toLocaleString()}</td>
            </tr>
          ` : ''}
        </table>

        <div style="text-align: center; font-size: 7px; font-weight: 900; margin-top: 1.5mm; border-top: 1px dashed #000; padding-top: 0.5mm;">
          ${activeTemplate.footerText || 'THANK YOU'}
        </div>
      </div>
    `;
  }

  // A4 Layout - Extreme High Density (20+ Items per page)
  const commonStyles = `
    .invoice-container { padding: 8mm; width: 210mm; min-height: 297mm; box-sizing: border-box; background: white; color: #1e293b; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; }
    .header-centered { text-align: center; margin-bottom: 4mm; border-bottom: 2px solid ${brandColor}; padding-bottom: 3mm; }
    .logo-img { height: 20mm; margin-bottom: 2mm; display: block; margin-left: auto; margin-right: auto; object-fit: contain; }
    .shop-info h1 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; line-height: 1; }
    .shop-info p { margin: 0.5px 0; font-size: 9px; color: #64748b; font-weight: 600; }
    .invoice-title { font-size: 38px; font-weight: 900; color: ${brandColor}; text-transform: uppercase; margin: 2mm 0; line-height: 1; letter-spacing: -1.5px; }
    .meta-grid { display: flex; justify-content: space-between; margin-bottom: 3mm; background: #f8fafc; padding: 2mm 4mm; border-radius: 2mm; }
    .meta-item b { display: block; font-size: 8px; color: #64748b; text-transform: uppercase; margin-bottom: 0.5mm; }
    .meta-item span { font-size: 12px; font-weight: 800; color: #0f172a; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; flex: 1; }
    .items-table th { padding: 2mm; text-align: left; font-size: 8px; font-weight: 900; color: #64748b; border-bottom: 1.5px solid #e2e8f0; text-transform: uppercase; background: #fdfdfd; }
    .items-table td { padding: 1.8mm 2mm; font-size: 10px; border-bottom: 0.5px solid #f1f5f9; line-height: 1; }
    .summary-section { width: 100%; display: flex; justify-content: flex-end; margin-top: 2mm; }
    .summary-table { width: 100mm; border-collapse: collapse; border: 1.5px solid #0f172a; }
    .summary-table td { padding: 2mm 3.5mm; font-size: 10px; border-bottom: 1px solid #f1f5f9; }
    .summary-table .label { font-weight: 900; color: #64748b; text-transform: uppercase; font-size: 8px; width: 50%; }
    .summary-table .value { text-align: right; font-weight: 700; color: #0f172a; }
    .summary-table .balance-row { background: #0f172a; color: white; border-bottom: none; }
    .summary-table .balance-row .label { color: #94a3b8; }
    .summary-table .balance-row .value { color: white; font-size: 18px; font-weight: 900; }
    .footer { margin-top: 4mm; padding-top: 3mm; border-top: 1px solid #f1f5f9; text-align: center; font-size: 8px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
  `;

  return `
    <div dir="${direction}" class="invoice-container">
      <style>${commonStyles}</style>
      
      <div class="header-centered">
        ${shop.shopLogo ? `<img src="${shop.shopLogo}" class="logo-img" />` : ''}
        <div class="shop-info">
          <h1>${shop.shopName}</h1>
          <p>${shop.shopAddress || ''}</p>
          <p>TEL: ${shop.shopPhone || ''} | EMAIL: ${shop.shopEmail || ''}</p>
        </div>
        <div class="invoice-title">INVOICE</div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <b>Reference</b>
          <span>#${invIdDisplay}</span>
        </div>
        <div class="meta-item">
          <b>Date</b>
          <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>
        <div class="meta-item" style="text-align: right;">
          <b>Customer</b>
          <span style="display: block;">${cust ? cust.name.toUpperCase() : 'WALK-IN ACCOUNT'}</span>
          ${cust ? `<span style="font-size: 10px; font-weight: 600; opacity: 0.7;">${cust.phone}</span>` : ''}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 55%;">Description</th>
            <th style="text-align: center; width: 10%;">Qty</th>
            <th style="text-align: right; width: 15%;">Rate</th>
            <th style="text-align: right; width: 20%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map(it => `
            <tr>
              <td style="font-weight: 700;">${it.name.toUpperCase()}</td>
              <td style="text-align: center;">${it.quantity}</td>
              <td style="text-align: right;">${currency}${it.price.toLocaleString()}</td>
              <td style="text-align: right; font-weight: 900;">${currency}${(it.price * it.quantity).toLocaleString()}</td>
            </tr>
          `).join('')}
          ${Array(Math.max(0, 20 - inv.items.length)).fill(0).map(() => `
            <tr><td style="color:transparent;">.</td><td></td><td></td><td></td></tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-section">
        <table class="summary-table">
          <tr>
            <td class="label">Payment Term / Mode</td>
            <td class="value">${paymentSectionData.term.toUpperCase()} / ${paymentSectionData.transType}</td>
          </tr>
          <tr>
            <td class="label">Subtotal</td>
            <td class="value">${currency}${paymentSectionData.invTotal.toLocaleString()}</td>
          </tr>
          ${paymentSectionData.discount > 0 ? `
          <tr>
            <td class="label">Discount</td>
            <td class="value" style="color: #e11d48;">-${currency}${paymentSectionData.discount.toLocaleString()}</td>
          </tr>` : ''}
          <tr>
            <td class="label">Amount Paid</td>
            <td class="value" style="color: #059669;">${currency}${paymentSectionData.receipt.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="label">Previous Liability</td>
            <td class="value">${currency}${paymentSectionData.lastLoan.toLocaleString()}</td>
          </tr>
          <tr class="balance-row">
            <td class="label">Net Balance</td>
            <td class="value">
              ${currency}${paymentSectionData.finalBalance.toLocaleString()}
              ${exRate !== 1 ? `<div style="font-size: 8px; opacity: 0.7; font-weight: 400; margin-top: 1mm;">≈ ${secondaryCurrency}${(paymentSectionData.finalBalance * exRate).toLocaleString()}</div>` : ''}
            </td>
          </tr>
        </table>
      </div>

      <div class="footer">
        ${activeTemplate.footerText || 'Electronically Verified Document - No Signature Required'}
      </div>
    </div>
  `;
};