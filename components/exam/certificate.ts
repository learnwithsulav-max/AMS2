// Draws the learner's details onto the supplied certificate template.
// Coordinates are in pixels of the 1754 x 1241 template (150 dpi A4 landscape).
const W = 1754;
const NAVY = '#1B3A73';
const BOX_BG = '#F7F5F0';

function load(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
}

export type CertInfo = { name: string; score: number; max: number; certId: string; date: string };

export async function renderCertificate(info: CertInfo) {
  const img = await load('/certificate-template.jpg');
  try { await (document as any).fonts?.ready; } catch {}
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d')!;
  const k = c.width / W;
  g.drawImage(img, 0, 0);

  const cover = (x: number, y: number, w: number, h: number) => { g.fillStyle = BOX_BG; g.fillRect(x * k, y * k, w * k, h * k); };
  g.fillStyle = NAVY;
  g.textBaseline = 'alphabetic';

  // Recipient name, centred on the line (shrinks to fit long names)
  let size = 50;
  const maxW = 640 * k;
  do { g.font = `700 ${size * k}px Georgia, "Noto Sans Devanagari", serif`; size -= 2; } while (g.measureText(info.name).width > maxW && size > 20);
  g.textAlign = 'center';
  g.fillText(info.name, 877 * k, 522 * k);

  g.font = `700 ${19 * k}px "Plus Jakarta Sans", Arial, sans-serif`;
  // Marks, certificate number and date replace the printed blanks
  cover(438, 694, 86, 28); g.textAlign = 'center'; g.fillText(String(info.score), 482 * k, 712 * k);
  g.textAlign = 'left';
  cover(450, 743, 150, 28); g.fillText(info.certId.replace('LWS-CERT-', ''), 454 * k, 762 * k);
  cover(352, 768, 150, 26); g.fillText(info.date, 356 * k, 787 * k);
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
