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

  const paymentData = {
    term: inv.paymentTerm || 'Immediate',
    method: inv.paymentMethod.toUpperCase(),
    currency: `${currency} ${secondaryCurrency ? `(${secondaryCurrency})` : ''}`,
    current: inv.total + (inv.discount || 0),
    discount: inv.discount || 0,
    receipt: inv.paidAmount,
    last: lastLoan,
    total: finalBalance
  };

  // 1. MOBILE THERMAL LAYOUT (Highly Compact 72mm)
  if (layoutType === 'thermal' || (layoutType === 'auto' && activeTemplate.layout === 'thermal')) {
    return `
      <div dir="${direction}" style="width: 72mm; margin: 0; padding: 0; font-family: 'Inter', 'Courier New', monospace; font-size: 10px; color: #000; background: #fff; line-height: 1.1;">
        <style>
          @media print { body { background: #fff; } }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          .comp-table { width: 100%; border-collapse: collapse; margin-top: 1mm; }
          .comp-table td { padding: 0.8mm 0; border-bottom: 0.1mm solid #eee; }
          .comp-label { color: #666; font-size: 8.5px; font-weight: 700; text-transform: uppercase; }
          .comp-val { text-align: right; font-weight: 900; }
        </style>
        
        <div style="text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 1.5mm; margin-bottom: 2.5mm;">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="height: 10mm; margin-bottom: 1mm; object-fit: contain;" />` : ''}
          <div style="font-size: 13px; font-weight: 900; letter-spacing: -0.5px;">${shop.shopName.toUpperCase()}</div>
          <div style="font-size: 7.5px; font-weight: 600;">${shop.shopAddress || ''}</div>
          <div style="font-size: 15px; font-weight: 900; border: 1px solid #000; padding: 0.5mm 3mm; display: inline-block; margin-top: 1.5mm;">RECEIPT</div>
        </div>

        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 9px; margin-bottom: 1mm;">
          <span>#${invIdDisplay}</span>
          <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>

        <div style="margin-bottom: 2mm; border-bottom: 1px solid #000; padding-bottom: 1mm;">
          <div style="font-size: 9.5px; font-weight: 900;">${cust ? cust.name.toUpperCase() : 'CASH CUSTOMER'}</div>
          ${cust ? `<div style="font-size: 7.5px; font-weight: 600;">${cust.phone}</div>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2mm;">
          <thead style="border-bottom: 1px solid #000;">
            <tr style="font-size: 8.5px; font-weight: 900;">
              <th style="text-align: left; padding-bottom: 0.5mm;">ITEM</th>
              <th style="text-align: center; width: 15%;">QTY</th>
              <th style="text-align: right; width: 25%;">SUM</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(it => `
              <tr style="border-bottom: 0.1mm solid #eee;">
                <td style="padding: 1.2mm 0; font-weight: 700; font-size: 9px;">${it.name.toUpperCase()}</td>
                <td style="text-align: center; font-weight: 900;">${it.quantity}</td>
                <td style="text-align: right; font-weight: 900;">${(it.price * it.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="border-top: 1.5px solid #000; padding-top: 1mm;">
          <table class="comp-table">
            <tr><td class="comp-label">Term / Type</td><td class="comp-val" style="font-size: 8.5px;">${paymentData.term} / ${paymentData.method}</td></tr>
            <tr><td class="comp-label">Currency</td><td class="comp-val" style="font-size: 8.5px;">${paymentData.currency}</td></tr>
            <tr><td class="comp-label">Current Total</td><td class="comp-val">${currency}${paymentData.current.toLocaleString()}</td></tr>
            ${paymentData.discount > 0 ? `<tr><td class="comp-label">Discount</td><td class="comp-val" style="color:#d00;">-${currency}${paymentData.discount.toLocaleString()}</td></tr>` : ''}
            <tr><td class="comp-label">Paid / Receipt</td><td class="comp-val">${currency}${paymentData.receipt.toLocaleString()}</td></tr>
            <tr><td class="comp-label">Prev. Balance</td><td class="comp-val">${currency}${paymentData.last.toLocaleString()}</td></tr>
            <tr style="border-top: 1.5px solid #000; font-size: 12px;">
              <td style="padding-top: 1.5mm; font-weight: 950;">FINAL DUE</td>
              <td style="padding-top: 1.5mm; text-align: right; font-weight: 950;">${currency}${paymentData.total.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 4mm; font-weight: 900; font-size: 7.5px; border-top: 0.5px dashed #000; padding-top: 2mm;">
          ${activeTemplate.footerText || 'THANK YOU'}
        </div>
        <div style="height: 10mm;"></div>
      </div>
    `;
  }

  // 2. COMPUTER A4 LAYOUT (Professional High-Density 210mm)
  const a4Styles = `
    .a4-container {
      width: 210mm; min-height: 297mm; padding: 15mm;
      background: #fff !important; color: #000 !important;
      font-family: 'Inter', sans-serif; box-sizing: border-box;
      display: flex; flex-direction: column;
    }
    .a4-container * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
    .header-top { display: flex; justify-content: space-between; margin-bottom: 8mm; }
    .company-info h1 { font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -1px; }
    .company-info p { font-size: 10px; margin: 1px 0; color: #555; font-weight: 600; }
    .invoice-header { text-align: right; }
    .invoice-label { font-size: 42px; font-weight: 900; margin: 0 0 2mm 0; letter-spacing: -2px; }
    .meta-line { font-size: 12px; font-weight: 700; margin-bottom: 1mm; }
    .meta-line b { color: #888; font-size: 9px; text-transform: uppercase; display: inline-block; width: 90px; }

    .bill-section { margin-bottom: 6mm; border-top: 3px solid #000; padding-top: 4mm; }
    .client-name { font-size: 20px; font-weight: 950; text-transform: uppercase; }
    .client-data { font-size: 12px; color: #444; font-weight: 600; }

    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; flex: 1; }
    .items-table th { 
      background: #000 !important; color: #fff !important; text-align: left; 
      padding: 3mm 4mm; font-size: 10px; font-weight: 900; text-transform: uppercase;
      border: 1px solid #000;
    }
    .items-table td { 
      padding: 2.5mm 4mm; font-size: 12px; font-weight: 700; 
      border-bottom: 1px solid #eee; border-left: 1px solid #eee; border-right: 1px solid #eee;
    }

    .summary-grid { width: 100%; display: flex; justify-content: flex-end; margin-top: 4mm; }
    .compact-ledger { width: 120mm; border: 3px solid #000; border-collapse: collapse; }
    .ledger-row td { padding: 2.5mm 5mm; border-bottom: 1px solid #eee; }
    .ledger-label { font-weight: 900; color: #777; text-transform: uppercase; font-size: 9px; width: 60%; }
    .ledger-val { font-weight: 900; text-align: right; font-size: 13px; color: #000; }
    .ledger-grand { background: #000 !important; color: #fff !important; }
    .ledger-grand .ledger-label { color: #fff; font-size: 14px; }
    .ledger-grand .ledger-val { color: #fff; font-size: 28px; font-weight: 950; }
  `;

  return `
    <div dir="${direction}" class="a4-container">
      <style>${a4Styles}</style>
      
      <div class="header-top">
        <div class="company-info">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="height: 18mm; margin-bottom: 3mm; object-fit: contain;" />` : ''}
          <h1>${shop.shopName}</h1>
          <p>${shop.shopAddress || ''}</p>
          <p>TEL: ${shop.shopPhone || ''} | EMAIL: ${shop.shopEmail || ''}</p>
        </div>
        <div class="invoice-header">
          <h2 class="invoice-label">INVOICE</h2>
          <div class="meta-line"><b>Ref ID</b> #${invIdDisplay}</div>
          <div class="meta-line"><b>Issue Date</b> ${new Date(inv.date).toLocaleDateString()}</div>
        </div>
      </div>

      <div class="bill-section">
        <div style="font-size: 9px; font-weight: 900; color: #888; text-transform: uppercase; margin-bottom: 1mm;">Bill To:</div>
        <div class="client-name">${cust ? cust.name : 'WALK-IN ACCOUNT'}</div>
        <div class="client-data">${cust ? `${cust.phone} | ${cust.address || ''}` : 'N/A'}</div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 60%;">Description</th>
            <th style="text-align: center; width: 10%;">Qty</th>
            <th style="text-align: right; width: 15%;">Rate</th>
            <th style="text-align: right; width: 15%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map((it, i) => `
            <tr style="${i % 2 === 0 ? '' : 'background:#f9f9f9;'}">
              <td style="font-weight: 800;">${it.name.toUpperCase()}</td>
              <td style="text-align: center;">${it.quantity}</td>
              <td style="text-align: right;">${currency}${it.price.toLocaleString()}</td>
              <td style="text-align: right; font-weight: 900;">${currency}${(it.price * it.quantity).toLocaleString()}</td>
            </tr>
          `).join('')}
          ${Array(Math.max(0, 15 - inv.items.length)).fill(0).map(() => `<tr style="height: 6mm;"><td></td><td></td><td></td><td></td></tr>`).join('')}
        </tbody>
      </table>

      <div class="summary-grid">
        <table class="compact-ledger">
          <tr class="ledger-row"><td class="ledger-label">Payment Term & Method</td><td class="ledger-val" style="font-size: 11px;">${paymentData.term} / ${paymentData.method}</td></tr>
          <tr class="ledger-row"><td class="ledger-label">System Currency</td><td class="ledger-val" style="font-size: 11px;">${paymentData.currency}</td></tr>
          <tr class="ledger-row"><td class="ledger-label">Current Invoice Value</td><td class="ledger-val">${currency}${paymentData.current.toLocaleString()}</td></tr>
          ${paymentData.discount > 0 ? `<tr class="ledger-row"><td class="ledger-label">Discount Applied</td><td class="ledger-val" style="color:#d00;">-${currency}${paymentData.discount.toLocaleString()}</td></tr>` : ''}
          <tr class="ledger-row"><td class="ledger-label">Receipt Amount (Paid)</td><td class="ledger-val" style="text-decoration: underline;">${currency}${paymentData.receipt.toLocaleString()}</td></tr>
          <tr class="ledger-row"><td class="ledger-label">Previous Loan Balance</td><td class="ledger-val">${currency}${paymentData.last.toLocaleString()}</td></tr>
          <tr class="ledger-row ledger-grand">
            <td class="ledger-label">AGGREGATE TOTAL BALANCE</td>
            <td class="ledger-val">${currency}${paymentData.total.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 10mm; text-align: center;">
        <p style="font-size: 10px; color: #999; font-weight: 600; margin: 0; text-transform: uppercase;">${activeTemplate.footerText || 'THANK YOU FOR YOUR PATRONAGE'}</p>
        <p style="margin-top: 2mm; font-size: 7px; opacity: 0.4;">GENERATE VIA SARVARI SELLER PRO POS SYSTEM</p>
      </div>
    </div>
  `;
};