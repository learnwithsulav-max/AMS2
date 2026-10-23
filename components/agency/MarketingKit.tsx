'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Btn, Card, Field } from '../ui';
import { BRAND } from '@/lib/brand';
import { getTodayGreeting, adToBs } from '@/lib/nepali-date';

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
  const [quote, setQuote] = useState({ product: 'Life insurance plan', sumAssured: '1000000', premium: '50000' });
  const [commission, setCommission] = useState({ premium: '50000', rate: '20' });
  const [notice, setNotice] = useState('');

  const todayGreeting = getTodayGreeting();
  const bsToday = adToBs();
  const [customGreetingTitle, setCustomGreetingTitle] = useState(todayGreeting.title);
  const [customGreetingMsg, setCustomGreetingMsg] = useState(todayGreeting.message);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 280, margin: 2, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(''));
  }, [url]);

  function downloadVCard() {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${profile.name || 'Insurance Advisor'}`,
      `ORG:${BRAND.name}`,
      `TITLE:Certified Financial Advisor & Insurance Mentor`,
      `TEL;TYPE=CELL:${profile.phone || ''}`,
      `EMAIL:${profile.email || ''}`,
      `URL:${url}`,
      `LOGO;VALUE=URI:https://sulavs.com.np/logo.png`,
      ...(profile.avatar_url ? [`PHOTO;VALUE=URI:${profile.avatar_url}`] : []),
      `NOTE:${BRAND.trustBadge}${profile.license_no ? ` · License ${profile.license_no}` : ''}${profile.branch ? ` · Branch ${profile.branch}` : ''}`,
      'END:VCARD',
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' }));
    a.download = `${(profile.name || 'advisor').replace(/\s+/g, '-').toLowerCase()}-contact.vcf`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function downloadId() {
    const [photo, logo] = await Promise.all([
      loadPhoto(profile.avatar_url),
      loadPhoto('/logo.png'),
    ]);

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [86, 54] });
    pdf.setFillColor(10, 79, 138);
    pdf.rect(0, 0, 86, 14, 'F');
    pdf.setFillColor(241, 90, 36);
    pdf.rect(0, 14, 86, 2, 'F');

    // Official Logo on ID Card
    if (logo) {
      pdf.addImage(logo, 'PNG', 3, 2, 10, 10);
    }
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LEARN WITH SULAV', logo ? 15 : 5, 8.5);
    pdf.setFontSize(5);
    pdf.text('Financial Advisory & Mentorship Portal', logo ? 15 : 5, 11.5);

    if (photo) pdf.addImage(photo, 4, 19, 19, 25, undefined, 'FAST');
    pdf.setTextColor(45, 55, 72);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text(profile.name || 'Insurance Advisor', 26, 22, { maxWidth: 38 });
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Financial Advisor · Insurance Coach', 26, 27, { maxWidth: 38 });
    if (profile.license_no) pdf.text(`License No: ${profile.license_no}`, 26, 32, { maxWidth: 38 });
    if (profile.branch) pdf.text(`Branch: ${profile.branch}`, 26, 36, { maxWidth: 38 });
    if (profile.phone) pdf.text(`Phone: ${profile.phone}`, 26, 40, { maxWidth: 38 });
    if (profile.email) pdf.text(`Email: ${profile.email}`, 26, 44, { maxWidth: 38 });

    if (qr) pdf.addImage(qr, 'PNG', 65, 20, 16, 16);
    pdf.setFontSize(4.5);
    pdf.text('Scan for verified portfolio', 63, 39);
    pdf.text(BRAND.trustBadge, 4, 51, { maxWidth: 78 });

    pdf.save('learn-with-sulav-agent-card.pdf');
  }

  async function downloadA4() {
    const [photo, logo] = await Promise.all([
      loadPhoto(profile.avatar_url),
      loadPhoto('/logo.png'),
    ]);

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    for (let n = 0; n < 8; n++) {
      const x = n % 2 ? 109 : 15,
        y = 12 + Math.floor(n / 2) * 68;
      pdf.setFillColor(247, 250, 252);
      pdf.roundedRect(x, y, 86, 54, 2, 2, 'F');
      pdf.setFillColor(10, 79, 138);
      pdf.rect(x, y, 86, 13, 'F');
      pdf.setFillColor(241, 90, 36);
      pdf.rect(x, y + 13, 86, 1.5, 'F');

      if (logo) {
        pdf.addImage(logo, 'PNG', x + 3, y + 1.5, 9, 9);
      }
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('LEARN WITH SULAV', x + (logo ? 14 : 4), y + 7.5);

      if (photo) pdf.addImage(photo, x + 4, y + 18, 17, 23, undefined, 'FAST');
      pdf.setTextColor(45, 55, 72);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(profile.name || 'Insurance Advisor', x + 24, y + 21, { maxWidth: 37 });
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'normal');
      if (profile.license_no) pdf.text(`License: ${profile.license_no}`, x + 24, y + 26, { maxWidth: 37 });
      if (profile.branch) pdf.text(`Branch: ${profile.branch}`, x + 24, y + 30, { maxWidth: 37 });
      if (profile.phone) pdf.text(`Phone: ${profile.phone}`, x + 24, y + 34, { maxWidth: 37 });

      if (qr) pdf.addImage(qr, 'PNG', x + 65, y + 18, 16, 16);
      pdf.setFontSize(4.5);
      pdf.text('Scan portfolio & contact', x + 61, y + 37, { maxWidth: 24 });
      pdf.text(BRAND.trustBadge, x + 4, y + 49, { maxWidth: 78 });
    }
    pdf.save('learn-with-sulav-a4-eight-cards.pdf');
  }

  async function copyNfc() {
    try {
      await navigator.clipboard.writeText(url);
      setNotice('NFC Profile URL copied to clipboard! You can now write this URL to an NFC card/tag.');
    } catch {
      setNotice(url);
    }
  }

  function shareQuote() {
    const text = `*Learn With Sulav · Life Insurance Quotation*\n\nAdvisor: ${profile.name || 'Your Financial Advisor'}\nPlan: ${quote.product}\nSum Assured: NPR ${Number(quote.sumAssured || 0).toLocaleString()}\nEstimated Annual Premium: NPR ${Number(quote.premium || 0).toLocaleString()}\n\nVerified Public Profile: ${url}\n\n_Note: Please confirm final underwriting terms with the insurance company._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  function shareCommission() {
    const value = (Number(commission.premium || 0) * Number(commission.rate || 0)) / 100;
    const text = `*Learn With Sulav · Commission Projection*\n\nAdvisor: ${profile.name || 'Learn With Sulav Advisor'}\nPremium: NPR ${Number(commission.premium || 0).toLocaleString()}\nRate: ${Number(commission.rate || 0)}%\nGross Estimate: NPR ${value.toLocaleString()}\n\nOfficial Portal: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  // Dynamic Real-time Nepal Special Day / Festival Banner with LearnWithSulav Logo
  async function downloadBanner() {
    const [photo, logo] = await Promise.all([
      loadPhoto(profile.avatar_url),
      loadPhoto('/logo.png'),
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#F7FAFC';
    ctx.fillRect(0, 0, 1200, 630);

    // Top Bar Navy
    ctx.fillStyle = '#0A4F8A';
    ctx.fillRect(0, 0, 1200, 140);

    // Gold separator stripe
    ctx.fillStyle = '#F15A24';
    ctx.fillRect(0, 140, 1200, 12);

    // Official Logo on Header
    if (logo) {
      ctx.drawImage(logo, 60, 20, 100, 100);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('LEARN WITH SULAV', 180, 75);
      ctx.font = '20px sans-serif';
      ctx.fillText('Smart Tools, Training & Mentorship for Insurance Advisors', 180, 105);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText(BRAND.name.toUpperCase(), 72, 90);
    }

    // Occasion / Greeting Date Tag
    ctx.fillStyle = '#F15A24';
    ctx.fillRect(72, 180, 10, 240);

    ctx.fillStyle = '#0A4F8A';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`${bsToday.formattedBsNe} · ${todayGreeting.occasion}`, 96, 210);

    // Main Dynamic Greeting Title
    ctx.fillStyle = '#2D3748';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(customGreetingTitle || todayGreeting.title, 96, 270, 700);

    // Message
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#4A5568';
    ctx.fillText(customGreetingMsg || todayGreeting.message, 96, 330, 680);

    // Advisor Info Block
    ctx.fillStyle = '#0A4F8A';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(profile.name || 'Your Certified Insurance Advisor', 96, 420, 680);

    ctx.fillStyle = '#2D3748';
    ctx.font = '22px sans-serif';
    if (profile.branch) ctx.fillText(`Branch: ${profile.branch}`, 96, 460);
    if (profile.phone) ctx.fillText(`Mobile: ${profile.phone}`, 96, 495);
    if (profile.email) ctx.fillText(`Email: ${profile.email}`, 96, 530, 680);

    // Bottom gold stripe & trust badge
    ctx.fillStyle = '#F15A24';
    ctx.fillRect(72, 575, 1056, 4);
    ctx.fillStyle = '#718096';
    ctx.font = '16px sans-serif';
    ctx.fillText(BRAND.trustBadge, 72, 608, 1056);

    // Profile Photo in decorative circular frame
    if (photo) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(960, 360, 150, 0, Math.PI * 2);
      ctx.clip();
      const scale = Math.max(300 / photo.width, 300 / photo.height);
      const w = photo.width * scale,
        h = photo.height * scale;
      ctx.drawImage(photo, 960 - w / 2, 360 - h / 2, w, h);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(960, 360, 154, 0, Math.PI * 2);
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#F15A24';
      ctx.stroke();
    }

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `lws-greeting-banner-${todayGreeting.badge.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  }

  return (
    <Card className="grid gap-6 p-6">
      <div>
        <h2 className="text-xl font-bold text-[#0A4F8A]">Advisor Marketing & Branding Kit</h2>
        <p className="mt-1 text-sm text-slate-600">
          Generate branded ID cards, vCard contacts, NFC links, and real-time Nepali festival & daily greeting banners with official Learn With Sulav branding.
        </p>
        {!profile.avatar_url && (
          <p className="mt-2 text-sm font-semibold text-[#F15A24]">
            Note: Upload your advisor photo in Profile to automatically embed it in all marketing materials.
          </p>
        )}
      </div>

      {/* Dynamic Festival / Daily Greeting Setup */}
      <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded bg-[#F15A24] px-2 py-0.5 text-xs font-bold text-white uppercase">
            {todayGreeting.badge}
          </span>
          <span className="text-xs font-medium text-slate-600">
            {bsToday.formattedBsNe}
          </span>
        </div>
        <h3 className="font-bold text-slate-900 text-base">
          Real-time Nepal Special Day & Festival Greeting Banner
        </h3>
        <p className="text-xs text-slate-600 mt-1 mb-4">
          The greeting banner dynamically updates for Dashain, Tihar, Chhath, Maghe Sankranti, Shivaratri, Holi, New Year, or daily inspirational client greetings. You can also customize the text below:
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Greeting Headline"
            value={customGreetingTitle}
            onChange={(e: any) => setCustomGreetingTitle(e.target.value)}
          />
          <Field
            label="Greeting Message"
            value={customGreetingMsg}
            onChange={(e: any) => setCustomGreetingMsg(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        {qr && (
          <div className="grid justify-items-center gap-1.5 p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
            <img className="h-28 w-28" src={qr} alt="Public portfolio QR" />
            <span className="text-[11px] font-semibold text-slate-500">Public Portfolio QR</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2.5">
          <Btn onClick={downloadBanner}>Download Greeting Banner (PNG)</Btn>
          <Btn variant="ghost" onClick={downloadId}>
            CR80 Visiting Card PDF
          </Btn>
          <Btn variant="ghost" onClick={downloadA4}>
            A4 Sheet (8 Visiting Cards)
          </Btn>
          <Btn variant="ghost" onClick={downloadVCard}>
            Download Digital Contact (vCard)
          </Btn>
          <Btn variant="ghost" onClick={copyNfc}>
            Copy NFC Link
          </Btn>
        </div>
      </div>

      {/* Quotation & WhatsApp Sharing */}
      <div className="grid gap-4 border-t pt-5 md:grid-cols-2">
        <div className="grid gap-2.5 rounded-lg border border-slate-200 p-4 bg-slate-50/50">
          <h3 className="font-bold text-slate-900">WhatsApp Premium Quotation</h3>
          <Field label="Plan / Product" value={quote.product} onChange={(e: any) => setQuote({ ...quote, product: e.target.value })} />
          <Field label="Sum Assured (NPR)" type="number" min="0" value={quote.sumAssured} onChange={(e: any) => setQuote({ ...quote, sumAssured: e.target.value })} />
          <Field label="Illustrative Annual Premium (NPR)" type="number" min="0" value={quote.premium} onChange={(e: any) => setQuote({ ...quote, premium: e.target.value })} />
          <Btn variant="ghost" onClick={shareQuote}>Share Quotation on WhatsApp</Btn>
        </div>

        <div className="grid content-start gap-2.5 rounded-lg border border-slate-200 p-4 bg-slate-50/50">
          <h3 className="font-bold text-slate-900">WhatsApp Commission Estimate</h3>
          <Field label="Premium Basis (NPR)" type="number" min="0" value={commission.premium} onChange={(e: any) => setCommission({ ...commission, premium: e.target.value })} />
          <Field label="Illustrative Commission Rate (%)" type="number" min="0" max="100" step="0.01" value={commission.rate} onChange={(e: any) => setCommission({ ...commission, rate: e.target.value })} />
          <p className="text-sm font-semibold text-[#0A4F8A]">
            Gross Estimate: NPR {((Number(commission.premium || 0) * Number(commission.rate || 0)) / 100).toLocaleString()}
          </p>
          <Btn variant="ghost" onClick={shareCommission}>Share Estimate on WhatsApp</Btn>
        </div>
      </div>

      {notice && <p role="status" className="text-sm text-emerald-800 font-medium bg-emerald-50 p-3 rounded-lg border border-emerald-200">{notice}</p>}
    </Card>
  );
}
