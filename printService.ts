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
  const invIdDisplay = `${shop.invoicePrefix || ''}${inv.id.padStart(4, '0')}`;

  let lastLoan = 0;
  let finalBalance = 0;

  if (cust) {
    const invTime = new Date(inv.date).getTime();
    // Calculate historical balance before this specific invoice
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

  // Pre-calculated fields for the requested payment section
  const paymentSectionData = {
    term: inv.paymentTerm || (inv.status === 'paid' ? 'Immediate' : 'Credit'),
    transType: inv.paymentMethod.toUpperCase(),
    currency: shop.currency,
    invTotal: inv.subtotal + (inv.tax || 0),
    discount: inv.discount || 0,
    receipt: inv.paidAmount,
    lastLoan: lastLoan,
    combinedTotal: (inv.subtotal + (inv.tax || 0)) + lastLoan, // invoice total + last loan
    finalBalance: finalBalance
  };

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
          <table style="width: 100%; font-size: 9px; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th style="text-align: left;">ITEM</th>
                <th style="text-align: center;">QTY</th>
                <th style="text-align: right;">SUM</th>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map(it => `
                <tr>
                  <td style="padding: 1px 0;">${it.name.toUpperCase()}</td>
                  <td style="text-align: center;">${it.quantity}</td>
                  <td style="text-align: right;">${(it.price * it.quantity).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="border-top: 1px dashed #000; margin: 3px 0;"></div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <tr><td>Payment Term:</td><td style="text-align: right; font-weight: 700;">${paymentSectionData.term}</td></tr>
          <tr><td>Trans Type:</td><td style="text-align: right;">${paymentSectionData.transType}</td></tr>
          <tr><td>Currency:</td><td style="text-align: right;">${paymentSectionData.currency}</td></tr>
          <tr style="border-top: 1px solid #eee;"><td>Invoice Total:</td><td style="text-align: right;">${currency}${paymentSectionData.invTotal.toLocaleString()}</td></tr>
          <tr><td>Discount:</td><td style="text-align: right;">-${currency}${paymentSectionData.discount.toLocaleString()}</td></tr>
          <tr><td>Receipt:</td><td style="text-align: right; font-weight: 700;">${currency}${paymentSectionData.receipt.toLocaleString()}</td></tr>
          <tr><td>Last Loan:</td><td style="text-align: right;">${currency}${paymentSectionData.lastLoan.toLocaleString()}</td></tr>
          <tr style="border-top: 1px double #000; font-weight: 900; font-size: 12px;"><td>TOTAL:</td><td style="text-align: right;">${currency}${paymentSectionData.combinedTotal.toLocaleString()}</td></tr>
          <tr style="border-top: 1px solid #000; font-weight: 900; font-size: 13px;"><td>BALANCE:</td><td style="text-align: right;">${currency}${paymentSectionData.finalBalance.toLocaleString()}</td></tr>
          ${exRate !== 1 ? `
            <tr style="font-size: 8px; opacity: 0.8;">
              <td>Ex Rate: 1 ${currency} = ${exRate} ${secondaryCurrency}</td>
              <td style="text-align: right;">Bal: ${secondaryCurrency}${(paymentSectionData.finalBalance * exRate).toLocaleString()}</td>
            </tr>
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
    .invoice-container { padding: 15mm; width: 210mm; min-height: 297mm; box-sizing: border-box; background: white; color: #1e293b; font-family: 'Inter', sans-serif; position: relative; }
    .brand-accent { height: 4px; width: 100%; background: ${brandColor}; margin-bottom: 10mm; }
    .header { display: flex; justify-content: space-between; margin-bottom: 15mm; }
    .shop-info h1 { margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
    .shop-info p { margin: 2px 0; font-size: 11px; color: #64748b; font-weight: 600; }
    .doc-meta { text-align: right; }
    .doc-meta h2 { margin: 0; font-size: 42px; font-weight: 900; color: ${brandColor}; text-transform: uppercase; line-height: 1; }
    .doc-meta p { margin: 5px 0; font-size: 14px; font-weight: 800; font-family: monospace; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15mm; }
    .items-table th { padding: 5mm; text-align: left; font-size: 10px; font-weight: 900; color: #64748b; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; }
    .items-table td { padding: 5mm; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    .payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; background: #f8fafc; padding: 10mm; border-radius: 12px; margin-top: 10mm; border: 1px solid #e2e8f0; }
    .payment-item { display: flex; justify-content: space-between; padding: 2mm 0; border-bottom: 1px solid #e2e8f0; }
    .payment-item:last-child { border: none; }
    .label { font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; }
    .value { font-size: 14px; font-weight: 800; color: #0f172a; }
    .balance-box { grid-column: span 2; background: #0f172a; color: white; padding: 6mm; border-radius: 8px; margin-top: 4mm; display: flex; justify-content: space-between; align-items: center; }
  `;

  return `
    <div dir="${direction}" class="invoice-container">
      <style>${commonStyles}</style>
      <div class="brand-accent"></div>
      <div class="header">
        <div class="shop-info">
          <h1>${shop.shopName}</h1>
          <p>${shop.shopAddress || ''}</p>
          <p>TEL: ${shop.shopPhone || ''} | EMAIL: ${shop.shopEmail || ''}</p>
        </div>
        <div class="doc-meta">
          <h2>INVOICE</h2>
          <p>#${invIdDisplay}</p>
          <p>${new Date(inv.date).toLocaleDateString()} ${new Date(inv.date).toLocaleTimeString()}</p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr><th>Description</th><th style="text-align: center;">Qty</th><th style="text-align: right;">Rate</th><th style="text-align: right;">Total</th></tr>
        </thead>
        <tbody>
          ${inv.items.map(it => `
            <tr>
              <td style="font-weight: 800;">${it.name.toUpperCase()}</td>
              <td style="text-align: center;">${it.quantity}</td>
              <td style="text-align: right;">${currency}${it.price.toLocaleString()}</td>
              <td style="text-align: right; font-weight: 900;">${currency}${(it.price * it.quantity).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="payment-grid">
        <div>
          <div class="payment-item"><span class="label">Payment Term</span><span class="value">${paymentSectionData.term}</span></div>
          <div class="payment-item"><span class="label">Transaction Type</span><span class="value">${paymentSectionData.transType}</span></div>
          <div class="payment-item"><span class="label">Currency</span><span class="value">${paymentSectionData.currency}</span></div>
          <div class="payment-item"><span class="label">Exchange Rate</span><span class="value">1 : ${exRate}</span></div>
        </div>
        <div>
          <div class="payment-item"><span class="label">Invoice Total</span><span class="value">${currency}${paymentSectionData.invTotal.toLocaleString()}</span></div>
          <div class="payment-item"><span class="label">Discount</span><span class="value" style="color: #e11d48;">-${currency}${paymentSectionData.discount.toLocaleString()}</span></div>
          <div class="payment-item"><span class="label">Receipt (Paid)</span><span class="value">${currency}${paymentSectionData.receipt.toLocaleString()}</span></div>
          <div class="payment-item"><span class="label">Last Loan (Debt)</span><span class="value">${currency}${paymentSectionData.lastLoan.toLocaleString()}</span></div>
        </div>
        <div class="balance-box">
          <div>
            <div class="label" style="color: #94a3b8; margin-bottom: 1mm;">Total Outstanding Liability</div>
            <div style="font-size: 32px; font-weight: 900; letter-spacing: -1px;">${currency}${paymentSectionData.finalBalance.toLocaleString()}</div>
          </div>
          <div style="text-align: right;">
            <div class="label" style="color: #94a3b8; margin-bottom: 1mm;">Converted (${secondaryCurrency})</div>
            <div style="font-size: 24px; font-weight: 800; opacity: 0.9;">${secondaryCurrency}${(paymentSectionData.finalBalance * exRate).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style="margin-top: 15mm; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10mm; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800;">
        ${activeTemplate.footerText || 'This is a computer-generated document. No signature required.'}
      </div>
    </div>
  `;
};