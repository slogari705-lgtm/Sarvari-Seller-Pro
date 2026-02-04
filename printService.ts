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
      <div dir="${direction}" style="width: 72mm; margin: 0 auto; padding: 0.5mm; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #000; background: #fff; line-height: 1.1;">
        <div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 1mm; margin-bottom: 1mm;">
          <div style="font-size: 14px; font-weight: 900;">${shop.shopName.toUpperCase()}</div>
          <div style="font-size: 8px;">${shop.shopAddress || ''}</div>
          <div style="font-size: 8px;">${shop.shopPhone ? `TEL: ${shop.shopPhone}` : ''}</div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 0.5mm;">
          <span>INV: #${invIdDisplay}</span>
          <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>
        <div style="margin-bottom: 1mm;">CLIENT: ${cust ? cust.name.toUpperCase() : 'WALK-IN'}</div>
        
        <table style="width: 100%; font-size: 9px; border-collapse: collapse; border-bottom: 1px dashed #000;">
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
                <td style="padding: 0.5mm 0;">${it.name.toUpperCase().substring(0, 18)}</td>
                <td style="text-align: center;">${it.quantity}</td>
                <td style="text-align: right;">${(it.price * it.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 1mm;">
          <tr><td style="padding: 0.2mm 0;">TERM:</td><td style="text-align: right; font-weight: 900;">${paymentSectionData.term.toUpperCase()}</td></tr>
          <tr><td style="padding: 0.2mm 0;">TYPE:</td><td style="text-align: right;">${paymentSectionData.transType} [${paymentSectionData.currency}]</td></tr>
          <tr style="border-top: 1px solid #eee;"><td>INV TOTAL:</td><td style="text-align: right;">${currency}${paymentSectionData.invTotal.toLocaleString()}</td></tr>
          ${paymentSectionData.discount > 0 ? `<tr><td>DISCOUNT:</td><td style="text-align: right;">-${currency}${paymentSectionData.discount.toLocaleString()}</td></tr>` : ''}
          <tr><td>RECEIPT:</td><td style="text-align: right; font-weight: 900;">${currency}${paymentSectionData.receipt.toLocaleString()}</td></tr>
          <tr><td>LAST LOAN:</td><td style="text-align: right;">${currency}${paymentSectionData.lastLoan.toLocaleString()}</td></tr>
          <tr style="border-top: 1px solid #000; font-weight: 900; font-size: 11px;">
            <td style="padding-top: 1mm;">BALANCE:</td>
            <td style="text-align: right; padding-top: 1mm;">${currency}${paymentSectionData.finalBalance.toLocaleString()}</td>
          </tr>
          ${exRate !== 1 ? `
            <tr style="font-size: 8px; opacity: 0.8;">
              <td>${secondaryCurrency} RATE: ${exRate}</td>
              <td style="text-align: right;">${secondaryCurrency}${(paymentSectionData.finalBalance * exRate).toLocaleString()}</td>
            </tr>
          ` : ''}
        </table>

        <div style="text-align: center; font-size: 8px; font-weight: 900; margin-top: 2mm; border-top: 1px dashed #000; padding-top: 1mm;">
          ${activeTemplate.footerText || 'THANK YOU'}
        </div>
      </div>
    `;
  }

  // A4 Layout - Densified
  const commonStyles = `
    .invoice-container { padding: 10mm; width: 210mm; min-height: 297mm; box-sizing: border-box; background: white; color: #1e293b; font-family: 'Inter', sans-serif; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid ${brandColor}; padding-bottom: 5mm; margin-bottom: 5mm; }
    .shop-info h1 { margin: 0; font-size: 22px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
    .shop-info p { margin: 1px 0; font-size: 10px; color: #64748b; font-weight: 600; }
    .doc-meta { text-align: right; }
    .doc-meta h2 { margin: 0; font-size: 32px; font-weight: 900; color: ${brandColor}; text-transform: uppercase; line-height: 1; }
    .doc-meta p { margin: 2px 0; font-size: 12px; font-weight: 800; font-family: monospace; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; }
    .items-table th { padding: 3mm; text-align: left; font-size: 9px; font-weight: 900; color: #64748b; border-bottom: 1.5px solid #e2e8f0; text-transform: uppercase; }
    .items-table td { padding: 3mm; font-size: 11px; border-bottom: 0.5px solid #f1f5f9; }
    .summary-section { width: 100%; display: flex; justify-content: flex-end; }
    .summary-table { width: 100mm; border-collapse: collapse; border: 1px solid #e2e8f0; }
    .summary-table td { padding: 2.5mm 4mm; font-size: 11px; border-bottom: 0.5px solid #f1f5f9; }
    .summary-table .label { font-weight: 900; color: #64748b; text-transform: uppercase; font-size: 9px; }
    .summary-table .value { text-align: right; font-weight: 700; color: #0f172a; }
    .summary-table .total-row { background: #f8fafc; border-top: 1.5px solid #0f172a; }
    .summary-table .balance-row { background: #0f172a; color: white; border-top: 1px solid #0f172a; }
    .summary-table .balance-row .label { color: #94a3b8; }
    .summary-table .balance-row .value { color: white; font-size: 18px; font-weight: 900; }
    .footer { margin-top: 10mm; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 5mm; font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
  `;

  return `
    <div dir="${direction}" class="invoice-container">
      <style>${commonStyles}</style>
      <div class="header">
        <div class="shop-info">
          <h1>${shop.shopName}</h1>
          <p>${shop.shopAddress || ''}</p>
          <p>TEL: ${shop.shopPhone || ''} | EMAIL: ${shop.shopEmail || ''}</p>
          <p style="margin-top: 2mm; font-weight: 900; color: #0f172a;">BILL TO: ${cust ? cust.name.toUpperCase() : 'CASH SALE'}</p>
        </div>
        <div class="doc-meta">
          <h2>INVOICE</h2>
          <p>#${invIdDisplay}</p>
          <p>${new Date(inv.date).toLocaleDateString()} ${new Date(inv.date).toLocaleTimeString()}</p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50%;">Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Total</th>
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
        </tbody>
      </table>

      <div class="summary-section">
        <table class="summary-table">
          <tr>
            <td class="label">Payment Term / Method</td>
            <td class="value">${paymentSectionData.term.toUpperCase()} / ${paymentSectionData.transType}</td>
          </tr>
          <tr>
            <td class="label">Currency Configuration</td>
            <td class="value">${paymentSectionData.currency} ${exRate !== 1 ? `(Rate: 1 : ${exRate})` : ''}</td>
          </tr>
          <tr>
            <td class="label">Invoice Subtotal</td>
            <td class="value">${currency}${paymentSectionData.invTotal.toLocaleString()}</td>
          </tr>
          ${paymentSectionData.discount > 0 ? `
          <tr>
            <td class="label">Deducted Discount</td>
            <td class="value" style="color: #e11d48;">-${currency}${paymentSectionData.discount.toLocaleString()}</td>
          </tr>` : ''}
          <tr>
            <td class="label">Amount Received (Receipt)</td>
            <td class="value" style="color: #059669;">${currency}${paymentSectionData.receipt.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="label">Last Ledger Loan (Debt)</td>
            <td class="value">${currency}${paymentSectionData.lastLoan.toLocaleString()}</td>
          </tr>
          <tr class="balance-row">
            <td class="label">Final Outstanding Balance</td>
            <td class="value">
              ${currency}${paymentSectionData.finalBalance.toLocaleString()}
              ${exRate !== 1 ? `<div style="font-size: 10px; opacity: 0.7; font-weight: 400;">≈ ${secondaryCurrency}${(paymentSectionData.finalBalance * exRate).toLocaleString()}</div>` : ''}
            </td>
          </tr>
        </table>
      </div>

      <div class="footer">
        ${activeTemplate.footerText || 'Authorized Document - No physical signature required'}
      </div>
    </div>
  `;
};