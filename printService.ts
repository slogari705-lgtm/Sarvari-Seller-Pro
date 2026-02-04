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

  // Logic for LAST (Previous Balance) and TOTAL (Aggregate)
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

  // 1. MOBILE THERMAL LAYOUT (Optimized for White Paper / 72-80mm)
  if (layoutType === 'thermal' || (layoutType === 'auto' && activeTemplate.layout === 'thermal')) {
    return `
      <div dir="${direction}" style="width: 72mm; margin: 0; padding: 0; font-family: 'Inter', 'Courier New', monospace; font-size: 11px; color: #000; background: #fff; line-height: 1.2;">
        <style>
          @media print { body { background: #fff; } }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
        </style>
        
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 3mm; margin-bottom: 4mm;">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="height: 14mm; margin-bottom: 2mm; object-fit: contain;" />` : ''}
          <div style="font-size: 16px; font-weight: 900; letter-spacing: -0.5px;">${shop.shopName.toUpperCase()}</div>
          <div style="font-size: 9px; font-weight: 600;">${shop.shopAddress || ''}</div>
          <div style="font-size: 9px; font-weight: 600;">TEL: ${shop.shopPhone || ''}</div>
          <div style="font-size: 18px; font-weight: 900; border: 2px solid #000; padding: 1mm 4mm; display: inline-block; margin-top: 2mm;">RECEIPT</div>
        </div>

        <div style="display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 3mm; border-bottom: 1px dashed #000; padding-bottom: 1mm;">
          <span>NO: #${invIdDisplay}</span>
          <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>

        <div style="margin-bottom: 3mm;">
          <div style="font-size: 11px; font-weight: 900;">CLIENT: ${cust ? cust.name.toUpperCase() : 'CASH SALE'}</div>
          ${cust ? `<div style="font-size: 9px; font-weight: 600;">TEL: ${cust.phone}</div>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 4mm;">
          <thead style="border-bottom: 2px solid #000;">
            <tr>
              <th style="text-align: left; padding: 1mm 0;">ITEM</th>
              <th style="text-align: center; width: 15%;">QTY</th>
              <th style="text-align: right; width: 25%;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(it => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 2mm 0; font-weight: 700;">${it.name.toUpperCase()}</td>
                <td style="text-align: center; font-weight: 900;">${it.quantity}</td>
                <td style="text-align: right; font-weight: 900;">${(it.price * it.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="border-top: 2px solid #000; padding-top: 2mm; margin-top: 2mm;">
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; font-weight: 800;">
            <tr><td style="padding: 1mm 0;">CURRENT:</td><td style="text-align: right;">${currency}${paymentSectionData.current.toLocaleString()}</td></tr>
            ${paymentSectionData.discount > 0 ? `<tr><td style="padding: 1mm 0;">DISCOUNT:</td><td style="text-align: right;">-${currency}${paymentSectionData.discount.toLocaleString()}</td></tr>` : ''}
            <tr><td style="padding: 1mm 0; border-bottom: 1px dashed #ccc;">RECEIPT:</td><td style="text-align: right; border-bottom: 1px dashed #ccc;">${currency}${paymentSectionData.receipt.toLocaleString()}</td></tr>
            <tr><td style="padding: 1mm 0;">LAST:</td><td style="text-align: right;">${currency}${paymentSectionData.last.toLocaleString()}</td></tr>
            <tr style="font-size: 15px; font-weight: 950; border-top: 2px solid #000;">
              <td style="padding-top: 2mm;">TOTAL DUE:</td>
              <td style="text-align: right; padding-top: 2mm;">${currency}${paymentSectionData.total.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 10mm; font-weight: 900; font-size: 9px; border-top: 1px dashed #000; padding-top: 4mm;">
          ${activeTemplate.footerText || 'THANK YOU FOR YOUR PATRONAGE'}
        </div>
        <div style="height: 15mm;"></div>
      </div>
    `;
  }

  // 2. COMPUTER A4 LAYOUT (TrulySmall Inspired + Precise Requirements)
  const a4Styles = `
    .a4-container {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
      background: #fff !important;
      color: #000 !important;
      font-family: 'Inter', sans-serif;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
    .a4-container * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
    
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15mm; }
    .company-info h1 { font-size: 26px; font-weight: 900; margin: 0; text-transform: uppercase; color: #000; }
    .company-info p { font-size: 11px; margin: 1px 0; color: #444; font-weight: 600; }
    .invoice-header { text-align: right; }
    .invoice-label { font-size: 48px; font-weight: 900; color: #000; line-height: 1; margin: 0 0 4mm 0; }
    .meta-box { font-size: 13px; font-weight: 700; }
    .meta-box span { color: #666; font-size: 11px; text-transform: uppercase; display: inline-block; width: 100px; }

    .bill-section { margin-bottom: 12mm; border-top: 3px solid #000; padding-top: 6mm; }
    .bill-to-title { font-size: 11px; font-weight: 900; color: #666; text-transform: uppercase; margin-bottom: 2mm; }
    .client-name { font-size: 22px; font-weight: 900; text-transform: uppercase; }
    .client-data { font-size: 13px; color: #333; margin-top: 1px; font-weight: 500; }

    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10mm; flex: 1; }
    .items-table th { 
      background: #000 !important; 
      color: #fff !important; 
      text-align: left; 
      padding: 4mm 5mm; 
      font-size: 12px; 
      font-weight: 900; 
      text-transform: uppercase;
      border: 1px solid #000;
    }
    .items-table td { 
      padding: 3.5mm 5mm; 
      font-size: 13px; 
      font-weight: 700; 
      border-bottom: 1px solid #eee;
      border-left: 1px solid #eee;
      border-right: 1px solid #eee;
    }
    .row-odd { background: #f9f9f9 !important; }

    .summary-section { width: 100%; display: flex; justify-content: flex-end; margin-top: 6mm; }
    .summary-table { width: 105mm; border-collapse: collapse; border: 3px solid #000; }
    .summary-table td { padding: 4mm 6mm; font-size: 14px; border-bottom: 1px solid #eee; }
    .summary-table .label { font-weight: 900; color: #666; text-transform: uppercase; font-size: 11px; }
    .summary-table .value { text-align: right; font-weight: 900; color: #000; }
    .summary-table .grand-total { background: #000 !important; color: #fff !important; }
    .summary-table .grand-total .label { color: #fff; font-size: 16px; }
    .summary-table .grand-total .value { color: #fff; font-size: 32px; font-weight: 950; }

    .footer { margin-top: 15mm; border-top: 1px solid #eee; padding-top: 8mm; text-align: center; }
    .footer p { font-size: 11px; color: #888; font-weight: 600; margin: 0; }
  `;

  return `
    <div dir="${direction}" class="a4-container">
      <style>${a4Styles}</style>
      
      <div class="header-top">
        <div class="company-info">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="height: 25mm; margin-bottom: 4mm; object-fit: contain;" />` : ''}
          <h1>${shop.shopName}</h1>
          <p>${shop.shopAddress || ''}</p>
          <p>CONTACT: ${shop.shopPhone || ''} | ${shop.shopEmail || ''}</p>
        </div>
        <div class="invoice-header">
          <h2 class="invoice-label">INVOICE</h2>
          <div class="meta-box"><span>Invoice Number</span> #${invIdDisplay}</div>
          <div class="meta-box"><span>Date of Issue</span> ${new Date(inv.date).toLocaleDateString()}</div>
          <div class="meta-box"><span>Payment Mode</span> ${inv.paymentMethod.toUpperCase()}</div>
        </div>
      </div>

      <div class="bill-section">
        <div class="bill-to-title">Billed To:</div>
        <div class="client-name">${cust ? cust.name : 'WALK-IN CLIENT'}</div>
        <div class="client-data">${cust ? cust.phone : 'N/A'}</div>
        <div class="client-data">${cust?.address || ''}</div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 55%;">Product / Service Description</th>
            <th style="text-align: center; width: 10%;">Qty</th>
            <th style="text-align: right; width: 15%;">Unit Rate</th>
            <th style="text-align: right; width: 20%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map((it, i) => `
            <tr class="${i % 2 === 0 ? '' : 'row-odd'}">
              <td style="font-weight: 800;">${it.name.toUpperCase()}</td>
              <td style="text-align: center;">${it.quantity}</td>
              <td style="text-align: right;">${currency}${it.price.toLocaleString()}</td>
              <td style="text-align: right; font-weight: 900;">${currency}${(it.price * it.quantity).toLocaleString()}</td>
            </tr>
          `).join('')}
          ${Array(Math.max(0, 20 - inv.items.length)).fill(0).map(() => `
            <tr style="height: 4mm;"><td></td><td></td><td></td><td></td></tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-section">
        <table class="summary-table">
          <tr>
            <td class="label">CURRENT INVOICE TOTAL</td>
            <td class="value">${currency}${paymentSectionData.current.toLocaleString()}</td>
          </tr>
          ${paymentSectionData.discount > 0 ? `
            <tr>
              <td class="label">APPLIED DISCOUNT</td>
              <td class="value">-${currency}${paymentSectionData.discount.toLocaleString()}</td>
            </tr>
          ` : ''}
          <tr>
            <td class="label">RECEIPT / PAID NOW</td>
            <td class="value" style="text-decoration: underline;">${currency}${paymentSectionData.receipt.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="label">LAST BALANCE (PREVIOUS)</td>
            <td class="value">${currency}${paymentSectionData.last.toLocaleString()}</td>
          </tr>
          <tr class="grand-total">
            <td class="label">GRAND TOTAL BALANCE</td>
            <td class="value">${currency}${paymentSectionData.total.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p>${activeTemplate.footerText || 'THANK YOU FOR YOUR BUSINESS. THIS IS A COMPUTER GENERATED DOCUMENT.'}</p>
        <p style="margin-top: 2mm; font-size: 8px; opacity: 0.5;">AUTHORIZED BY SARVARI SELLER PRO POS INFRASTRUCTURE</p>
      </div>
    </div>
  `;
};