import QRCode from 'qrcode';

// Draws the learner's details onto the supplied certificate template.
// Coordinates are in pixels of the 1754 x 1241 template (150 dpi A4 landscape).
const W = 1754;
const NAVY = '#0A4F8A';
const ORANGE = '#F15A24';
const BOX_BG = '#F7FAFC';
const TEMPLATE_BG = '#FFFFF7';
const DETAILS_BG = '#F7F5EE';

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
  g.globalAlpha = 0.14;
  g.drawImage(logo, 657 * k, 548 * k, 440 * k, 440 * k);
  g.restore();

  const cover = (x: number, y: number, w: number, h: number, color = BOX_BG) => { g.fillStyle = color; g.fillRect(x * k, y * k, w * k, h * k); };
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
  g.fillStyle = ORANGE;
  g.fillText(info.name, 877 * k, 522 * k);

  // Candidate metrics, unique certificate number, date, and outcome replace
  // the template's printed blanks.
  const percentage = info.max > 0 ? Math.round((info.score / info.max) * 100) : 0;
  // Clear the printed detail rows while retaining the template's blue frame.
  cover(194, 652, 1165, 140, DETAILS_BG);
  g.textAlign = 'left';
  g.font = `700 ${17 * k}px "Plus Jakarta Sans", Arial, sans-serif`;
  g.fillStyle = NAVY;
  g.fillText('Examination Details:', 220 * k, 678 * k);
  const rowFont = `400 ${17 * k}px "Plus Jakarta Sans", Arial, sans-serif`;
  const drawRow = (label: string, value: string, x: number, y: number, valueColor = ORANGE) => {
    g.textAlign = 'left';
    g.font = `700 ${17 * k}px "Plus Jakarta Sans", Arial, sans-serif`;
    g.fillStyle = NAVY;
    g.fillText(label, x * k, y * k);
    const labelWidth = g.measureText(label).width;
    g.font = rowFont;
    g.fillStyle = valueColor;
    g.fillText(value, x * k + labelWidth + 5 * k, y * k);
  };
  drawRow('Passing Score Achieved: ', `${info.score}/${info.max}  ·  ${percentage}%`, 220, 709);
  drawRow('Syllabus Covered: ', 'Nepal Insurance Authority (NIA) Licensing Guidelines, Insurance Act 2079, Underwriting & Claim Procedures', 220, 733, NAVY);
  drawRow('Certificate ID: ', info.certId, 220, 757);
  drawRow('Date of Issue: ', info.date, 220, 781);

  g.fillStyle = ORANGE;
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
  // Center the certificate number in the available gap between QR and
  // signature. Clear only the original legal line; preserve the template frame.
  cover(530, 1120, 694, 30, TEMPLATE_BG);
  cover(530, 1152, 694, 30, TEMPLATE_BG);
  g.textAlign = 'center';
  g.font = `700 ${16 * k}px "Plus Jakarta Sans", Arial, sans-serif`;
  const footerLabel = 'Certificate Code: ';
  const footerValue = info.certId;
  const labelWidth = g.measureText(footerLabel).width;
  const valueWidth = g.measureText(footerValue).width;
  const footerStart = (c.width - labelWidth - valueWidth) / 2;
  g.fillStyle = NAVY;
  g.textAlign = 'left';
  g.fillText(footerLabel, footerStart, 1142 * k);
  g.fillStyle = ORANGE;
  g.fillText(footerValue, footerStart + labelWidth, 1142 * k);
  // Repaint the legal registration notice above the bottom frame with clear
  // spacing from the certificate code, QR, and signature blocks.
  g.fillStyle = NAVY;
  g.textAlign = 'center';
  g.font = `400 ${10 * k}px "Plus Jakarta Sans", Arial, sans-serif`;
  g.fillText('This certificate is issued digitally by LearnWithSulav. Verify authority at learnwithsulav.com.np | For educational purposes only.', c.width / 2, 1165 * k);
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
