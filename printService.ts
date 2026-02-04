import { Invoice, AppState, Customer } from './types';

export type PrintLayout = 'thermal' | 'a4' | 'auto';

export const generatePrintHTML = (state: AppState, inv: Invoice, layoutType: PrintLayout): string => {
  const cust = state.customers.find(c => c.id === inv.customerId);
  const shop = state.settings;
  const isRTL = shop.language === 'ps' || shop.language === 'dr';
  const direction = isRTL ? 'rtl' : 'ltr';
  
  const activeTemplate = state.templates.find(t => t.id === shop.invoiceTemplate) || state.templates[0];
  const currency = shop.currency;
  const invIdDisplay = `${shop.invoicePrefix || ''}${inv.id.padStart(3, '0')}`;

  // Logic for LAST (Previous Debt) and TOTAL BALANCE
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
    current: inv.total + (inv.discount || 0),
    discount: inv.discount || 0,
    receipt: inv.paidAmount,
    last: lastLoan,
    total: finalBalance
  };

  // THERMAL MOBILE LAYOUT (Pure White Paper Optimization)
  if (layoutType === 'thermal' || (layoutType === 'auto' && activeTemplate.layout === 'thermal')) {
    return `
      <div dir="${direction}" style="width: 72mm; margin: 0; padding: 0; font-family: 'Inter', sans-serif; font-size: 11px; color: #000; background: #fff; line-height: 1.2;">
        <style>
          @media print { body { background: #fff; } }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
        </style>
        
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 3mm; margin-bottom: 3mm;">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="height: 15mm; margin-bottom: 2mm; object-fit: contain;" />` : ''}
          <div style="font-size: 16px; font-weight: 900; letter-spacing: -0.5px;">${shop.shopName.toUpperCase()}</div>
          <div style="font-size: 9px; font-weight: 600;">${shop.shopAddress || ''}</div>
          <div style="font-size: 9px; font-weight: 600;">${shop.shopPhone ? `TEL: ${shop.shopPhone}` : ''}</div>
        </div>

        <div style="display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 2mm; font-size: 10px; border-bottom: 1px solid #000; padding-bottom: 1mm;">
          <span>INVOICE #${invIdDisplay}</span>
          <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>

        <div style="margin-bottom: 3mm;">
          <div style="font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase;">Bill To:</div>
          <div style="font-size: 11px; font-weight: 900;">${cust ? cust.name.toUpperCase() : 'CASH CLIENT'}</div>
          ${cust ? `<div style="font-size: 9px; font-weight: 600;">TEL: ${cust.phone}</div>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 3mm;">
          <thead>
            <tr style="border-bottom: 2px solid #000; border-top: 1px solid #000;">
              <th style="text-align: left; padding: 1mm 0; font-size: 9px;">DESCRIPTION</th>
              <th style="text-align: center; width: 15%; font-size: 9px;">QTY</th>
              <th style="text-align: right; width: 25%; font-size: 9px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(it => `
              <tr style="border-bottom: 1px dashed #ccc;">
                <td style="padding: 1.5mm 0; font-weight: 700; font-size: 10px;">${it.name.toUpperCase()}</td>
                <td style="text-align: center; font-weight: 900;">${it.quantity}</td>
                <td style="text-align: right; font-weight: 900;">${(it.price * it.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="border-top: 2px solid #000; padding-top: 2mm;">
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; font-weight: 800;">
            <tr><td style="padding: 0.5mm 0;">CURRENT:</td><td style="text-align: right;">${currency}${paymentSectionData.current.toLocaleString()}</td></tr>
            ${paymentSectionData.discount > 0 ? `<tr><td style="padding: 0.5mm 0;">DISCOUNT:</td><td style="text-align: right;">-${currency}${paymentSectionData.discount.toLocaleString()}</td></tr>` : ''}
            <tr><td style="padding: 0.5mm 0;">RECEIPT:</td><td style="text-align: right;">${currency}${paymentSectionData.receipt.toLocaleString()}</td></tr>
            <tr><td style="padding: 0.5mm 0; border-bottom: 1px solid #000;">LAST:</td><td style="text-align: right; border-bottom: 1px solid #000;">${currency}${paymentSectionData.last.toLocaleString()}</td></tr>
            <tr style="font-size: 14px; font-weight: 900;">
              <td style="padding-top: 2mm;">TOTAL DUE:</td>
              <td style="text-align: right; padding-top: 2mm;">${currency}${paymentSectionData.total.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 6mm; font-weight: 900; font-size: 9px; border-top: 1px solid #000; padding-top: 3mm;">
          ${activeTemplate.footerText || 'THANK YOU FOR YOUR BUSINESS'}
        </div>
        <div style="height: 15mm;"></div>
      </div>
    `;
  }

  // A4 COMPUTER LAYOUT (TrulySmall Simple Template Style)
  const a4Styles = `
    .a4-wrapper {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
      background: white;
      color: #000;
      font-family: 'Inter', sans-serif;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
    .header-table { width: 100%; margin-bottom: 15mm; }
    .header-left { width: 60%; }
    .header-right { width: 40%; text-align: right; }
    .shop-logo { height: 25mm; margin-bottom: 5mm; object-fit: contain; }
    .shop-title { font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
    .shop-meta { font-size: 11px; color: #444; font-weight: 500; margin-top: 1mm; }
    .invoice-label { font-size: 42px; font-weight: 900; color: #000; line-height: 1; margin-bottom: 4mm; }
    .doc-meta { font-size: 12px; font-weight: 700; margin-bottom: 1mm; }
    .doc-meta b { color: #666; font-size: 10px; text-transform: uppercase; margin-right: 2mm; width: 80px; display: inline-block; }
    
    .billing-section { margin-bottom: 10mm; border-top: 2px solid #000; padding-top: 5mm; }
    .bill-to-label { font-size: 10px; font-weight: 900; color: #666; text-transform: uppercase; margin-bottom: 2mm; }
    .cust-name { font-size: 18px; font-weight: 900; text-transform: uppercase; }
    .cust-meta { font-size: 12px; color: #333; font-weight: 600; margin-top: 1mm; }

    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10mm; flex: 1; }
    .items-table th { 
      background: #000; 
      color: #fff; 
      text-align: left; 
      padding: 4mm; 
      font-size: 11px; 
      font-weight: 900; 
      text-transform: uppercase;
      border: 1px solid #000;
    }
    .items-table td { 
      padding: 3mm 4mm; 
      font-size: 12px; 
      font-weight: 700; 
      border: 1px solid #eee;
    }
    .items-table .row-even { background: #fcfcfc; }

    .summary-container { width: 100%; display: flex; justify-content: flex-end; }
    .summary-box { width: 100mm; border-collapse: collapse; }
    .summary-row td { padding: 3mm 5mm; font-size: 13px; border-bottom: 1px solid #eee; }
    .summary-label { font-weight: 900; color: #666; text-transform: uppercase; font-size: 11px; text-align: left; }
    .summary-value { font-weight: 900; text-align: right; font-size: 14px; }
    .total-row { background: #000; color: #fff !important; }
    .total-row .summary-label { color: #fff; font-size: 14px; }
    .total-row .summary-value { font-size: 24px; color: #fff; }

    .footer-note { margin-top: 20mm; border-top: 2px solid #eee; padding-top: 10mm; text-align: center; font-size: 11px; font-weight: 600; color: #888; }
  `;

  return `
    <div dir="${direction}" class="a4-wrapper">
      <style>${a4Styles}</style>
      
      <table class="header-table">
        <tr>
          <td class="header-left">
            ${shop.shopLogo ? `<img src="${shop.shopLogo}" class="shop-logo" />` : ''}
            <h1 class="shop-title">${shop.shopName}</h1>
            <p class="shop-meta">${shop.shopAddress || ''}</p>
            <p class="shop-meta">TEL: ${shop.shopPhone || ''} | EMAIL: ${shop.shopEmail || ''}</p>
          </td>
          <td class="header-right">
            <h2 class="invoice-label">INVOICE</h2>
            <div class="doc-meta"><b>Invoice #</b> <span>${invIdDisplay}</span></div>
            <div class="doc-meta"><b>Date</b> <span>${new Date(inv.date).toLocaleDateString()}</span></div>
            <div class="doc-meta"><b>Payment</b> <span>${inv.paymentMethod.toUpperCase()}</span></div>
          </td>
        </tr>
      </table>

      <div class="billing-section">
        <div class="bill-to-label">Invoice To:</div>
        <div class="cust-name">${cust ? cust.name : 'WALK-IN CLIENT'}</div>
        ${cust ? `
          <div class="cust-meta">${cust.phone}</div>
          <div class="cust-meta">${cust.address || ''}</div>
        ` : ''}
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50%;">Description</th>
            <th style="text-align: center; width: 10%;">Qty</th>
            <th style="text-align: right; width: 20%;">Price</th>
            <th style="text-align: right; width: 20%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map((it, i) => `
            <tr class="${i % 2 === 0 ? '' : 'row-even'}">
              <td>${it.name.toUpperCase()}</td>
              <td style="text-align: center;">${it.quantity}</td>
              <td style="text-align: right;">${currency}${it.price.toLocaleString()}</td>
              <td style="text-align: right;">${currency}${(it.price * it.quantity).toLocaleString()}</td>
            </tr>
          `).join('')}
          ${Array(Math.max(0, 15 - inv.items.length)).fill(0).map(() => `
            <tr style="height: 8mm;"><td></td><td></td><td></td><td></td></tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-container">
        <table class="summary-box">
          <tr class="summary-row">
            <td class="summary-label">CURRENT TOTAL</td>
            <td class="summary-value">${currency}${paymentSectionData.current.toLocaleString()}</td>
          </tr>
          ${paymentSectionData.discount > 0 ? `
            <tr class="summary-row">
              <td class="summary-label">DISCOUNT</td>
              <td class="summary-value">-${currency}${paymentSectionData.discount.toLocaleString()}</td>
            </tr>
          ` : ''}
          <tr class="summary-row">
            <td class="summary-label">RECEIPT / PAID</td>
            <td class="summary-value" style="text-decoration: underline;">${currency}${paymentSectionData.receipt.toLocaleString()}</td>
          </tr>
          <tr class="summary-row">
            <td class="summary-label">LAST BALANCE (PREV)</td>
            <td class="summary-value">${currency}${paymentSectionData.last.toLocaleString()}</td>
          </tr>
          <tr class="summary-row total-row">
            <td class="summary-label">GRAND TOTAL BALANCE</td>
            <td class="summary-value">${currency}${paymentSectionData.total.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="footer-note">
        ${activeTemplate.footerText || 'THANK YOU FOR YOUR PATRONAGE. THIS IS A COMPUTER GENERATED INVOICE.'}
      </div>
    </div>
  `;
};