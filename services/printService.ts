
import { Invoice, Customer, AppState, LoanTransaction } from '../types';

export type PrintLayout = 'a4' | 'advice' | 'thermal';

export const generatePrintHTML = (state: AppState, inv: Invoice, layout: PrintLayout): string => {
  const cust = state.customers.find(c => c.id === inv.customerId);
  const currency = state.settings.currency;
  const shop = state.settings;
  const isRTL = shop.language === 'ps' || shop.language === 'dr';
  const direction = isRTL ? 'rtl' : 'ltr';
  const brandColor = shop.brandColor || '#4f46e5';

  // --- POINT-IN-TIME FINANCIAL AUDIT ---
  // We must calculate the customer balance based ONLY on data existing AT or BEFORE the invoice date.
  // Previous bills must not be aware of future dues.
  
  let historicalDebtBeforeThisInvoice = 0;
  
  if (cust) {
    const invTimestamp = new Date(inv.date).getTime();
    
    // 1. Sum up all invoices for this customer PRIOR to this one
    const priorInvoices = state.invoices.filter(i => 
      i.customerId === cust.id && 
      new Date(i.date).getTime() < invTimestamp &&
      i.id !== inv.id
    );
    
    const totalPriorBilled = priorInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalPriorPaidAtCheckout = priorInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
    
    // 2. Sum up all loan transactions for this customer PRIOR to this invoice
    const priorLoanTrans = state.loanTransactions.filter(t => 
      t.customerId === cust.id && 
      new Date(t.date).getTime() < invTimestamp
    );
    
    const totalPriorManualDebt = priorLoanTrans
      .filter(t => t.type === 'debt')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalPriorRepayments = priorLoanTrans
      .filter(t => t.type === 'repayment')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalPriorAdjustments = priorLoanTrans
      .filter(t => t.type === 'adjustment')
      .reduce((sum, t) => sum + t.amount, 0);

    // Initial Debt = (Prior Billed - Prior PaidAtCheckout) + ManualDebt - Repayments + Adjustments
    historicalDebtBeforeThisInvoice = (totalPriorBilled - totalPriorPaidAtCheckout) + totalPriorManualDebt - totalPriorRepayments + totalPriorAdjustments;
  }

  const thisInvoiceTotal = inv.total;
  const paidOnThis = inv.paidAmount;
  const totalAccumulatedAtThisPoint = historicalDebtBeforeThisInvoice + thisInvoiceTotal;
  const finalDueAtThisPoint = totalAccumulatedAtThisPoint - paidOnThis;

  // Item List HTML
  const itemsHTML = inv.items.map((it, idx) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 6px 4px; font-size: 10px; color: #64748b;">${idx + 1}</td>
      <td style="padding: 6px 4px; font-size: 11px; font-weight: 600; text-align: ${isRTL ? 'right' : 'left'};">
         <div style="color: #1e293b;">${it.name}</div>
         <div style="font-size: 9px; color: #94a3b8; font-weight: normal;">${it.sku}</div>
      </td>
      <td style="padding: 6px 4px; text-align: center; font-size: 11px;">${it.quantity}</td>
      <td style="padding: 6px 4px; text-align: ${isRTL ? 'left' : 'right'}; font-size: 11px; color: #64748b;">${currency}${it.price.toLocaleString()}</td>
      <td style="padding: 6px 4px; text-align: ${isRTL ? 'left' : 'right'}; font-weight: 700; font-size: 11px; color: #1e293b;">${currency}${(it.price * it.quantity).toLocaleString()}</td>
    </tr>`).join('');

  const logoHTML = shop.shopLogo 
    ? `<img src="${shop.shopLogo}" style="max-height: 40px; max-width: 140px; object-fit: contain; margin-bottom: 8px;" />`
    : `<div style="width: 32px; height: 32px; background: ${brandColor}; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; margin-bottom: 8px;">${shop.shopName.charAt(0)}</div>`;

  const invIdDisplay = `${shop.invoicePrefix || ''}${inv.id.padStart(4, '0')}`;

  if (layout === 'a4' || layout === 'advice') {
    const isAdvice = layout === 'advice';
    const title = isAdvice ? (isRTL ? 'د حساب بیان' : 'PAYMENT ADVICE') : (isRTL ? 'د مالیې فاکتور' : 'TAX INVOICE');
    
    return `
    <!DOCTYPE html>
    <html dir="${direction}">
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Noto+Sans+Arabic:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: ${isRTL ? "'Noto Sans Arabic'" : "'Inter'"}, sans-serif; margin: 0; padding: 0; color: #1e293b; background: white; line-height: 1.2; }
        .page { padding: 8mm; width: 210mm; min-height: 297mm; margin: 0 auto; box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid ${brandColor}; padding-bottom: 10px; margin-bottom: 15px; }
        .shop-info h1 { margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; }
        .shop-details { margin-top: 4px; font-size: 10px; color: #64748b; line-height: 1.3; }
        .invoice-meta { text-align: ${isRTL ? 'left' : 'right'}; }
        .invoice-title { margin: 0; font-size: 20px; font-weight: 900; color: ${brandColor}; }
        .ref-box { margin-top: 8px; background: #f8fafc; padding: 8px 15px; border-radius: 10px; border: 1px solid #f1f5f9; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
        .info-card { background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { background: #1e293b; color: #fff; padding: 8px 6px; font-size: 9px; text-transform: uppercase; text-align: ${isRTL ? 'right' : 'left'}; }
        .financial-summary { display: flex; justify-content: flex-end; gap: 20px; margin-bottom: 20px; }
        .ledger-box { width: 280px; background: #f8fafc; border-radius: 12px; padding: 15px; border: 1px solid #f1f5f9; }
        .ledger-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 11px; }
        .ledger-row.bold { font-weight: 900; color: #1e293b; border-bottom-style: solid; border-bottom-color: #cbd5e1; }
        .ledger-total { display: flex; justify-content: space-between; padding-top: 10px; margin-top: 4px; font-weight: 900; font-size: 15px; }
        .sig-section { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; border-top: 1px solid #f1f5f9; }
        .sig-box { width: 160px; text-align: center; }
        .sig-line { border-bottom: 1px solid #cbd5e1; height: 30px; margin-bottom: 8px; }
        .legal-note { font-size: 9px; color: #94a3b8; font-style: italic; line-height: 1.4; margin-top: 10px; border-left: 2px solid #e2e8f0; padding-left: 10px; }
        @media print { .page { padding: 4mm; width: 100%; min-height: auto; } }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="shop-info">
            ${logoHTML}
            <h1>${shop.shopName}</h1>
            <div class="shop-details">
              <div>${shop.shopAddress || ''}</div>
              <div>Phone: ${shop.shopPhone || ''}</div>
              ${shop.businessRegId ? `<div style="font-weight: 800; color: #1e293b; margin-top: 2px;">Reg #: ${shop.businessRegId}</div>` : ''}
              ${shop.invoiceHeaderNote ? `<div style="margin-top: 4px; font-style: italic; color: #64748b;">${shop.invoiceHeaderNote}</div>` : ''}
            </div>
          </div>
          <div class="invoice-meta">
            <h2 class="invoice-title">${title}</h2>
            <div class="ref-box">
              <div style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Reference</div>
              <div style="font-size: 15px; font-weight: 900;">#${invIdDisplay}</div>
              <div style="font-size: 10px; font-weight: 700; color: #64748b; margin-top: 2px;">${new Date(inv.date).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <p style="margin: 0; font-size: 8px; color: #94a3b8; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Billed To</p>
            <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 900; color: #1e293b;">${cust?.name || 'Walk-in Customer'}</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 700; color: ${brandColor};">${cust?.phone || ''}</p>
          </div>
          <div class="info-card" style="background: ${inv.status === 'paid' ? '#f0fdf4' : '#fef2f2'}; border-color: ${inv.status === 'paid' ? '#dcfce7' : '#fee2e2'};">
            <p style="margin: 0; font-size: 8px; color: #94a3b8; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Status Summary</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 900; color: ${inv.status === 'paid' ? '#16a34a' : '#dc2626'}; text-transform: uppercase;">${inv.status}</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 700; color: #64748b;">via ${inv.paymentMethod.toUpperCase()}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Description</th>
              <th style="text-align: center; width: 40px;">Qty</th>
              <th style="text-align: ${isRTL ? 'left' : 'right'}; width: 80px;">Unit</th>
              <th style="text-align: ${isRTL ? 'left' : 'right'}; width: 80px;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <div class="financial-summary">
          <div class="ledger-box">
            <p style="margin: 0 0 8px 0; font-size: 9px; font-weight: 800; color: ${brandColor}; text-transform: uppercase; letter-spacing: 0.5px;">Momentum Audit</p>
            
            <div class="ledger-row">
              <span style="color: #64748b;">Historical Balance</span>
              <span>${currency}${historicalDebtBeforeThisInvoice.toLocaleString()}</span>
            </div>
            
            <div class="ledger-row">
              <span style="color: #64748b;">Current Gross Bill</span>
              <span>+ ${currency}${thisInvoiceTotal.toLocaleString()}</span>
            </div>
            
            <div class="ledger-row bold">
               <span style="color: #1e293b;">Accumulated Sum</span>
               <span>${currency}${totalAccumulatedAtThisPoint.toLocaleString()}</span>
            </div>

            <div class="ledger-row">
              <span style="color: #64748b;">Deposit Recorded</span>
              <span style="color: #16a34a;">- ${currency}${paidOnThis.toLocaleString()}</span>
            </div>
            
            <div class="ledger-total">
              <span style="text-transform: uppercase; font-size: 12px;">Net Debt After Bill</span>
              <span style="color: #dc2626;">${currency}${finalDueAtThisPoint.toLocaleString()}</span>
            </div>
          </div>
        </div>

        ${shop.invoiceFooterNote ? `<div class="legal-note">${shop.invoiceFooterNote}</div>` : ''}

        ${shop.showSignatures ? `
        <div class="sig-section">
          <div class="sig-box">
            <div class="sig-line"></div>
            <p style="font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 800;">Issuer Signature</p>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <p style="font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 800;">Receiver Identity</p>
          </div>
        </div>
        ` : ''}

        <div style="margin-top: 25px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px;">
          <p style="color: #94a3b8; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Thank you for your valued patronage</p>
          <div style="font-size: 8px; color: #cbd5e1; margin-top: 4px; font-weight: 900;">SECURED BY SARVARI SELLER PRO - ARCHIVAL AUDIT PASSED</div>
        </div>
      </div>
    </body>
    </html>`;
  }

  // Thermal POS Optimized Layout - Chronological Audit Included
  return `
    <!DOCTYPE html>
    <html dir="${direction}">
    <head>
      <style>
        @page { margin: 0; }
        body { 
          width: 76mm; 
          margin: 0; 
          padding: 4mm 2mm; 
          font-family: 'Courier New', Courier, monospace; 
          font-size: 10px; 
          line-height: 1.1; 
          color: #000; 
          background: #fff;
          -webkit-print-color-adjust: exact;
        }
        .text-center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 3px 0; width: 100%; }
        .item-row { display: flex; justify-content: space-between; margin-bottom: 1px; }
        .item-name { flex: 1; padding-right: 4px; }
        .item-qty { width: 25px; text-align: center; }
        .item-total { width: 60px; text-align: right; }
        h2 { margin: 0; font-size: 14px; text-transform: uppercase; }
        .financial-row { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 1px; }
        .total-section { margin-top: 5px; font-size: 12px; border-top: 1px solid #000; padding-top: 3px; }
      </style>
    </head>
    <body>
      <div class="text-center">
        ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="max-height: 30px; max-width: 60mm; object-fit: contain; margin-bottom: 4px;" />` : ''}
        <h2 class="bold">${shop.shopName}</h2>
        <p style="font-size: 9px;">${shop.shopPhone || ''}</p>
        ${shop.businessRegId ? `<p style="font-size: 8px;">Reg ID: ${shop.businessRegId}</p>` : ''}
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between; font-size: 9px;">
           <span class="bold">#${invIdDisplay}</span>
           <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>
        <div style="text-align: left; font-size: 9px;">
           CUST: ${cust?.name.toUpperCase().slice(0, 15) || 'WALK-IN'}
        </div>
      </div>
      <div class="divider"></div>
      <div class="item-row bold" style="font-size: 8px;">
        <span class="item-name">ITEM</span>
        <span class="item-qty">QTY</span>
        <span class="item-total">TOTAL</span>
      </div>
      <div class="divider"></div>
      ${inv.items.map(it => `
        <div class="item-row">
          <span class="item-name">${it.name.toUpperCase().slice(0, 18)}</span>
          <span class="item-qty">${it.quantity}</span>
          <span class="item-total">${currency}${(it.price * it.quantity).toFixed(0)}</span>
        </div>
      `).join('')}
      <div class="divider"></div>
      <div class="financial-row"><span>PREV BAL:</span><span>${currency}${historicalDebtBeforeThisInvoice.toFixed(0)}</span></div>
      <div class="financial-row"><span>PRESENT:</span><span>${currency}${thisInvoiceTotal.toFixed(0)}</span></div>
      <div class="financial-row"><span>PAID NOW:</span><span>${currency}${paidOnThis.toFixed(0)}</span></div>
      <div class="item-row bold total-section">
        <span>MOMENT DUE:</span>
        <span>${currency}${finalDueAtThisPoint.toFixed(0)}</span>
      </div>
      <div class="divider"></div>
      ${shop.invoiceFooterNote ? `<div style="font-size: 8px; text-align: center; margin: 5px 0;">${shop.invoiceFooterNote}</div>` : ''}
      <div class="text-center" style="font-size: 8px; margin-top: 8px;">
        <p>*** THANK YOU ***</p>
        <p>SARVARI POS ARCHIVE</p>
      </div>
    </body>
    </html>`;
};
