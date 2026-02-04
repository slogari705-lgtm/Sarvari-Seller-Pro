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
    current: inv.total + (inv.discount || 0), // Invoice total before discount
    discount: inv.discount || 0,
    receipt: inv.paidAmount,
    last: lastLoan,
    total: finalBalance
  };

  if (effectiveLayout === 'thermal' || effectiveLayout === 'receipt') {
    return `
      <div dir="${direction}" style="width: 72mm; margin: 0 auto; padding: 0.2mm; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #000; background: #fff; line-height: 1.0;">
        <div style="text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 1.5mm; margin-bottom: 1.5mm; display: flex; flex-direction: column; align-items: center;">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="height: 12mm; margin-bottom: 1.5mm; object-fit: contain;" />` : ''}
          <div style="font-size: 13px; font-weight: 900;">${shop.shopName.toUpperCase()}</div>
          <div style="font-size: 8px;">${shop.shopAddress || ''}</div>
          <div style="font-size: 8px;">${shop.shopPhone ? `TEL: ${shop.shopPhone}` : ''}</div>
          <div style="font-size: 18px; font-weight: 900; margin-top: 2mm; border: 1.5px solid #000; padding: 1mm 5mm; display: inline-block;">INVOICE</div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 0.5mm; font-size: 9px;">
          <span>NO: #${invIdDisplay}</span>
          <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>
        <div style="margin-bottom: 0.2mm; font-weight: 900; font-size: 9.5px;">CLIENT: ${cust ? cust.name.toUpperCase() : 'WALK-IN'}</div>
        ${cust ? `<div style="margin-bottom: 1mm; font-size: 8.5px; font-weight: 900;">TEL: ${cust.phone}</div>` : ''}
        
        <table style="width: 100%; font-size: 8.5px; border-collapse: collapse; border-bottom: 1px dashed #000;">
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; padding: 0.5mm 0;">ITEM</th>
              <th style="text-align: center;">QTY</th>
              <th style="text-align: right;">SUM</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(it => `
              <tr>
                <td style="padding: 0.5mm 0;">${it.name.toUpperCase().substring(0, 22)}</td>
                <td style="text-align: center;">${it.quantity}</td>
                <td style="text-align: right;">${(it.price * it.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 1.5mm; font-weight: 700;">
          <tr><td style="padding: 0.3mm 0;">CURRENT:</td><td style="text-align: right;">${currency}${paymentSectionData.current.toLocaleString()}</td></tr>
          ${paymentSectionData.discount > 0 ? `<tr><td style="padding: 0.3mm 0;">DISCOUNT:</td><td style="text-align: right; color: #000;">-${currency}${paymentSectionData.discount.toLocaleString()}</td></tr>` : ''}
          <tr><td style="padding: 0.3mm 0;">RECEIPT:</td><td style="text-align: right;">${currency}${paymentSectionData.receipt.toLocaleString()}</td></tr>
          <tr><td style="padding: 0.3mm 0;">LAST:</td><td style="text-align: right;">${currency}${paymentSectionData.last.toLocaleString()}</td></tr>
          <tr style="border-top: 1.5px solid #000; font-weight: 900; font-size: 12px;">
            <td style="padding-top: 1mm;">TOTAL:</td>
            <td style="text-align: right; padding-top: 1mm;">${currency}${paymentSectionData.total.toLocaleString()}</td>
          </tr>
        </table>

        <div style="text-align: center; font-size: 8px; font-weight: 900; margin-top: 2.5mm; border-top: 1px dashed #000; padding-top: 1.5mm;">
          ${activeTemplate.footerText || 'THANK YOU FOR YOUR BUSINESS'}
        </div>
      </div>
    `;
  }

  // A4 Layout - Densified for 20+ Items and centered Logo
  const commonStyles = `
    @page { margin: 5mm; }
    .invoice-container { padding: 5mm; width: 200mm; min-height: 287mm; box-sizing: border-box; background: white; color: #000; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; line-height: 1.1; }
    .header-centered { text-align: center; margin-bottom: 4mm; border-bottom: 3px solid #000; padding-bottom: 4mm; }
    .logo-img { height: 22mm; margin-bottom: 3mm; display: block; margin-left: auto; margin-right: auto; object-fit: contain; }
    .shop-info h1 { margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; color: #000; line-height: 1; }
    .shop-info p { margin: 1px 0; font-size: 10px; color: #333; font-weight: 600; }
    .invoice-title { font-size: 42px; font-weight: 950; color: #000; text-transform: uppercase; margin: 3mm 0; line-height: 1; letter-spacing: -2px; border: 4px solid #000; display: inline-block; padding: 1mm 10mm; }
    .meta-grid { display: flex; justify-content: space-between; margin-bottom: 4mm; background: #f1f5f9; padding: 3mm 5mm; border-radius: 3mm; border: 1px solid #000; }
    .meta-item b { display: block; font-size: 9px; color: #000; text-transform: uppercase; margin-bottom: 0.5mm; }
    .meta-item span { font-size: 13px; font-weight: 800; color: #000; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; flex: 1; }
    .items-table th { padding: 2mm; text-align: left; font-size: 9px; font-weight: 900; color: #fff; background: #000; text-transform: uppercase; border: 1px solid #000; }
    .items-table td { padding: 1.5mm 2mm; font-size: 11px; border: 1px solid #e2e8f0; font-weight: 600; }
    .summary-section { width: 100%; display: flex; justify-content: flex-end; margin-top: 3mm; }
    .summary-table { width: 100mm; border-collapse: collapse; border: 2px solid #000; }
    .summary-table td { padding: 2.5mm 4mm; font-size: 11px; border-bottom: 1px solid #000; }
    .summary-table .label { font-weight: 900; color: #000; text-transform: uppercase; font-size: 10px; width: 50%; background: #f8fafc; }
    .summary-table .value { text-align: right; font-weight: 800; color: #000; font-size: 12px; }
    .summary-table .total-row { background: #000; color: #fff; border-bottom: none; }
    .summary-table .total-row .label { background: #000; color: #fff; }
    .summary-table .total-row .value { color: #fff; font-size: 22px; font-weight: 950; }
    .footer { margin-top: 6mm; padding-top: 4mm; border-top: 2px solid #000; text-align: center; font-size: 9px; color: #000; text-transform: uppercase; font-weight: 800; }
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
          <b>REFERENCE NO</b>
          <span>#${invIdDisplay}</span>
        </div>
        <div class="meta-item">
          <b>DATE OF ISSUE</b>
          <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>
        <div class="meta-item" style="text-align: right;">
          <b>CUSTOMER IDENTITY</b>
          <span style="display: block;">${cust ? cust.name.toUpperCase() : 'WALK-IN ACCOUNT'}</span>
          ${cust ? `<span style="font-size: 11px; font-weight: 900; color: #000;">PHONE: ${cust.phone}</span>` : ''}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 55%;">Product Description</th>
            <th style="text-align: center; width: 10%;">Qty</th>
            <th style="text-align: right; width: 15%;">Unit Price</th>
            <th style="text-align: right; width: 20%;">Line Total</th>
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
            <td class="label">CURRENT</td>
            <td class="value">${currency}${paymentSectionData.current.toLocaleString()}</td>
          </tr>
          ${paymentSectionData.discount > 0 ? `
          <tr>
            <td class="label">DISCOUNT</td>
            <td class="value" style="color: #000;">-${currency}${paymentSectionData.discount.toLocaleString()}</td>
          </tr>` : ''}
          <tr>
            <td class="label">RECEIPT</td>
            <td class="value">${currency}${paymentSectionData.receipt.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="label">LAST</td>
            <td class="value">${currency}${paymentSectionData.last.toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td class="label">TOTAL</td>
            <td class="value">
              ${currency}${paymentSectionData.total.toLocaleString()}
            </td>
          </tr>
        </table>
      </div>

      <div class="footer">
        ${activeTemplate.footerText || 'THIS IS A COMPUTER GENERATED INVOICE. NO SIGNATURE REQUIRED.'}
      </div>
    </div>
  `;
};