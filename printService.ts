import { Invoice, AppState, Customer } from './types';

export type PrintLayout = 'thermal' | 'a4' | 'auto';

export const generatePrintHTML = (state: AppState, inv: Invoice, layoutType: PrintLayout): string => {
  const cust = state.customers.find(c => c.id === inv.customerId);
  const shop = state.settings;
  const isRTL = shop.language === 'ps' || shop.language === 'dr';
  const direction = isRTL ? 'rtl' : 'ltr';
  
  const activeTemplate = state.templates.find(t => t.id === shop.invoiceTemplate) || state.templates[0];
  const currency = shop.currency;

  const effectiveLayout = layoutType === 'thermal' ? 'thermal' : activeTemplate.layout;
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
    current: inv.total + (inv.discount || 0),
    discount: inv.discount || 0,
    receipt: inv.paidAmount,
    last: lastLoan,
    total: finalBalance
  };

  // Styles shared for both print and capture
  const thermalStyles = `
    .thermal-doc {
      width: 72mm;
      margin: 0;
      padding: 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #000 !important;
      background: #fff !important;
      line-height: 1.1;
    }
    .thermal-doc * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
  `;

  if (effectiveLayout === 'thermal' || effectiveLayout === 'receipt') {
    return `
      <div dir="${direction}" class="thermal-doc">
        <style>${thermalStyles}</style>
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 2mm; margin-bottom: 2mm; display: flex; flex-direction: column; align-items: center;">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="height: 15mm; margin-bottom: 1.5mm; object-fit: contain;" />` : ''}
          <div style="font-size: 14px; font-weight: 900;">${shop.shopName.toUpperCase()}</div>
          <div style="font-size: 9px; font-weight: 700;">${shop.shopAddress || ''}</div>
          <div style="font-size: 9px; font-weight: 700;">${shop.shopPhone ? `TEL: ${shop.shopPhone}` : ''}</div>
          <div style="font-size: 18px; font-weight: 900; margin-top: 2mm; border: 2px solid #000; padding: 1mm 4mm; display: inline-block;">INVOICE</div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 1mm; font-size: 10px;">
          <span>NO: #${invIdDisplay}</span>
          <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>
        <div style="margin-bottom: 0.5mm; font-weight: 900; font-size: 10px;">CLIENT: ${cust ? cust.name.toUpperCase() : 'CASH CLIENT'}</div>
        ${cust ? `<div style="margin-bottom: 1.5mm; font-size: 9px; font-weight: 700;">TEL: ${cust.phone}</div>` : ''}
        
        <table style="width: 100%; font-size: 10px; border-collapse: collapse; border-top: 1px solid #000; border-bottom: 1px dashed #000;">
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; padding: 1mm 0;">ITEM</th>
              <th style="text-align: center; width: 15%;">QTY</th>
              <th style="text-align: right; width: 30%;">SUM</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(it => `
              <tr>
                <td style="padding: 1mm 0; font-weight: 700;">${it.name.toUpperCase().substring(0, 24)}</td>
                <td style="text-align: center; font-weight: 900;">${it.quantity}</td>
                <td style="text-align: right; font-weight: 900;">${(it.price * it.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 2mm; font-weight: 800;">
          <tr><td style="padding: 0.5mm 0;">CURRENT:</td><td style="text-align: right;">${currency}${paymentSectionData.current.toLocaleString()}</td></tr>
          ${paymentSectionData.discount > 0 ? `<tr><td style="padding: 0.5mm 0;">DISCOUNT:</td><td style="text-align: right;">-${currency}${paymentSectionData.discount.toLocaleString()}</td></tr>` : ''}
          <tr><td style="padding: 0.5mm 0;">RECEIPT:</td><td style="text-align: right; border-bottom: 1px solid #000;">${currency}${paymentSectionData.receipt.toLocaleString()}</td></tr>
          <tr><td style="padding: 0.5mm 0;">LAST:</td><td style="text-align: right;">${currency}${paymentSectionData.last.toLocaleString()}</td></tr>
          <tr style="border-top: 2px solid #000; font-weight: 950; font-size: 13px;">
            <td style="padding-top: 1.5mm;">TOTAL:</td>
            <td style="text-align: right; padding-top: 1.5mm;">${currency}${paymentSectionData.total.toLocaleString()}</td>
          </tr>
        </table>

        <div style="text-align: center; font-size: 9px; font-weight: 900; margin-top: 4mm; border-top: 1px dashed #000; padding-top: 2mm;">
          ${activeTemplate.footerText || 'THANK YOU FOR YOUR PATRONAGE'}
        </div>
        <div style="height: 10mm;"></div>
      </div>
    `;
  }

  const a4Styles = `
    .a4-container {
      padding: 10mm;
      width: 210mm;
      min-height: 297mm;
      box-sizing: border-box;
      background: #fff !important;
      color: #000 !important;
      font-family: 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }
    .a4-container * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
    .header-centered { text-align: center; margin-bottom: 6mm; border-bottom: 4px solid #000; padding-bottom: 4mm; display: flex; flex-direction: column; align-items: center; }
    .logo-img { height: 25mm; margin-bottom: 3mm; object-fit: contain; }
    .shop-info h1 { margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; color: #000; line-height: 1; }
    .shop-info p { margin: 1px 0; font-size: 11px; color: #333; font-weight: 700; }
    .invoice-title { font-size: 48px; font-weight: 950; color: #000; text-transform: uppercase; margin: 4mm 0; line-height: 1; letter-spacing: -2px; border: 5px solid #000; display: inline-block; padding: 2mm 15mm; }
    .meta-grid { display: flex; justify-content: space-between; margin-bottom: 6mm; background: #fff; padding: 4mm 6mm; border-radius: 4mm; border: 2px solid #000; }
    .meta-item b { display: block; font-size: 10px; color: #000; text-transform: uppercase; margin-bottom: 1mm; font-weight: 900; }
    .meta-item span { font-size: 15px; font-weight: 900; color: #000; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 8mm; flex: 1; }
    .items-table th { padding: 3mm; text-align: left; font-size: 11px; font-weight: 950; color: #fff !important; background: #000 !important; text-transform: uppercase; border: 1px solid #000; }
    .items-table td { padding: 1.8mm 3mm; font-size: 12px; border: 1px solid #000; font-weight: 700; }
    .summary-section { width: 100%; display: flex; justify-content: flex-end; margin-top: 4mm; }
    .summary-table { width: 110mm; border-collapse: collapse; border: 3px solid #000; }
    .summary-table td { padding: 3mm 5mm; font-size: 12px; border-bottom: 1px solid #000; }
    .summary-table .label { font-weight: 950; color: #000; text-transform: uppercase; font-size: 11px; width: 55%; background: #fff; }
    .summary-table .value { text-align: right; font-weight: 900; color: #000; font-size: 14px; }
    .summary-table .total-row { background: #000 !important; color: #fff !important; border-bottom: none; }
    .summary-table .total-row .label { background: #000 !important; color: #fff !important; font-size: 14px; }
    .summary-table .total-row .value { color: #fff !important; font-size: 28px; font-weight: 950; }
    .footer { margin-top: 10mm; padding-top: 5mm; border-top: 3px solid #000; text-align: center; font-size: 11px; color: #000; text-transform: uppercase; font-weight: 900; }
  `;

  return `
    <div dir="${direction}" class="a4-container">
      <style>${a4Styles}</style>
      
      <div class="header-centered">
        ${shop.shopLogo ? `<img src="${shop.shopLogo}" class="logo-img" />` : ''}
        <div class="shop-info">
          <h1>${shop.shopName}</h1>
          <p>${shop.shopAddress || ''}</p>
          <p>CONTACT: ${shop.shopPhone || ''} | ${shop.shopEmail || ''}</p>
        </div>
        <div class="invoice-title">INVOICE</div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <b>REFERENCE NO</b>
          <span>#${invIdDisplay}</span>
        </div>
        <div class="meta-item">
          <b>DATE OF ISSUE</b>
          <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>
        <div class="meta-item" style="text-align: right;">
          <b>CUSTOMER IDENTITY</b>
          <span style="display: block;">${cust ? cust.name.toUpperCase() : 'NON-REGISTERED CLIENT'}</span>
          ${cust ? `<span style="font-size: 12px; font-weight: 950; color: #000;">PHONE: ${cust.phone}</span>` : ''}
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
          ${inv.items.map(it => `
            <tr>
              <td style="font-weight: 800;">${it.name.toUpperCase()}</td>
              <td style="text-align: center; font-weight: 900;">${it.quantity}</td>
              <td style="text-align: right;">${currency}${it.price.toLocaleString()}</td>
              <td style="text-align: right; font-weight: 950;">${currency}${(it.price * it.quantity).toLocaleString()}</td>
            </tr>
          `).join('')}
          ${Array(Math.max(0, 20 - inv.items.length)).fill(0).map(() => `
            <tr style="height: 1.8mm;"><td style="color:transparent;">.</td><td></td><td></td><td></td></tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-section">
        <table class="summary-table">
          <tr>
            <td class="label">CURRENT</td>
            <td class="value">${currency}${paymentSectionData.current.toLocaleString()}</td>
          </tr>
          ${paymentSectionData.discount > 0 ? `
          <tr>
            <td class="label">DISCOUNT</td>
            <td class="value">-${currency}${paymentSectionData.discount.toLocaleString()}</td>
          </tr>` : ''}
          <tr>
            <td class="label">RECEIPT</td>
            <td class="value" style="text-decoration: underline;">${currency}${paymentSectionData.receipt.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="label">LAST</td>
            <td class="value">${currency}${paymentSectionData.last.toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td class="label">TOTAL BALANCE</td>
            <td class="value">
              ${currency}${paymentSectionData.total.toLocaleString()}
            </td>
          </tr>
        </table>
      </div>

      <div class="footer">
        ${activeTemplate.footerText || 'THIS DOCUMENT IS AN OFFICIAL SYSTEM-GENERATED RECEIPT. VERIFIED FOR BUSINESS USE.'}
      </div>
    </div>
  `;
};