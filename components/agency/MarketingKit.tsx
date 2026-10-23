'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Btn, Card } from '../ui';

export function MarketingKit({ profile, url }: { profile: { name?: string; phone?: string; email?: string; license_no?: string; branch?: string }; url: string }) {
  const [qr, setQr] = useState('');
  useEffect(() => { QRCode.toDataURL(url, { width: 280, margin: 2, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr('')); }, [url]);
  function downloadVCard() {
    const lines = ['BEGIN:VCARD','VERSION:3.0',`FN:${profile.name || ''}`,`TEL;TYPE=CELL:${profile.phone || ''}`,`EMAIL:${profile.email || ''}`,`URL:${url}`,`NOTE:Insurance advisor${profile.license_no ? ` · License ${profile.license_no}` : ''}`,'END:VCARD'];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' })); a.download = 'learn-with-sulav-advisor.vcf'; a.click(); URL.revokeObjectURL(a.href);
  }
  function downloadId() {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [86, 54] });
    pdf.setFillColor(10, 79, 138); pdf.rect(0, 0, 86, 14, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(11); pdf.text('LEARN WITH SULAV', 5, 9);
    pdf.setTextColor(20, 35, 55); pdf.setFontSize(10); pdf.text(profile.name || 'Insurance Advisor', 5, 22);
    pdf.setFontSize(7); pdf.text('Financial Advisor · Insurance Mentor', 5, 28);
    if (profile.license_no) pdf.text(`License: ${profile.license_no}`, 5, 34);
    if (profile.phone) pdf.text(`Phone: ${profile.phone}`, 5, 39);
    if (profile.branch) pdf.text(`Branch: ${profile.branch}`, 5, 44);
    if (qr) pdf.addImage(qr, 'PNG', 64, 22, 17, 17);
    pdf.setFontSize(5.5); pdf.text('Scan to visit public portfolio', 63, 42);
    pdf.save('learn-with-sulav-agent-card.pdf');
  }
  function downloadBanner() {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630); gradient.addColorStop(0, '#0a4f8a'); gradient.addColorStop(1, '#082e52');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1200, 630); ctx.fillStyle = '#f6c453'; ctx.font = 'bold 34px sans-serif'; ctx.fillText('LEARN WITH SULAV', 84, 110);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 66px sans-serif'; ctx.fillText('Festival Greetings', 84, 245);
    ctx.font = '38px sans-serif'; ctx.fillText('Wishing you happiness, health and prosperity', 84, 325);
    ctx.font = 'bold 36px sans-serif'; ctx.fillText(profile.name || 'Your Insurance Advisor', 84, 465);
    if (profile.phone) { ctx.font = '28px sans-serif'; ctx.fillText(profile.phone, 84, 520); }
    const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'learn-with-sulav-festival-greetings.png'; a.click();
  }
  return <Card className="grid gap-4 p-5"><div><h2 className="font-bold">Marketing kit</h2><p className="mt-1 text-sm text-slate-600">Download an agent card, contact card, QR code, or shareable festival greeting.</p></div>
    <div className="flex flex-wrap items-center gap-4">{qr && <div className="grid justify-items-center gap-1"><img className="h-32 w-32" src={qr} alt="QR code for your public portfolio" /><span className="text-xs text-slate-500">Public portfolio QR</span></div>}<div className="flex flex-wrap gap-2"><Btn onClick={downloadId}>Agent ID card PDF</Btn><Btn variant="ghost" onClick={downloadVCard}>Download contact (VCF)</Btn><Btn variant="ghost" onClick={downloadBanner}>Festival banner</Btn></div></div>
  </Card>;
}
