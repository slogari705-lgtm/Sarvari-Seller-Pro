import { Invoice, AppState, Customer } from './types';

/**
 * Supported print layouts for the generation of invoice HTML.
 */
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

  /**
   * LEDGER CALCULATIONS
   */
  let lastLoan = 0; // Previous Balance
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

  // Thermal/Receipt Logic
  if (effectiveLayout === 'thermal' || effectiveLayout === 'receipt') {
    return `
      <!DOCTYPE html>
      <html dir="${direction}">
      <head>
        <style>
          @page { margin: 0; }
          body { 
            width: 72mm; 
            margin: 0; 
            padding: 1mm 1.5mm; 
            font-family: 'Courier New', Courier, monospace; 
            font-size: 10px; 
            color: #000; 
            background: #fff;
            line-height: 1.0;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
          .right { text-align: right; }
          .divider { border-top: 1px dashed #000; margin: 1.5px 0; }
          .shop-title { font-size: 13px; font-weight: 900; margin-bottom: 1px; }
          .meta-row { display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 0.5px; }
          .item-grid { display: flex; justify-content: space-between; margin-bottom: 1px; font-size: 8.5px; }
          
          .summary-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
          .summary-table td { padding: 1px 0; font-size: 9px; }
          .summary-table .label { text-align: left; text-transform: uppercase; }
          .summary-table .value { text-align: right; font-weight: 900; }
          .grand-total { border-top: 1px solid #000; padding-top: 2px; font-size: 11px; }
          
          .footer { margin-top: 6px; font-size: 7.5px; text-transform: uppercase; opacity: 0.8; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="shop-title">${shop.shopName.toUpperCase()}</div>
          <div style="font-size: 7.5px;">
            ${shop.shopAddress ? `<div>${shop.shopAddress}</div>` : ''}
            ${shop.shopPhone ? `<div>TEL: ${shop.shopPhone}</div>` : ''}
          </div>
        </div>
        
        <div class="divider"></div>
        <div class="meta-row"><span class="bold">INV: #${invIdDisplay}</span><span>${new Date(inv.date).toLocaleDateString()}</span></div>
        <div class="meta-row"><span>CLIENT:</span><span class="bold">${cust ? cust.name.toUpperCase() : 'WALK-IN'}</span></div>
        <div class="divider"></div>
        
        <div style="margin-bottom: 1px;">
          ${inv.items.map(it => `
            <div class="item-grid">
              <div style="flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${it.name.toUpperCase()}</div>
              <div style="width: 5mm;" class="center">x${it.quantity}</div>
              <div style="width: 16mm;" class="right bold">${currency}${(it.price * it.quantity).toLocaleString()}</div>
            </div>
          `).join('')}
        </div>

        <div class="divider"></div>
        
        <table class="summary-table">
          <tr class="grand-total"><td class="label bold">TOTAL</td><td class="value bold">${currency}${inv.total.toLocaleString()}</td></tr>
          <tr><td class="label">PRESENT RECEIPT</td><td class="value">${currency}${inv.paidAmount.toLocaleString()}</td></tr>
          ${cust ? `
            <tr><td class="label">LAST LOAN (OLD)</td><td class="value">${currency}${lastLoan.toLocaleString()}</td></tr>
            <tr style="border-top: 1px dotted #000;"><td class="label bold">FINAL BALANCE</td><td class="value bold">${currency}${finalBalance.toLocaleString()}</td></tr>
          ` : ''}
        </table>

        <div class="divider"></div>
        <div class="center footer">
          <div class="bold">${activeTemplate.footerText || 'THANK YOU'}</div>
        </div>
      </body>
      </html>
    `;
  }

  // A4 Layout Pagination
  const ITEMS_PER_PAGE = 30;
  const chunks: any[][] = [];
  for (let i = 0; i < inv.items.length; i += ITEMS_PER_PAGE) {
    chunks.push(inv.items.slice(i, i + ITEMS_PER_PAGE));
  }

  const logoHTML = (activeTemplate.showLogo && shop.shopLogo) 
    ? `<img src="${shop.shopLogo}" class="shop-logo" />`
    : `<div class="shop-initial" style="background: ${brandColor}">${shop.shopName.charAt(0)}</div>`;

  const commonStyles = `
    :root { --brand: ${brandColor}; }
    body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 0; color: #0f172a; background: #f1f5f9; line-height: 1.1; }
    .page { 
      padding: 6mm 10mm; 
      width: 210mm; 
      height: 297mm; 
      margin: 2mm auto; 
      box-sizing: border-box; 
      position: relative;
      background: white;
      box-shadow: 0 0 5px rgba(0,0,0,0.03);
      display: block;
    }
    
    .header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
    .shop-logo { max-height: 30px; margin-bottom: 3px; display: block; }
    .shop-initial { width: 30px; height: 30px; border-radius: 4px; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; margin-bottom: 3px; }
    .shop-name { font-size: 15px; font-weight: 900; margin: 0; color: #1e293b; text-transform: uppercase; }
    .shop-details { font-size: 7.5px; color: #64748b; margin-top: 1px; }
    
    .invoice-meta { text-align: right; }
    .doc-title { font-size: 20px; font-weight: 900; color: var(--brand); margin: 0; text-transform: uppercase; line-height: 1; }
    .inv-number { font-size: 11px; font-weight: 800; color: #1e293b; margin-top: 2px; font-family: monospace; }
    
    .client-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding: 4px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; }
    .info-label { font-size: 7px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-right: 5px; }
    .info-value { font-weight: 800; font-size: 10px; color: #1e293b; text-transform: uppercase; }
    
    table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    table.items-table thead th { background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; padding: 4px 6px; font-size: 7px; text-transform: uppercase; font-weight: 800; text-align: left; }
    table.items-table .item-row td { padding: 4px 6px; border-bottom: 1px solid #f8fafc; font-size: 9px; vertical-align: top; }
    .item-name { font-weight: 700; color: #0f172a; text-transform: uppercase; }
    
    .summary-box { width: 80mm; margin-left: auto; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; margin-top: 4px; }
    .summary-box table { width: 100%; border-collapse: collapse; }
    .summary-box td { padding: 3.5px 8px; font-size: 9.5px; font-weight: 600; color: #475569; border-bottom: 1px solid #f1f5f9; }
    .summary-box .highlight-row { background: #f8fafc; font-weight: 800; color: #1e293b; }
    .summary-box .total-row { background: var(--brand); color: white; font-weight: 900; font-size: 11px; }
    .summary-box .total-row td { color: white; border-bottom: none; }
    
    .legal-note { font-size: 7px; color: #94a3b8; margin-top: 10px; text-align: center; font-weight: 600; text-transform: uppercase; }
    .right { text-align: right; }
    .center { text-align: center; }
    
    @media print { 
      body { background: none; }
      .page { box-shadow: none; margin: 0; width: 100%; height: auto; min-height: 297mm; page-break-after: always; }
      .page:last-child { page-break-after: auto; }
    }
  `;

  let htmlContent = `
    <!DOCTYPE html>
    <html dir="${direction}">
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>${commonStyles}</style>
    </head>
    <body>
  `;

  chunks.forEach((chunk, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    const isLastPage = pageIdx === chunks.length - 1;

    htmlContent += `
      <div class="page">
        <div class="header-section">
          <div class="shop-branding">
            ${isFirstPage ? logoHTML : ''}
            <h2 class="shop-name">${shop.shopName}</h2>
            <div class="shop-details">
              ${shop.shopAddress ? `<span>${shop.shopAddress}</span>` : ''}
              ${shop.shopPhone ? `<span style="margin-left: 10px;">TEL: ${shop.shopPhone}</span>` : ''}
            </div>
          </div>
          <div class="invoice-meta">
            <h1 class="doc-title">Invoice</h1>
            <div class="inv-number">#${invIdDisplay}</div>
            <div style="font-size: 8px; font-weight: 800; color: #1e293b;">${new Date(inv.date).toLocaleDateString()}</div>
          </div>
        </div>

        ${isFirstPage ? `
          <div class="client-bar">
            <div><span class="info-label">CLIENT:</span><span class="info-value">${cust ? cust.name : 'WALK-IN CUSTOMER'}</span></div>
            <div><span class="info-label">STATUS:</span><span class="info-value" style="color: ${inv.status === 'paid' ? '#10b981' : '#e11d48'}">${inv.status}</span></div>
          </div>
        ` : ''}

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 6mm" class="center">#</th>
              <th>Description</th>
              <th class="center" style="width: 10mm">Qty</th>
              <th class="right" style="width: 25mm">Rate</th>
              <th class="right" style="width: 25mm">Total</th>
            </tr>
          </thead>
          <tbody>
            ${chunk.map((it, i) => `
              <tr class="item-row">
                <td class="center" style="color: #94a3b8;">${(pageIdx * ITEMS_PER_PAGE) + i + 1}</td>
                <td><div class="item-name">${it.name}</div></td>
                <td class="center font-bold">${it.quantity}</td>
                <td class="right">${currency}${it.price.toLocaleString()}</td>
                <td class="right font-bold">${currency}${(it.price * it.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${isLastPage ? `
          <div class="summary-box">
            <table>
              <tr class="highlight-row">
                <td>INVOICE TOTAL</td>
                <td class="right">${currency}${inv.total.toLocaleString()}</td>
              </tr>
              <tr>
                <td>PRESENT RECEIPT (CASH)</td>
                <td class="right">${currency}${inv.paidAmount.toLocaleString()}</td>
              </tr>
              ${cust ? `
                <tr>
                  <td>LAST LOAN (OLD BALANCE)</td>
                  <td class="right">${currency}${lastLoan.toLocaleString()}</td>
                </tr>
                <tr class="total-row">
                  <td>FINAL ACCOUNT BALANCE</td>
                  <td class="right">${currency}${finalBalance.toLocaleString()}</td>
                </tr>
              ` : `
                <tr class="total-row">
                  <td>SETTLEMENT FINALITY</td>
                  <td class="right">${currency}${inv.total.toLocaleString()}</td>
                </tr>
              `}
            </table>
          </div>
          
          <div class="legal-note">
            ${activeTemplate.footerText || 'OFFICIAL VALID TAX DOCUMENT GENERATED BY SARVARI TERMINAL'}
          </div>
        ` : `<div style="text-align: right; font-size: 7px; color: #94a3b8; padding-top: 4px; font-weight: 700; text-transform: uppercase;">Continued on next page...</div>`}
      </div>
    `;
  });

  htmlContent += `</body></html>`;
  return htmlContent;
};