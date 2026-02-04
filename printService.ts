import { Invoice, AppState, Customer } from './types';

export type PrintLayout = 'thermal' | 'a4' | 'auto';

export const generatePrintHTML = (state: AppState, inv: Invoice, layoutType: PrintLayout): string => {
  const cust = state.customers.find(c => c.id === inv.customerId);
  const shop = state.settings;
  const isRTL = shop.language === 'ps' || shop.language === 'dr';
  const direction = isRTL ? 'rtl' : 'ltr';
  
  const activeTemplate = state.templates.find(t => t.id === shop.invoiceTemplate) || state.templates[0];
  const currency = shop.currency;
  const secondaryCurrency = shop.secondaryCurrency || '';
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

  // 1. MOBILE THERMAL LAYOUT (72mm Optimized)
  if (layoutType === 'thermal' || (layoutType === 'auto' && activeTemplate.layout === 'thermal')) {
    return `
      <div dir="${direction}" style="width: 72mm; margin: 0; padding: 0; font-family: 'Inter', 'Courier New', monospace; font-size: 10px; color: #000; background: #fff; line-height: 1.1;">
        <style>
          @media print { body { background: #fff; } }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
        </style>
        
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 2mm; margin-bottom: 3mm;">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="height: 12mm; margin-bottom: 1.5mm; object-fit: contain;" />` : ''}
          <div style="font-size: 14px; font-weight: 900; letter-spacing: -0.5px;">${shop.shopName.toUpperCase()}</div>
          <div style="font-size: 8px; font-weight: 600;">${shop.shopAddress || ''}</div>
          <div style="font-size: 8px; font-weight: 600;">TEL: ${shop.shopPhone || ''}</div>
          <div style="font-size: 16px; font-weight: 900; border: 1.5px solid #000; padding: 1mm 3mm; display: inline-block; margin-top: 1.5mm;">OFFICIAL RECEIPT</div>
        </div>

        <div style="display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 2mm; border-bottom: 1px dashed #000; padding-bottom: 1mm;">
          <span>NO: #${invIdDisplay}</span>
          <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>

        <div style="margin-bottom: 2mm;">
          <div style="font-size: 10px; font-weight: 900;">CLIENT: ${cust ? cust.name.toUpperCase() : 'CASH SALE'}</div>
          ${cust ? `<div style="font-size: 8px; font-weight: 600;">TEL: ${cust.phone}</div>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 3mm;">
          <thead style="border-bottom: 1.5px solid #000;">
            <tr>
              <th style="text-align: left; padding: 1mm 0;">ITEM</th>
              <th style="text-align: center; width: 15%;">QTY</th>
              <th style="text-align: right; width: 25%;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(it => `
              <tr style="border-bottom: 0.5px solid #eee;">
                <td style="padding: 1.5mm 0; font-weight: 700;">${it.name.toUpperCase()}</td>
                <td style="text-align: center; font-weight: 900;">${it.quantity}</td>
                <td style="text-align: right; font-weight: 900;">${(it.price * it.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="background: #f9f9f9; padding: 2mm; border-radius: 2mm; margin-bottom: 3mm;">
          <div style="font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase; margin-bottom: 1mm; border-bottom: 1px solid #ddd;">Payment Information</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1px;"><span>Term:</span><b>${inv.paymentTerm || 'Immediate'}</b></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1px;"><span>Type:</span><b>${inv.paymentMethod.toUpperCase()}</b></div>
          <div style="display: flex; justify-content: space-between;"><span>Currency:</span><b>${currency} ${secondaryCurrency ? `(${secondaryCurrency})` : ''}</b></div>
        </div>

        <div style="border-top: 1.5px solid #000; padding-top: 1mm;">
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; font-weight: 800;">
            <tr><td style="padding: 0.8mm 0;">CURRENT TOTAL:</td><td style="text-align: right;">${currency}${paymentSectionData.current.toLocaleString()}</td></tr>
            ${paymentSectionData.discount > 0 ? `<tr><td style="padding: 0.8mm 0;">DISCOUNT:</td><td style="text-align: right; color: #d00;">-${currency}${paymentSectionData.discount.toLocaleString()}</td></tr>` : ''}
            <tr><td style="padding: 0.8mm 0; border-bottom: 1px dashed #ccc;">RECEIPT:</td><td style="text-align: right; border-bottom: 1px dashed #ccc;">${currency}${paymentSectionData.receipt.toLocaleString()}</td></tr>
            <tr><td style="padding: 0.8mm 0;">LAST LOAN:</td><td style="text-align: right;">${currency}${paymentSectionData.last.toLocaleString()}</td></tr>
            <tr style="font-size: 13px; font-weight: 950; border-top: 2px solid #000;">
              <td style="padding-top: 1.5mm;">TOTAL BALANCE:</td>
              <td style="text-align: right; padding-top: 1.5mm;">${currency}${paymentSectionData.total.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 6mm; font-weight: 900; font-size: 8px; border-top: 1px dashed #000; padding-top: 3mm;">
          ${activeTemplate.footerText || 'THANK YOU FOR YOUR PATRONAGE'}
        </div>
        <div style="height: 10mm;"></div>
      </div>
    `;
  }

  // 2. COMPUTER A4 LAYOUT (210mm Professional)
  const a4Styles = `
    .a4-container {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      background: #fff !important;
      color: #000 !important;
      font-family: 'Inter', sans-serif;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
    .a4-container * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
    
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12mm; }
    .company-info h1 { font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase; color: #000; letter-spacing: -1px; }
    .company-info p { font-size: 11px; margin: 2px 0; color: #444; font-weight: 600; }
    
    .invoice-header { text-align: right; }
    .invoice-label { font-size: 52px; font-weight: 900; color: #000; line-height: 0.9; margin: 0 0 5mm 0; letter-spacing: -2px; }
    .meta-box { font-size: 13px; font-weight: 700; margin-bottom: 1.5mm; }
    .meta-box span { color: #666; font-size: 10px; text-transform: uppercase; display: inline-block; width: 110px; }

    .bill-section { margin-bottom: 10mm; border-top: 4px solid #000; padding-top: 6mm; display: flex; justify-content: space-between; }
    .bill-to-title { font-size: 11px; font-weight: 900; color: #666; text-transform: uppercase; margin-bottom: 3mm; }
    .client-name { font-size: 24px; font-weight: 900; text-transform: uppercase; line-height: 1; }
    .client-data { font-size: 13px; color: #333; margin-top: 2px; font-weight: 600; }

    .payment-info-box { 
      background: #f8fafc; 
      padding: 6mm; 
      border-radius: 4mm; 
      border: 1px solid #e2e8f0; 
      width: 80mm; 
      display: flex; 
      flex-direction: column; 
      gap: 2mm; 
    }
    .pay-info-row { display: flex; justify-content: space-between; font-size: 12px; }
    .pay-info-label { font-weight: 900; color: #64748b; text-transform: uppercase; font-size: 10px; }
    .pay-info-value { font-weight: 900; color: #1e293b; }

    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10mm; flex: 1; }
    .items-table th { 
      background: #000 !important; 
      color: #fff !important; 
      text-align: left; 
      padding: 4.5mm 5mm; 
      font-size: 11px; 
      font-weight: 900; 
      text-transform: uppercase;
      border: 1px solid #000;
    }
    .items-table td { 
      padding: 4mm 5mm; 
      font-size: 13px; 
      font-weight: 700; 
      border-bottom: 1px solid #eee;
      border-left: 1px solid #eee;
      border-right: 1px solid #eee;
    }
    .row-odd { background: #fdfdfd !important; }

    .summary-section { width: 100%; display: flex; justify-content: flex-end; margin-top: 10mm; }
    .summary-table { width: 115mm; border-collapse: collapse; border: 4px solid #000; }
    .summary-table td { padding: 4mm 8mm; font-size: 15px; border-bottom: 1px solid #eee; }
    .summary-table .label { font-weight: 900; color: #666; text-transform: uppercase; font-size: 11px; }
    .summary-table .value { text-align: right; font-weight: 900; color: #000; }
    .summary-table .grand-total { background: #000 !important; color: #fff !important; border-bottom: none; }
    .summary-table .grand-total .label { color: #fff; font-size: 18px; }
    .summary-table .grand-total .value { color: #fff; font-size: 38px; font-weight: 950; line-height: 1; }

    .footer { margin-top: 20mm; border-top: 2px solid #f1f5f9; padding-top: 10mm; text-align: center; }
    .footer p { font-size: 12px; color: #94a3b8; font-weight: 600; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
  `;

  return `
    <div dir="${direction}" class="a4-container">
      <style>${a4Styles}</style>
      
      <div class="header-top">
        <div class="company-info">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="height: 22mm; margin-bottom: 5mm; object-fit: contain;" />` : ''}
          <h1>${shop.shopName}</h1>
          <p>${shop.shopAddress || ''}</p>
          <p>CONTACT: ${shop.shopPhone || ''} | ${shop.shopEmail || ''}</p>
        </div>
        <div class="invoice-header">
          <h2 class="invoice-label">INVOICE</h2>
          <div class="meta-box"><span>Document ID</span> #${invIdDisplay}</div>
          <div class="meta-box"><span>Filing Date</span> ${new Date(inv.date).toLocaleDateString()}</div>
        </div>
      </div>

      <div class="bill-section">
        <div>
          <div class="bill-to-title">Invoice Addressed To:</div>
          <div class="client-name">${cust ? cust.name : 'WALK-IN ACCOUNT'}</div>
          <div class="client-data">${cust ? cust.phone : 'N/A'}</div>
          <div class="client-data">${cust?.address || ''}</div>
        </div>
        
        <div class="payment-info-box">
          <div class="pay-info-row">
            <span class="pay-info-label">Payment Term</span>
            <span class="pay-info-value">${inv.paymentTerm || 'Immediate Settlement'}</span>
          </div>
          <div class="pay-info-row">
            <span class="pay-info-label">Transaction Type</span>
            <span class="pay-info-value">${inv.paymentMethod.toUpperCase()}</span>
          </div>
          <div class="pay-info-row">
            <span class="pay-info-label">Base Currency</span>
            <span class="pay-info-value">${currency} ${secondaryCurrency ? `(${secondaryCurrency})` : ''}</span>
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 55%;">Asset / Service Description</th>
            <th style="text-align: center; width: 10%;">Qty</th>
            <th style="text-align: right; width: 15%;">Unit Rate</th>
            <th style="text-align: right; width: 20%;">Total Sum</th>
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
          ${Array(Math.max(0, 18 - inv.items.length)).fill(0).map(() => `
            <tr style="height: 5mm;"><td></td><td></td><td></td><td></td></tr>
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
              <td class="value" style="color: #d00;">-${currency}${paymentSectionData.discount.toLocaleString()}</td>
            </tr>
          ` : ''}
          <tr>
            <td class="label">RECEIPT / PAID NOW</td>
            <td class="value" style="text-decoration: underline;">${currency}${paymentSectionData.receipt.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="label">LAST LOAN (PREV. BALANCE)</td>
            <td class="value">${currency}${paymentSectionData.last.toLocaleString()}</td>
          </tr>
          <tr class="grand-total">
            <td class="label">GRAND TOTAL BALANCE</td>
            <td class="value">${currency}${paymentSectionData.total.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p>${activeTemplate.footerText || 'THANK YOU FOR YOUR PATRONAGE. THIS DOCUMENT IS LEGALLY RECOGNIZED AS A VALID RECEIPT.'}</p>
      </div>
    </div>
  `;
};