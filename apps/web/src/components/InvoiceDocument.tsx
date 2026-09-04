import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/Button';
import { toDualDateLabel } from '../utils/nepaliDate';

export interface InvoiceDocumentData {
  id: string;
  invoiceType: 'ADMISSION' | 'TUITION' | 'SUBJECT' | 'ACTIVITY';
  status: string;
  institutionName: string;
  panNumber: string;
  vatRate: number;
  studentName: string;
  admissionNumber?: string | null;
  gradeName?: string | null;
  branchName?: string | null;
  issuedAt: string;
  dueDate: string;
  paymentDate?: string | null;
  billingCycleStart: string;
  billingCycleEnd: string;
  transactionId?: string | null;
  lines: Array<{ label: string; amount: number }>;
  discount: number;
  fine: number;
  netPayable: number;
}

const invoiceTitle = (type: InvoiceDocumentData['invoiceType']) => type === 'ADMISSION'
  ? 'One-time admission fee'
  : type === 'SUBJECT' ? 'Monthly subject tuition'
    : type === 'ACTIVITY' ? 'Optional activity fee' : 'Monthly grade tuition';
const money = (value: number) => `NPR ${value.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value?: string | null) => toDualDateLabel(value);
const shortId = (id: string) => id.slice(0, 8).toUpperCase();
const documentHeading = (status: string) => status === 'PAID' ? 'Receipt' : 'Invoice';
const invoiceFacts = (data: InvoiceDocumentData) => [
  ['Issued', date(data.issuedAt)],
  ['Due', date(data.dueDate)],
  data.invoiceType === 'ADMISSION'
    ? ['Charge', 'One-time admission']
    : ['Billing period', `${date(data.billingCycleStart)} – ${date(data.billingCycleEnd)}`],
  ['VAT rate', `${data.vatRate}%`],
  ['Paid on', date(data.paymentDate)],
  ['Payment reference', data.transactionId || '—'],
];

function drawInvoicePng(data: InvoiceDocumentData) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = Math.max(1280, 1120 + data.lines.length * 56);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image export is not supported in this browser.');
  // Exported invoices intentionally use fixed ink/paper colors for predictable printing.
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#172033'; context.fillRect(0, 0, canvas.width, 12);
  const text = (value: string, x: number, y: number, font: string, color = '#172033', align: CanvasTextAlign = 'left') => {
    context.font = font; context.fillStyle = color; context.textAlign = align; context.fillText(value, x, y);
  };
  const rule = (y: number) => { context.strokeStyle = '#98a2b2'; context.lineWidth = 2; context.setLineDash([10, 7]); context.beginPath(); context.moveTo(60, y); context.lineTo(740, y); context.stroke(); context.setLineDash([]); };
  text(data.institutionName.toUpperCase(), 400, 76, '700 31px Arial', '#172033', 'center');
  text(`PAN ${data.panNumber || 'NOT RECORDED'}`, 400, 116, '20px Arial', '#56647a', 'center');
  text(documentHeading(data.status).toUpperCase(), 400, 180, '700 40px Arial', '#172033', 'center');
  text(invoiceTitle(data.invoiceType), 400, 220, '22px Arial', '#56647a', 'center');
  text(`#${shortId(data.id)} · ${data.status}`, 400, 258, '700 20px Arial', data.status === 'PAID' ? '#087a55' : '#b56a00', 'center');
  rule(292);
  text('STUDENT', 60, 344, '700 16px Arial', '#56647a');
  text(data.studentName, 60, 382, '700 25px Arial');
  text([data.admissionNumber, data.gradeName, data.branchName].filter(Boolean).join(' · '), 60, 418, '19px Arial', '#56647a');
  rule(452);
  const facts = invoiceFacts(data);
  let factY = 500;
  facts.forEach(([label, value]) => { text(label.toUpperCase(), 60, factY, '700 15px Arial', '#56647a'); text(value, 740, factY, '19px Arial', '#172033', 'right'); factY += 40; });
  rule(factY + 2);
  let rowY = factY + 70;
  text('DESCRIPTION', 60, rowY, '700 17px Arial', '#56647a'); text('AMOUNT', 740, rowY, '700 17px Arial', '#56647a', 'right');
  rowY += 42;
  data.lines.forEach((line) => { text(line.label, 60, rowY, '21px Arial'); text(money(line.amount), 740, rowY, '21px Arial', '#172033', 'right'); rowY += 50; });
  if (data.discount > 0) { text('Discount', 60, rowY, '21px Arial'); text(`−${money(data.discount)}`, 740, rowY, '21px Arial', '#087a55', 'right'); rowY += 50; }
  if (data.fine > 0) { text('Fine', 60, rowY, '21px Arial'); text(money(data.fine), 740, rowY, '21px Arial', '#b4232f', 'right'); rowY += 50; }
  rule(rowY + 4); rowY += 68;
  text('TOTAL', 60, rowY, '700 23px Arial'); text(money(data.netPayable), 740, rowY, '700 30px Arial', '#172033', 'right');
  rowY += 64;
  for (let x = 90; x < 710; x += 8) { const width = 2 + ((x + data.id.charCodeAt(x % data.id.length)) % 5); context.fillStyle = '#172033'; context.fillRect(x, rowY, width, 58); }
  text(`#${data.id.toUpperCase()}`, 400, rowY + 94, '17px Arial', '#56647a', 'center');
  text('Computer-generated receipt · No signature required', 400, rowY + 148, '17px Arial', '#56647a', 'center');
  const link = document.createElement('a');
  link.download = `${data.invoiceType.toLowerCase()}-invoice-${shortId(data.id)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function InvoiceDocumentDialog({ data, onClose, onPay }: { data: InvoiceDocumentData; onClose: () => void; onPay?: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [exportError, setExportError] = useState('');
  const facts = invoiceFacts(data);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('keydown', keyboard); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [onClose]);
  useEffect(() => {
    if (!onPay || data.status === 'PAID') return;
    const actions = dialogRef.current?.querySelector<HTMLElement>('.invoice-document-toolbar > div:last-child');
    if (!actions) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'invoice-document-pay-button'; button.textContent = 'Pay this invoice';
    button.addEventListener('click', onPay); actions.prepend(button);
    return () => { button.removeEventListener('click', onPay); button.remove(); };
  }, [data.status, onPay]);
  const download = () => { try { setExportError(''); drawInvoicePng(data); } catch (error) { setExportError(error instanceof Error ? error.message : 'Could not create the invoice image.'); } };
  return createPortal(<div className="invoice-document-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={dialogRef} className="invoice-document-dialog" role="dialog" aria-modal="true" aria-labelledby="invoice-document-title" tabIndex={-1}><header className="invoice-document-toolbar"><div><strong>{documentHeading(data.status)} preview</strong><small>Print, save as PDF, or download a PNG image.</small></div><div><Button variant="outline" onClick={() => window.print()}><span className="material-symbols-outlined" aria-hidden="true">print</span>Print / PDF</Button><Button onClick={download}><span className="material-symbols-outlined" aria-hidden="true">image</span>Save PNG</Button><button type="button" onClick={onClose} aria-label={`Close ${documentHeading(data.status).toLowerCase()} preview`}><span className="material-symbols-outlined" aria-hidden="true">close</span></button></div></header>{exportError ? <p className="invoice-document-error" role="alert">{exportError}</p> : null}<div className="invoice-document-stage"><div className="invoice-printer" aria-hidden="true"><span /></div><article className="invoice-document-print"><header><div><h1>{data.institutionName}</h1><p>PAN {data.panNumber || 'Not recorded'}</p></div><h2 id="invoice-document-title">{documentHeading(data.status)}</h2><p>{invoiceTitle(data.invoiceType)}</p><p>#{shortId(data.id)} · <strong className={data.status === 'PAID' ? 'is-paid' : ''}>{data.status}</strong></p></header><section className="invoice-document-parties"><div><small>Student</small><strong>{data.studentName}</strong><span>{[data.admissionNumber, data.gradeName, data.branchName].filter(Boolean).join(' · ')}</span></div></section><dl className="invoice-document-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>{data.lines.map((line, index) => <tr key={`${line.label}-${index}`}><td>{line.label}</td><td>{money(line.amount)}</td></tr>)}{data.discount > 0 ? <tr><td>Discount</td><td className="is-discount">−{money(data.discount)}</td></tr> : null}{data.fine > 0 ? <tr><td>Fine</td><td>{money(data.fine)}</td></tr> : null}</tbody><tfoot><tr><th>Total</th><th>{money(data.netPayable)}</th></tr></tfoot></table><div className="invoice-reference-bars" aria-hidden="true" /><code>#{data.id.toUpperCase()}</code><footer><p>Computer-generated {documentHeading(data.status).toLowerCase()} · No signature required</p><p>{data.institutionName} · PAN {data.panNumber || 'not recorded'}</p></footer></article></div></div></div>, document.body);
}
