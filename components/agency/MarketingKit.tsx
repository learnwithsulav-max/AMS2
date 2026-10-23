'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Btn, Card, Field } from '../ui';
import { BRAND } from '@/lib/brand';

type MarketingProfile = { name?: string; phone?: string; email?: string; license_no?: string; branch?: string; avatar_url?: string };

function loadPhoto(src?: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    if (!src || typeof Image === 'undefined') return resolve(null);
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export function MarketingKit({ profile, url }: { profile: MarketingProfile; url: string }) {
  const [qr, setQr] = useState('');
  const [quote,setQuote]=useState({product:'Life insurance plan',sumAssured:'1000000',premium:'50000'});
  const [commission,setCommission]=useState({premium:'50000',rate:'20'});
  const [notice,setNotice]=useState('');
  useEffect(() => { QRCode.toDataURL(url, { width: 280, margin: 2, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr('')); }, [url]);
  function downloadVCard() {
    const lines = ['BEGIN:VCARD','VERSION:3.0',`FN:${profile.name || ''}`,`ORG:${BRAND.name}`,`TEL;TYPE=CELL:${profile.phone || ''}`,`EMAIL:${profile.email || ''}`,`URL:${url}`,
      ...(profile.avatar_url ? [`PHOTO;VALUE=URI:${profile.avatar_url}`] : []),`NOTE:${BRAND.trustBadge}${profile.license_no ? ` · License ${profile.license_no}` : ''}`,'END:VCARD'];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' })); a.download = 'learn-with-sulav-advisor.vcf'; a.click(); URL.revokeObjectURL(a.href);
  }
  async function downloadId() {
    const photo = await loadPhoto(profile.avatar_url);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [86, 54] });
    pdf.setFillColor(10, 79, 138); pdf.rect(0, 0, 86, 14, 'F');
    pdf.setFillColor(241, 90, 36); pdf.rect(0, 14, 86, 2, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(10); pdf.text('LEARN WITH SULAV', 5, 9);
    if (photo) pdf.addImage(photo, 4, 20, 20, 26, undefined, 'FAST');
    pdf.setTextColor(45, 55, 72); pdf.setFontSize(8); pdf.text(profile.name || 'Insurance Advisor', 27, 23, { maxWidth: 36 });
    pdf.setFontSize(5.5); pdf.text('Financial Advisor · Insurance Mentor', 27, 29, { maxWidth: 36 });
    if (profile.license_no) pdf.text(`License: ${profile.license_no}`, 27, 35, { maxWidth: 36 });
    if (profile.phone) pdf.text(`Phone: ${profile.phone}`, 27, 40, { maxWidth: 36 });
    if (profile.email) pdf.text(`Email: ${profile.email}`, 27, 45, { maxWidth: 36 });
    if (qr) pdf.addImage(qr, 'PNG', 64, 22, 17, 17);
    pdf.setFontSize(5.5); pdf.text('Scan to visit public portfolio', 63, 42);
    pdf.save('learn-with-sulav-agent-card.pdf');
  }
  async function downloadA4(){const photo=await loadPhoto(profile.avatar_url);const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});for(let n=0;n<8;n++){const x=n%2?109:15,y=12+Math.floor(n/2)*68;pdf.setFillColor(247,250,252);pdf.roundedRect(x,y,86,54,2,2,'F');pdf.setFillColor(10,79,138);pdf.rect(x,y,86,13,'F');pdf.setFillColor(241,90,36);pdf.rect(x,y+13,86,1.5,'F');pdf.setTextColor(255,255,255);pdf.setFontSize(8);pdf.text('LEARN WITH SULAV',x+4,y+8.5);if(photo)pdf.addImage(photo,x+4,y+19,17,23,undefined,'FAST');pdf.setTextColor(45,55,72);pdf.setFontSize(7);pdf.text(profile.name||'Insurance Advisor',x+24,y+22,{maxWidth:37});pdf.setFontSize(5.5);if(profile.license_no)pdf.text(`License: ${profile.license_no}`,x+24,y+28,{maxWidth:37});if(profile.phone)pdf.text(`Phone: ${profile.phone}`,x+24,y+34,{maxWidth:37});if(qr)pdf.addImage(qr,'PNG',x+65,y+19,16,16);pdf.setFontSize(4.8);pdf.text('Scan portfolio · Save contact',x+59,y+39,{maxWidth:25});pdf.setFontSize(4.5);pdf.text(BRAND.trustBadge,x+4,y+49,{maxWidth:78});}pdf.save('learn-with-sulav-a4-eight-agent-cards.pdf');}
  async function copyNfc(){try{await navigator.clipboard.writeText(url);setNotice('NFC profile link copied. Write this URL to an NFC tag.');}catch{setNotice(url);}}
  function shareQuote(){const text=`${profile.name||'Your insurance advisor'} · ${quote.product}\nSum assured: NPR ${Number(quote.sumAssured||0).toLocaleString()}\nIllustrative annual premium: NPR ${Number(quote.premium||0).toLocaleString()}\nPlease confirm final benefits and premium with the insurer.\n${url}`;window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');}
  function shareCommission(){const value=Number(commission.premium||0)*Number(commission.rate||0)/100;const text=`Commission estimate · ${profile.name||'Learn With Sulav advisor'}\nPremium basis: NPR ${Number(commission.premium||0).toLocaleString()}\nIllustrative rate: ${Number(commission.rate||0)}%\nGross estimate: NPR ${value.toLocaleString()}\nActual company rules and TDS may change the payable amount.\n${url}`;window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');}
  async function downloadBanner() {
    const photo = await loadPhoto(profile.avatar_url);
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#F7FAFC'; ctx.fillRect(0, 0, 1200, 630);
    ctx.fillStyle = '#0A4F8A'; ctx.fillRect(0, 0, 1200, 142);
    ctx.fillStyle = '#F15A24'; ctx.fillRect(0, 142, 1200, 12);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 38px sans-serif'; ctx.fillText(BRAND.name.toUpperCase(), 72, 91);
    ctx.fillStyle = '#F15A24'; ctx.fillRect(72, 203, 12, 210);
    ctx.fillStyle = '#2D3748'; ctx.font = 'bold 62px sans-serif'; ctx.fillText('Festival Greetings', 112, 266);
    ctx.font = '30px sans-serif'; ctx.fillText('Wishing you happiness, health and prosperity', 112, 326, 670);
    ctx.fillStyle = '#0A4F8A'; ctx.font = 'bold 38px sans-serif'; ctx.fillText(profile.name || 'Your Insurance Advisor', 112, 403, 670);
    ctx.fillStyle = '#2D3748'; ctx.font = '26px sans-serif';
    if (profile.phone) ctx.fillText(profile.phone, 112, 456);
    if (profile.email) ctx.fillText(profile.email, 112, 496, 680);
    ctx.fillStyle = '#F15A24'; ctx.fillRect(72, 571, 1056, 4);
    ctx.fillStyle = '#2D3748'; ctx.font = '16px sans-serif'; ctx.fillText(BRAND.trustBadge, 72, 605, 1056);
    if (photo) {
      ctx.save(); ctx.beginPath(); ctx.arc(930, 354, 174, 0, Math.PI * 2); ctx.clip();
      const scale = Math.max(348 / photo.width, 348 / photo.height);
      const w = photo.width * scale, h = photo.height * scale;
      ctx.drawImage(photo, 930 - w / 2, 354 - h / 2, w, h); ctx.restore();
      ctx.beginPath(); ctx.arc(930, 354, 178, 0, Math.PI * 2); ctx.lineWidth = 8; ctx.strokeStyle = '#F15A24'; ctx.stroke();
    }
    const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'learn-with-sulav-festival-greetings.png'; a.click();
  }
  return <Card className="grid gap-4 p-5"><div><h2 className="font-bold">Marketing kit</h2><p className="mt-1 text-sm text-slate-600">Download branded agent materials with your photo and contact details.</p>{!profile.avatar_url && <p className="mt-2 text-sm font-medium text-gold">Upload your agent photo in Profile to include it in marketing downloads.</p>}</div>
    <div className="flex flex-wrap items-center gap-4">{qr && <div className="grid justify-items-center gap-1"><img className="h-32 w-32" src={qr} alt="QR code for your public portfolio" /><span className="text-xs text-slate-500">Public portfolio QR</span></div>}<div className="flex flex-wrap gap-2"><Btn disabled={!profile.avatar_url} onClick={downloadId}>CR80 agent card PDF</Btn><Btn variant="ghost" disabled={!profile.avatar_url} onClick={downloadA4}>A4 sheet · 8 cards</Btn><Btn variant="ghost" disabled={!profile.avatar_url} onClick={downloadVCard}>Download contact (VCF)</Btn><Btn variant="ghost" disabled={!profile.avatar_url} onClick={copyNfc}>Copy NFC profile link</Btn><Btn variant="ghost" disabled={!profile.avatar_url} onClick={downloadBanner}>Festival banner</Btn></div></div>
    <div className="grid gap-3 border-t pt-4 md:grid-cols-2"><div className="grid gap-2"><h3 className="font-semibold">WhatsApp premium quotation</h3><Field label="Plan / product" value={quote.product} onChange={(e:any)=>setQuote({...quote,product:e.target.value})}/><Field label="Sum assured (NPR)" type="number" min="0" value={quote.sumAssured} onChange={(e:any)=>setQuote({...quote,sumAssured:e.target.value})}/><Field label="Illustrative annual premium (NPR)" type="number" min="0" value={quote.premium} onChange={(e:any)=>setQuote({...quote,premium:e.target.value})}/><Btn variant="ghost" onClick={shareQuote}>Share quotation on WhatsApp</Btn></div><div className="grid content-start gap-2"><h3 className="font-semibold">WhatsApp commission estimate</h3><Field label="Premium basis (NPR)" type="number" min="0" value={commission.premium} onChange={(e:any)=>setCommission({...commission,premium:e.target.value})}/><Field label="Illustrative commission rate (%)" type="number" min="0" max="100" step="0.01" value={commission.rate} onChange={(e:any)=>setCommission({...commission,rate:e.target.value})}/><p className="text-sm">Gross estimate: <b>NPR {(Number(commission.premium||0)*Number(commission.rate||0)/100).toLocaleString()}</b></p><Btn variant="ghost" onClick={shareCommission}>Share estimate on WhatsApp</Btn></div></div>
    {notice&&<p role="status" className="text-sm text-slate-600">{notice}</p>}
  </Card>;
}
