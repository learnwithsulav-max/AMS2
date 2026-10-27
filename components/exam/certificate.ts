import QRCode from 'qrcode';

// Draws the learner's details onto the supplied certificate template.
// Coordinates are in pixels of the 1754 x 1241 template (150 dpi A4 landscape).
const W = 1754;
const NAVY = '#0A4F8A';
const BOX_BG = '#F7FAFC';

function load(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
}

export type CertInfo = { name: string; score: number; max: number; certId: string; date: string; passed: boolean };

export async function renderCertificate(info: CertInfo) {
  const [img, logo, qrData] = await Promise.all([
    load('/certificate-template.jpg'),
    load('/logo.png'),
    QRCode.toDataURL('https://sulavs.com.np', { width: 320, margin: 1, errorCorrectionLevel: 'H' }),
  ]);
  const qr = await load(qrData);
  try { await (document as any).fonts?.ready; } catch {}
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d')!;
  const k = c.width / W;
  g.drawImage(img, 0, 0);

  g.save();
  g.globalAlpha = 0.08;
  g.drawImage(logo, 700 * k, 600 * k, 354 * k, 354 * k);
  g.restore();

  const cover = (x: number, y: number, w: number, h: number) => { g.fillStyle = BOX_BG; g.fillRect(x * k, y * k, w * k, h * k); };
  g.fillStyle = NAVY;
  g.textBaseline = 'alphabetic';

  // Replace the template's pass-only wording with a neutral result certificate.
  cover(438, 344, 878, 84);
  g.fillStyle = NAVY;
  g.textAlign = 'center';
  g.font = `700 ${48 * k}px Georgia, serif`;
  g.fillText('OFFICIAL EXAM CERTIFICATE', 877 * k, 402 * k);
  cover(540, 433, 674, 49);
  g.font = `400 ${23 * k}px Arial, sans-serif`;
  g.fillText('Verified candidate examination result', 877 * k, 466 * k);
  cover(510, 550, 734, 72);
  g.font = `400 ${21 * k}px Arial, sans-serif`;
  g.fillText('Life Insurance Agent Practice Examination', 877 * k, 584 * k);
  g.font = `400 ${17 * k}px Arial, sans-serif`;
  g.fillText('Learn With Sulav · Official digital result', 877 * k, 610 * k);

  // Recipient name, centred on the line (shrinks to fit long names)
  let size = 50;
  const maxW = 640 * k;
  do { g.font = `700 ${size * k}px Georgia, "Noto Sans Devanagari", serif`; size -= 2; } while (g.measureText(info.name).width > maxW && size > 20);
  g.textAlign = 'center';
  g.fillText(info.name, 877 * k, 522 * k);

  g.font = `700 ${19 * k}px "Plus Jakarta Sans", Arial, sans-serif`;
  // Candidate metrics, unique certificate number, date, and outcome replace
  // the template's printed blanks.
  const percentage = info.max > 0 ? Math.round((info.score / info.max) * 100) : 0;
  cover(438, 694, 270, 28); g.textAlign = 'center'; g.fillText(`${info.score}/${info.max}  ·  ${percentage}%`, 573 * k, 712 * k);
  g.textAlign = 'left';
  cover(450, 743, 300, 28); g.fillText(info.certId, 454 * k, 762 * k);
  cover(352, 768, 150, 26); g.fillText(info.date, 356 * k, 787 * k);

  const statusColor = info.passed ? '#15803D' : '#B91C1C';
  g.fillStyle = statusColor;
  g.beginPath();
  g.roundRect(1372 * k, 680 * k, 158 * k, 48 * k, 10 * k);
  g.fill();
  g.fillStyle = '#FFFFFF';
  g.textAlign = 'center';
  g.font = `700 ${25 * k}px "Plus Jakarta Sans", Arial, sans-serif`;
  g.fillText(info.passed ? 'PASS' : 'FAIL', 1451 * k, 712 * k);

  // Replace the printed stamp with a scannable ecosystem verification QR.
  cover(170, 888, 255, 235);
  g.drawImage(qr, 202 * k, 895 * k, 190 * k, 190 * k);
  g.fillStyle = NAVY;
  g.textAlign = 'center';
  g.font = `700 ${15 * k}px "Plus Jakarta Sans", Arial, sans-serif`;
  g.fillText('SCAN TO VERIFY', 297 * k, 1110 * k);
  g.fillStyle = NAVY;
  g.textAlign = 'center';
  g.font = `700 ${18 * k}px "Plus Jakarta Sans", Arial, sans-serif`;
  g.fillText(`Registration / Certificate Code: ${info.certId}`, c.width / 2, 1200 * k);
  return c;
}

export function downloadPng(c: HTMLCanvasElement, name: string) {
  c.toBlob((b) => {
    if (!b) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${name}.png`; a.click();
    URL.revokeObjectURL(a.href);
  });
}

export async function downloadPdf(c: HTMLCanvasElement, name: string) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [c.width, c.height] });
  pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, c.width, c.height);
  pdf.save(`${name}.pdf`);
}
