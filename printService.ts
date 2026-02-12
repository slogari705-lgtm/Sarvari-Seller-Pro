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

  // 1. THERMAL LAYOUT (72mm Optimized) - MONOCHROME HIGH CONTRAST
  if (layoutType === 'thermal') {
    return `
      <div dir="${direction}" style="width: 72mm; margin: 0; padding: 2mm; font-family: 'Inter', 'Courier New', sans-serif; font-size: 12px; color: #000; background: #fff; line-height: 1.3;">
        <style>
          @page { margin: 0; size: 72mm auto; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          .thermal-table { width: 100%; border-collapse: collapse; margin: 3mm 0; }
          .thermal-table th { border-bottom: 2px solid #000; padding: 1.5mm 0; text-align: left; font-size: 10px; font-weight: 900; }
          .thermal-table td { padding: 2mm 0; vertical-align: top; border-bottom: 1px dotted #ccc; }
          .summary-row { display: flex; justify-content: space-between; padding: 0.5mm 0; }
          .summary-label { font-weight: 700; color: #000; }
          .summary-val { font-weight: 900; text-align: right; }
          .divider { border-top: 1px dashed #000; margin: 3mm 0; }
        </style>
        
        <div style="text-align: center; margin-bottom: 4mm;">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="max-height: 15mm; margin-bottom: 2mm; filter: grayscale(1) contrast(2);" />` : ''}
          <div style="font-size: 18px; font-weight: 950; letter-spacing: -1px; line-height: 1;">${shop.shopName.toUpperCase()}</div>
          <div style="font-size: 10px; font-weight: 700; margin-top: 1.5mm;">${shop.shopAddress || ''}</div>
          <div style="font-size: 10px; font-weight: 700;">PH: ${shop.shopPhone || ''}</div>
        </div>

        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 11px; margin-bottom: 3mm; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 1.5mm 0;">
          <span>#INV-${invIdDisplay}</span>
          <span>${new Date(inv.date).toLocaleDateString()}</span>
        </div>

        <div style="margin-bottom: 4mm;">
          <div style="font-size: 9px; font-weight: 700; color: #555; text-transform: uppercase;">Customer Entity:</div>
          <div style="font-size: 14px; font-weight: 950; margin-top: 1mm;">${cust ? cust.name.toUpperCase() : 'CASH CUSTOMER'}</div>
          ${cust ? `<div style="font-size: 11px; font-weight: 800; margin-top: 0.5mm;">TELECOM: ${cust.phone}</div>` : ''}
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
                <td style="font-weight: 800;">${it.name.toUpperCase()}</td>
                <td style="text-align: center; font-weight: 900;">${it.quantity}</td>
                <td style="text-align: right; font-weight: 950;">${(it.price * it.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 2mm;">
          <div class="summary-row"><span class="summary-label">SUBTOTAL</span><span class="summary-val">${currency}${inv.total.toLocaleString()}</span></div>
          ${inv.discount > 0 ? `<div class="summary-row" style="color: #000;"><span class="summary-label">REDUCTION</span><span class="summary-val">-${currency}${inv.discount.toLocaleString()}</span></div>` : ''}
          <div class="summary-row" style="background: #000; color: #fff; padding: 2mm; margin: 2mm 0; font-size: 14px;"><span class="summary-label" style="color:#fff;">RECEIPT</span><span class="summary-val" style="color:#fff;">${currency}${inv.paidAmount.toLocaleString()}</span></div>
          
          <div class="divider"></div>
          
          <div class="summary-row"><span class="summary-label">PREV. BALANCE</span><span class="summary-val">${currency}${lastLoan.toLocaleString()}</span></div>
          <div class="summary-row" style="font-size: 16px; margin-top: 1mm; border: 2px solid #000; padding: 2mm;">
             <span class="summary-label">NET PAYABLE</span>
             <span class="summary-val">${currency}${finalBalance.toLocaleString()}</span>
          </div>
        </div>

        ${isPaid ? `
          <div style="margin: 6mm 0; text-align: center;">
            <div style="display: inline-block; border: 4px solid #000; padding: 2mm 10mm; font-size: 16px; font-weight: 950; color: #000; transform: rotate(-3deg);">PAID & CLEARED</div>
          </div>
        ` : ''}

        <div style="text-align: center; margin-top: 8mm; font-weight: 900; font-size: 10px; border-top: 2px solid #000; padding-top: 4mm;">
          ${shop.invoiceFooterNote || 'AUTHORIZED BUSINESS RECEIPT'}
          <div style="font-size: 8px; font-weight: 700; margin-top: 3mm; letter-spacing: 2px; opacity: 0.6;">POWERED BY SARVARI SELLER PRO</div>
          <div style="margin-top: 2mm;"><img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${inv.id}" style="width: 20mm; height: 20mm;" /></div>
        </div>
      </div>
    `;
  }

  // 2. A4 LAYOUT (Professional Ledger) - UPGRADED SPACING & BORDERS
  return `
    <div dir="${direction}" style="width: 210mm; min-height: 297mm; padding: 20mm; background: #fff; font-family: 'Inter', sans-serif; color: #000; box-sizing: border-box; display: flex; flex-direction: column;">
      <style>
        @page { size: A4; margin: 0; }
        * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
        .a4-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15mm; border-bottom: 6px solid ${shop.brandColor}; padding-bottom: 10mm; }
        .company-meta h1 { font-size: 32px; font-weight: 950; margin: 0; color: ${shop.brandColor}; letter-spacing: -1.5px; line-height: 1; }
        .company-meta p { font-size: 12px; margin: 4px 0; color: #333; font-weight: 700; }
        .invoice-meta { text-align: right; }
        .inv-label { font-size: 48px; font-weight: 950; margin: 0; opacity: 0.1; position: absolute; right: 20mm; top: 20mm; letter-spacing: 5px; }
        .meta-grid { display: grid; grid-template-columns: auto auto; gap: 3mm 8mm; margin-top: 6mm; text-align: right; }
        .meta-grid b { font-size: 10px; text-transform: uppercase; color: #666; font-weight: 800; }
        .meta-grid span { font-size: 14px; font-weight: 900; color: #000; }

        .client-section { display: flex; justify-content: space-between; margin-bottom: 12mm; background: #f1f5f9; padding: 8mm; border-radius: 6mm; border: 1px solid #cbd5e1; }
        .client-info h3 { font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 3mm; letter-spacing: 1px; }
        .client-info .name { font-size: 22px; font-weight: 950; margin-bottom: 2mm; color: #0f172a; }
        .client-info .details { font-size: 13px; color: #334155; font-weight: 700; line-height: 1.5; }

        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15mm; }
        .items-table th { background: #0f172a !important; color: #fff !important; padding: 5mm; text-align: left; font-size: 11px; font-weight: 900; text-transform: uppercase; border: 1px solid #0f172a; letter-spacing: 1px; }
        .items-table td { padding: 5mm; font-size: 14px; font-weight: 700; border: 1px solid #e2e8f0; color: #1e293b; }
        .items-table tr:nth-child(even) { background: #f8fafc; }
        
        .totals-container { display: flex; justify-content: flex-end; margin-top: auto; }
        .ledger-box { width: 110mm; border: 3px solid #0f172a; border-radius: 4mm; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .ledger-row { display: flex; justify-content: space-between; padding: 4mm 6mm; border-bottom: 1px solid #e2e8f0; }
        .ledger-row:last-child { border-bottom: none; background: #0f172a !important; color: #fff !important; }
        .ledger-label { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #475569; align-self: center; letter-spacing: 1px; }
        .ledger-row:last-child .ledger-label { color: #94a3b8; }
        .ledger-val { font-size: 16px; font-weight: 900; }
        .ledger-row:last-child .ledger-val { font-size: 28px; font-weight: 950; }

        .signature-section { display: flex; justify-content: space-between; margin-top: 20mm; padding-top: 10mm; }
        .sig-box { width: 70mm; border-top: 2px solid #0f172a; text-align: center; padding-top: 3mm; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #334155; }
        
        .paid-stamp { position: absolute; top: 130mm; left: 60mm; width: 80mm; height: 40mm; border: 8px solid #059669; border-radius: 6mm; color: #059669; font-size: 42px; font-weight: 950; display: flex; align-items: center; justify-content: center; transform: rotate(-12deg); opacity: 0.15; pointer-events: none; z-index: 50; }
      </style>

      <div class="a4-header">
        <div class="company-meta">
          ${shop.shopLogo ? `<img src="${shop.shopLogo}" style="max-height: 25mm; margin-bottom: 6mm; object-fit: contain;" />` : ''}
          <h1>${shop.shopName.toUpperCase()}</h1>
          <p>${shop.shopAddress || ''}</p>
          <p>CONTACT: ${shop.shopPhone || ''} • EMAIL: ${shop.shopEmail || ''}</p>
          ${shop.businessRegId ? `<p style="color: ${shop.brandColor}; font-weight: 900;">LICENSE: ${shop.businessRegId}</p>` : ''}
        </div>
        <div class="invoice-meta">
          <h2 class="inv-label">OFFICIAL INVOICE</h2>
          <div class="meta-grid">
            <b>INVOICE SERIAL</b><span>#${invIdDisplay}</span>
            <b>POSTING DATE</b><span>${new Date(inv.date).toLocaleDateString()}</span>
            <b>DUE STATUS</b><span>${inv.paymentTerm || 'IMMEDIATE'}</span>
          </div>
        </div>
      </div>

      <div class="client-section">
        <div class="client-info">
          <h3>Bill To / Recipient</h3>
          <div class="name">${cust ? cust.name.toUpperCase() : 'WALK-IN CUSTOMER'}</div>
          <div class="details">${cust ? `MOBILE: ${cust.phone} <br/> ADDRESS: ${cust.address || 'NODE NOT REGISTERED'}` : 'Anonymous cash-based transaction record.'}</div>
        </div>
        <div style="text-align: right;">
           <div style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 2mm;">Verification Node</div>
           <div style="font-family: monospace; font-size: 16px; font-weight: 950; background: #fff; padding: 4mm 8mm; border-radius: 3mm; border: 2px solid #0f172a; color: #0f172a;">AUTH-${inv.id.substr(0,6).toUpperCase()}</div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50%;">Description of Goods/Services</th>
            <th style="text-align: center; width: 15%;">Quantity</th>
            <th style="text-align: right; width: 15%;">Unit Rate</th>
            <th style="text-align: right; width: 20%;">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map(it => `
            <tr>
              <td style="font-weight: 800; color: #0f172a;">${it.name.toUpperCase()}</td>
              <td style="text-align: center; font-weight: 900;">${it.quantity}</td>
              <td style="text-align: right; font-family: monospace;">${currency}${it.price.toLocaleString()}</td>
              <td style="text-align: right; font-weight: 950;">${currency}${(it.price * it.quantity).toLocaleString()}</td>
            </tr>
          `).join('')}
          ${Array(Math.max(0, 8 - inv.items.length)).fill(0).map(() => `<tr style="height: 12mm;"><td></td><td></td><td></td><td></td></tr>`).join('')}
        </tbody>
      </table>

      ${isPaid ? '<div class="paid-stamp">PAID & AUDITED</div>' : ''}

      <div class="totals-container">
        <div class="ledger-box">
          <div class="ledger-row"><span class="ledger-label">Subtotal Aggregate</span><span class="ledger-val">${currency}${inv.total.toLocaleString()}</span></div>
          ${inv.discount > 0 ? `<div class="ledger-row"><span class="ledger-label">Applied Reductions</span><span class="ledger-val" style="color:#e11d48;">-${currency}${inv.discount.toLocaleString()}</span></div>` : ''}
          <div class="ledger-row" style="background: #f8fafc;"><span class="ledger-label">Remittance Captured</span><span class="ledger-val" style="color: ${shop.brandColor};">${currency}${inv.paidAmount.toLocaleString()}</span></div>
          <div class="ledger-row"><span class="ledger-label">Cumulative Carryover</span><span class="ledger-val">${currency}${lastLoan.toLocaleString()}</span></div>
          <div class="ledger-row"><span class="ledger-label">Net Balance Due</span><span class="ledger-val">${currency}${finalBalance.toLocaleString()}</span></div>
        </div>
      </div>

      <div class="signature-section" style="${shop.showSignatures ? 'display: flex;' : 'display: none;'}">
         <div class="sig-box">Store Authorization & Stamp</div>
         <div class="sig-box">Recipient Acceptance Signature</div>
      </div>

      <div style="margin-top: 20mm; text-align: center; border-top: 2px solid #f1f5f9; padding-top: 8mm;">
        <p style="font-size: 11px; font-weight: 900; color: #64748b; margin: 0; text-transform: uppercase; letter-spacing: 3px;">${shop.invoiceFooterNote || 'AUTHORIZED BUSINESS DOCUMENT'}</p>
        <div style="display: flex; justify-content: center; gap: 10mm; margin-top: 6mm; opacity: 0.4; font-size: 8px; font-weight: 800; text-transform: uppercase;">
          <span>Ledger Version 1.3.2</span>
          <span>•</span>
          <span>Powered by Sarvari Systems</span>
          <span>•</span>
          <span>Confidential Audit Trail</span>
        </div>
      </div>
    </div>
  `;
};