
import { Invoice, AppState, Customer } from './types';

export type PrintLayout = 'thermal' | 'a4' | 'auto';

export const generatePrintHTML = (state: AppState, inv: Invoice, layoutType: PrintLayout): string => {
  const cust = state.customers.find(c => c.id === inv.customerId);
  const shop = state.settings;
  const isRTL = shop.language === 'ps' || shop.language === 'dr';
  const direction = isRTL ? 'rtl' : 'ltr';
  
  const currency = shop.currency;
  const invIdDisplay = `${shop.invoicePrefix || ''}${inv.id.padStart(4, '0')}`;

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

  const isPaid = inv.status === 'paid';

  // 1. THERMAL LAYOUT (72mm Optimized)
  if (layoutType === 'thermal') {
    return `
      <div dir="${direction}" style="width: 72mm; margin: 0; padding: 0; font-family: 'Inter', sans-serif; font-size: 11px; color: #000; background: #fff; line-height: 1.2;">
        <style>
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          .thermal-table { width: 100%; border-collapse: collapse; margin: 2mm 0; }
          .thermal-table th { border-bottom: 1px dashed #000; padding: 1mm 0; text-align: left; font-size: 9px; }
          .thermal-table td { padding: 1.5mm 0; vertical-align: top; }
          .summary-row { display: flex; justify-content: space-between; padding: 0.5mm 0; }
          .summary-label { font-weight: 700; color: #333; }
          .summary-val { font-weight: 900; }
        </style>
        
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 3mm; margin-bottom: 3mm;">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="max-height: 12mm; margin-bottom: 2mm; filter: grayscale(1);" />` : ''}
          <div style="font-size: 14px; font-weight: 900; letter-spacing: -0.5px;">${shop.shopName.toUpperCase()}</div>
          <div style="font-size: 8px; font-weight: 600; margin-top: 1mm;">${shop.shopAddress || ''}</div>
          <div style="font-size: 8px; font-weight: 600;">TEL: ${shop.shopPhone || ''}</div>
        </div>

        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 10px; margin-bottom: 2mm;">
          <span>NO: ${invIdDisplay}</span>
          <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>

        <div style="border: 1px solid #000; padding: 2mm; margin-bottom: 3mm;">
          <div style="font-size: 11px; font-weight: 900;">${cust ? cust.name.toUpperCase() : 'CASH CUSTOMER'}</div>
          ${cust ? `<div style="font-size: 9px; font-weight: 600; margin-top: 0.5mm;">PH: ${cust.phone}</div>` : ''}
        </div>

        <table class="thermal-table">
          <thead>
            <tr>
              <th style="width: 50%;">ITEM</th>
              <th style="text-align: center; width: 15%;">QTY</th>
              <th style="text-align: right; width: 35%;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(it => `
              <tr>
                <td style="font-weight: 700;">${it.name.toUpperCase()}</td>
                <td style="text-align: center; font-weight: 900;">${it.quantity}</td>
                <td style="text-align: right; font-weight: 900;">${(it.price * it.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="border-top: 1px solid #000; padding-top: 2mm; margin-top: 1mm;">
          <div class="summary-row"><span class="summary-label">SUBTOTAL</span><span class="summary-val">${currency}${inv.total.toLocaleString()}</span></div>
          ${inv.discount > 0 ? `<div class="summary-row"><span class="summary-label">DISCOUNT</span><span class="summary-val">-${currency}${inv.discount.toLocaleString()}</span></div>` : ''}
          <div class="summary-row" style="background: #000; color: #fff; padding: 1mm 1mm; margin: 1mm 0;"><span class="summary-label" style="color:#fff;">RECEIPT</span><span class="summary-val">${currency}${inv.paidAmount.toLocaleString()}</span></div>
          <div class="summary-row"><span class="summary-label">PREV. BAL</span><span class="summary-val">${currency}${lastLoan.toLocaleString()}</span></div>
          <div class="summary-row" style="font-size: 13px; border-top: 1px dashed #000; padding-top: 1.5mm; margin-top: 1mm;">
             <span class="summary-label">TOTAL DUE</span>
             <span class="summary-val">${currency}${finalBalance.toLocaleString()}</span>
          </div>
        </div>

        ${isPaid ? `
          <div style="margin: 5mm 0; text-align: center;">
            <div style="display: inline-block; border: 3px double #000; padding: 2mm 8mm; font-size: 14px; font-weight: 950; color: #000; transform: rotate(-5deg);">PAID IN FULL</div>
          </div>
        ` : ''}

        <div style="text-align: center; margin-top: 6mm; font-weight: 800; font-size: 9px; border-top: 1px solid #000; padding-top: 3mm;">
          ${shop.invoiceFooterNote || 'THANK YOU FOR YOUR VISIT'}
          <div style="font-size: 7px; opacity: 0.5; margin-top: 2mm;">SARVARI SELLER PRO SYSTEMS</div>
        </div>
      </div>
    `;
  }

  // 2. A4 LAYOUT (Professional Ledger)
  return `
    <div dir="${direction}" style="width: 210mm; height: 297mm; padding: 15mm; background: #fff; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box; display: flex; flex-direction: column;">
      <style>
        * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
        .a4-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12mm; border-bottom: 5px solid ${shop.brandColor}; padding-bottom: 8mm; }
        .company-meta h1 { font-size: 28px; font-weight: 950; margin: 0; color: ${shop.brandColor}; letter-spacing: -1px; }
        .company-meta p { font-size: 11px; margin: 2px 0; color: #555; font-weight: 600; }
        .invoice-meta { text-align: right; }
        .inv-label { font-size: 42px; font-weight: 950; margin: 0; opacity: 0.1; position: absolute; right: 15mm; top: 15mm; }
        .meta-grid { display: grid; grid-template-columns: auto auto; gap: 2mm 6mm; margin-top: 4mm; }
        .meta-grid b { font-size: 9px; text-transform: uppercase; color: #888; }
        .meta-grid span { font-size: 12px; font-weight: 800; }

        .client-section { display: flex; justify-content: space-between; margin-bottom: 10mm; background: #f8fafc; padding: 6mm; border-radius: 4mm; border: 1px solid #e2e8f0; }
        .client-info h3 { font-size: 9px; font-weight: 900; color: #888; text-transform: uppercase; margin-bottom: 2mm; }
        .client-info .name { font-size: 18px; font-weight: 900; margin-bottom: 1mm; }
        .client-info .details { font-size: 11px; color: #444; font-weight: 600; }

        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10mm; }
        .items-table th { background: #1e293b !important; color: #fff !important; padding: 4mm; text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; border: 1px solid #1e293b; }
        .items-table td { padding: 4mm; font-size: 12px; font-weight: 700; border-bottom: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
        
        .totals-section { display: flex; justify-content: flex-end; margin-top: auto; }
        .ledger-box { width: 100mm; border: 2px solid #1e293b; border-radius: 2mm; overflow: hidden; }
        .ledger-row { display: flex; justify-content: space-between; padding: 3mm 5mm; border-bottom: 1px solid #e2e8f0; }
        .ledger-row:last-child { border-bottom: none; background: #1e293b !important; color: #fff !important; }
        .ledger-label { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; align-self: center; }
        .ledger-row:last-child .ledger-label { color: #fff; }
        .ledger-val { font-size: 14px; font-weight: 900; }
        .ledger-row:last-child .ledger-val { font-size: 24px; font-weight: 950; }

        .signature-section { display: flex; justify-content: space-between; margin-top: 15mm; padding-top: 5mm; }
        .sig-box { width: 60mm; border-top: 1px solid #000; text-align: center; padding-top: 2mm; font-size: 9px; font-weight: 900; text-transform: uppercase; color: #555; }
        
        .paid-stamp { position: absolute; top: 120mm; left: 50mm; width: 60mm; height: 30mm; border: 5px solid #10b981; border-radius: 4mm; color: #10b981; font-size: 32px; font-weight: 950; display: flex; items-center justify-center transform rotate(-15deg); opacity: 0.2; pointer-events: none; }
      </style>

      <div class="a4-header">
        <div class="company-meta">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="max-height: 20mm; margin-bottom: 4mm; object-fit: contain;" />` : ''}
          <h1>${shop.shopName}</h1>
          <p>${shop.shopAddress || ''}</p>
          <p>TEL: ${shop.shopPhone || ''} | EMAIL: ${shop.shopEmail || ''}</p>
          ${shop.businessRegId ? `<p>REG ID: ${shop.businessRegId}</p>` : ''}
        </div>
        <div class="invoice-meta">
          <h2 class="inv-label">INVOICE</h2>
          <div class="meta-grid">
            <b>Invoice Number</b><span>#${invIdDisplay}</span>
            <b>Registry Date</b><span>${new Date(inv.date).toLocaleDateString()}</span>
            <b>Payment Term</b><span>${inv.paymentTerm || 'Immediate'}</span>
          </div>
        </div>
      </div>

      <div class="client-section">
        <div class="client-info">
          <h3>Customer Entity</h3>
          <div class="name">${cust ? cust.name : 'WALK-IN ACCOUNT'}</div>
          <div class="details">${cust ? `${cust.phone} <br/> ${cust.address || ''}` : 'No detailed record'}</div>
        </div>
        <div style="text-align: right;">
           <div style="font-size: 8px; font-weight: 900; color: #888; text-transform: uppercase; margin-bottom: 1mm;">Accounting Node</div>
           <div style="font-family: monospace; font-size: 12px; font-weight: 900; background: #fff; padding: 2mm 4mm; border-radius: 2mm; border: 1px solid #cbd5e1;">X-${inv.id.substr(0,4).toUpperCase()}</div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 55%;">Product Description</th>
            <th style="text-align: center; width: 10%;">Qty</th>
            <th style="text-align: right; width: 15%;">Unit Rate</th>
            <th style="text-align: right; width: 20%;">Extended</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map(it => `
            <tr>
              <td>${it.name.toUpperCase()}</td>
              <td style="text-align: center;">${it.quantity}</td>
              <td style="text-align: right;">${currency}${it.price.toLocaleString()}</td>
              <td style="text-align: right;">${currency}${(it.price * it.quantity).toLocaleString()}</td>
            </tr>
          `).join('')}
          ${Array(Math.max(0, 10 - inv.items.length)).fill(0).map(() => `<tr style="height: 10mm;"><td></td><td></td><td></td><td></td></tr>`).join('')}
        </tbody>
      </table>

      ${isPaid ? '<div class="paid-stamp">PAID & CLEARED</div>' : ''}

      <div class="totals-section">
        <div class="ledger-box">
          <div class="ledger-row"><span class="ledger-label">Subtotal Aggregate</span><span class="ledger-val">${currency}${inv.total.toLocaleString()}</span></div>
          ${inv.discount > 0 ? `<div class="ledger-row"><span class="ledger-label">Applied Reductions</span><span class="ledger-val" style="color:#dc2626;">-${currency}${inv.discount.toLocaleString()}</span></div>` : ''}
          <div class="ledger-row"><span class="ledger-label">Amount Remitted Today</span><span class="ledger-val" style="text-decoration: underline;">${currency}${inv.paidAmount.toLocaleString()}</span></div>
          <div class="ledger-row"><span class="ledger-label">Carryover Balance</span><span class="ledger-val">${currency}${lastLoan.toLocaleString()}</span></div>
          <div class="ledger-row"><span class="ledger-label">Final Statement Balance</span><span class="ledger-val">${currency}${finalBalance.toLocaleString()}</span></div>
        </div>
      </div>

      <div class="signature-section" style="${shop.showSignatures ? 'display: flex;' : 'display: none;'}">
         <div class="sig-box">Issued By Authority</div>
         <div class="sig-box">Accepted By Receiver</div>
      </div>

      <div style="margin-top: 15mm; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 5mm;">
        <p style="font-size: 10px; font-weight: 700; color: #64748b; margin: 0; text-transform: uppercase; letter-spacing: 2px;">${shop.invoiceFooterNote || 'AUTHORIZED BUSINESS DOCUMENT'}</p>
        <p style="font-size: 7px; color: #cbd5e1; margin-top: 2mm;">POWERED BY SARVARI SELLER PRO - ENTERPRISE EDITION</p>
      </div>
    </div>
  `;
};
