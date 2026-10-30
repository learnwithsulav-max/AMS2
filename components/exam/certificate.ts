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
  c.width = W; c.height = 1241;
  const g = c.getContext('2d')!;
  const k = c.width / W;
  // New, independent Learn With Sulav design. Do not reuse the old template's
  // NIA-style seal or official-licensing claims.
  g.fillStyle = BOX_BG; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#FFFFFF'; g.beginPath(); g.roundRect(34 * k, 34 * k, 1686 * k, 1173 * k, 24 * k); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 8 * k; g.strokeRect(44 * k, 44 * k, 1666 * k, 1153 * k);
  g.strokeStyle = '#D4B64C'; g.lineWidth = 2 * k; g.strokeRect(58 * k, 58 * k, 1638 * k, 1125 * k);

  g.save(); g.globalAlpha = 0.075; g.drawImage(logo, 657 * k, 475 * k, 440 * k, 440 * k); g.restore();
  g.drawImage(logo, 784 * k, 75 * k, 186 * k, 148 * k);
  g.fillStyle = NAVY; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `700 ${25 * k}px Arial, sans-serif`; g.fillText('LEARN WITH SULAV', 877 * k, 251 * k);
  g.fillStyle = ORANGE; g.font = `400 ${17 * k}px Arial, sans-serif`; g.fillText('INDEPENDENT INSURANCE PRACTICE', 877 * k, 278 * k);
  g.strokeStyle = '#D4B64C'; g.lineWidth = 3 * k; g.beginPath(); g.moveTo(412 * k, 300 * k); g.lineTo(1342 * k, 300 * k); g.stroke();

  g.fillStyle = NAVY; g.font = `700 ${43 * k}px Georgia, serif`; g.fillText('PRACTICE EXAM RESULT CERTIFICATE', 877 * k, 365 * k);
  g.fillStyle = '#526273'; g.font = `400 ${19 * k}px Arial, sans-serif`; g.fillText('Presented to', 877 * k, 414 * k);
  let size = 51;
  do { g.font = `700 ${size * k}px Georgia, "Noto Sans Devanagari", serif`; size -= 2; } while (g.measureText(info.name).width > 1050 * k && size > 22);
  g.fillStyle = ORANGE; g.fillText(info.name, 877 * k, 485 * k);
  g.strokeStyle = ORANGE; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(490 * k, 506 * k); g.lineTo(1264 * k, 506 * k); g.stroke();
  g.fillStyle = '#526273'; g.font = `400 ${18 * k}px Arial, sans-serif`; g.fillText('for completing a Learn With Sulav mixed insurance practice assessment', 877 * k, 543 * k);

  const percentage = info.max > 0 ? Math.round((info.score / info.max) * 100) : 0;
  g.fillStyle = DETAILS_BG; g.beginPath(); g.roundRect(190 * k, 590 * k, 1374 * k, 185 * k, 18 * k); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 2 * k; g.stroke();
  const stat = (x: number, label: string, value: string, width: number) => {
    g.textAlign = 'center'; g.fillStyle = NAVY; g.font = `700 ${16 * k}px Arial, sans-serif`; g.fillText(label, x * k, 638 * k);
    g.fillStyle = ORANGE; g.font = `700 ${25 * k}px Arial, sans-serif`;
    let fontSize = 25; while (g.measureText(value).width > width * k && fontSize > 15) { fontSize--; g.font = `700 ${fontSize * k}px Arial, sans-serif`; }
    g.fillText(value, x * k, 683 * k);
  };
  stat(425, 'SCORE', `${info.score} / ${info.max}  ·  ${percentage}%`, 330);
  stat(877, 'CERTIFICATE ID', info.certId, 440);
  stat(1329, 'DATE ISSUED', info.date, 330);
  g.fillStyle = ORANGE; g.beginPath(); g.roundRect(758 * k, 714 * k, 238 * k, 48 * k, 12 * k); g.fill();
  g.fillStyle = '#FFFFFF'; g.font = `700 ${24 * k}px Arial, sans-serif`; g.textAlign = 'center'; g.fillText(info.passed ? 'PASS' : 'FAIL', 877 * k, 746 * k);

  g.fillStyle = '#FFFFFF'; g.beginPath(); g.roundRect(150 * k, 826 * k, 282 * k, 282 * k, 16 * k); g.fill();
  g.strokeStyle = '#D9E2EC'; g.lineWidth = 2 * k; g.stroke();
  g.drawImage(qr, 178 * k, 847 * k, 226 * k, 226 * k);
  g.fillStyle = NAVY; g.font = `700 ${14 * k}px Arial, sans-serif`; g.fillText('SCAN TO VISIT SULAVS.COM.NP', 291 * k, 1091 * k);

  // The signature is Sulav Sapkota's brand signature, never an NIA seal.
  g.drawImage(img, 1288 * k, 925 * k, 330 * k, 100 * k, 1288 * k, 925 * k, 330 * k, 100 * k);
  g.strokeStyle = NAVY; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(1270 * k, 1046 * k); g.lineTo(1590 * k, 1046 * k); g.stroke();
  g.fillStyle = NAVY; g.font = `700 ${18 * k}px Arial, sans-serif`; g.fillText('Sulav Sapkota', 1430 * k, 1075 * k);
  g.fillStyle = '#526273'; g.font = `400 ${14 * k}px Arial, sans-serif`; g.fillText('Founder · Learn With Sulav', 1430 * k, 1098 * k);

  g.strokeStyle = '#D9E2EC'; g.lineWidth = 1 * k; g.beginPath(); g.moveTo(510 * k, 1135 * k); g.lineTo(1244 * k, 1135 * k); g.stroke();
  g.fillStyle = '#526273'; g.font = `400 ${12 * k}px Arial, sans-serif`;
  g.fillText('This is a practice result issued by Learn With Sulav, an independent educational platform.', 877 * k, 1157 * k);
  g.fillText('It is not an NIA licence, official examination result, or endorsement by the Nepal Insurance Authority.', 877 * k, 1175 * k);
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
