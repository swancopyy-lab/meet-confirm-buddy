import QRCode from "qrcode";

export type ComposeOptions = {
  imageUrl?: string | null;
  scanUrl: string;
  number?: number | null;
  showNumber?: boolean;
  captionText?: string | null;
  nameText?: string | null;
  companionsText?: string | null;
  numberColor?: string | null;
  textColor?: string | null;
  fontFamily?: string | null;
  align?: "left" | "center" | "right" | null;
  fontWeight?: number | null;
  fontSize?: number | null;
  showBox?: boolean;
  captionX?: number | null;
  captionY?: number | null;
  qrX?: number | null;
  qrY?: number | null;
  qrSize?: number | null;
  qrColor?: string | null;
  qrBgColor?: string | null;
  qrEcc?: "L" | "M" | "Q" | "H" | null;
  qrMargin?: number | null;
};

/** Draws the full invitation image with QR + caption/number/companions burned in. */
export async function composeInvitationImage(o: ComposeOptions): Promise<string> {
  const showNumber = !!o.showNumber && o.number != null;
  const showBox = o.showBox !== false;
  const captionText = (o.captionText || "").trim();
  const companionsText = (o.companionsText || "").trim();
  const numberColor = o.numberColor || "#111111";
  const textColor = o.textColor || "#111111";
  const fontFamily = o.fontFamily || "sans-serif";
  const align = (o.align || "center") as "left" | "center" | "right";
  const weight = o.fontWeight || 600;
  const qrDark = o.qrColor || "#0F3D2E";
  const qrLight = o.qrBgColor || "#FFFFFF";
  const qrEcc = (o.qrEcc || "M") as "L" | "M" | "Q" | "H";
  const qrMargin = Number.isFinite(o.qrMargin as number) ? (o.qrMargin as number) : 1;
  const baseFontSize = Number(o.fontSize ?? 28);

  if (!o.imageUrl) {
    const canvas = document.createElement("canvas");
    const size = 900;
    canvas.width = size;
    canvas.height = size + 260;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, o.scanUrl, {
      width: size,
      margin: qrMargin,
      errorCorrectionLevel: qrEcc,
      color: { dark: qrDark, light: qrLight },
    });
    ctx.drawImage(qrCanvas, 0, 0, size, size);
    ctx.textAlign = "center";
    let y = size + 20;
    if (showNumber) {
      ctx.fillStyle = numberColor;
      ctx.font = `bold 72px ${fontFamily}`;
      ctx.fillText(String(o.number), size / 2, y + 60);
      y += 90;
    }
    if (captionText) {
      ctx.fillStyle = textColor;
      ctx.font = `${weight} 48px ${fontFamily}`;
      ctx.fillText(captionText, size / 2, y + 40);
      y += 70;
    }
    if (companionsText) {
      ctx.fillStyle = textColor;
      ctx.font = `${weight} 40px ${fontFamily}`;
      ctx.fillText(companionsText, size / 2, y + 40);
    }
    return canvas.toDataURL("image/png");
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("تعذّر تحميل صورة الدعوة"));
    img.src = o.imageUrl as string;
  });
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const qrSizePx = (Number(o.qrSize ?? 22) / 100) * w;
  const qrCx = (Number(o.qrX ?? 50) / 100) * w;
  const qrCy = (Number(o.qrY ?? 80) / 100) * h;
  const qrX = qrCx - qrSizePx / 2;
  const qrY = qrCy - qrSizePx / 2;
  const pad = qrSizePx * 0.06;

  ctx.fillStyle = qrLight;
  ctx.fillRect(qrX - pad, qrY - pad, qrSizePx + pad * 2, qrSizePx + pad * 2);

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, o.scanUrl, {
    width: Math.max(256, Math.round(qrSizePx)),
    margin: qrMargin,
    errorCorrectionLevel: qrEcc,
    color: { dark: qrDark, light: qrLight },
  });
  ctx.drawImage(qrCanvas, qrX, qrY, qrSizePx, qrSizePx);

  const numberFontSize = Math.max(14, Math.round(qrSizePx * (baseFontSize / 100)));
  const textFontSize = Math.max(14, Math.round(qrSizePx * (baseFontSize / 100) * 0.9));
  const capCx = (Number(o.captionX ?? 50) / 100) * w;
  const capCy = (Number(o.captionY ?? 92) / 100) * h;
  ctx.textAlign = align === "left" ? "left" : align === "right" ? "right" : "center";
  ctx.textBaseline = "middle";

  const lines: Array<{ text: string; color: string; size: number; weight: number | "bold" }> = [];
  if (showNumber) lines.push({ text: String(o.number), color: numberColor, size: numberFontSize, weight: "bold" });
  if (captionText) lines.push({ text: captionText, color: textColor, size: textFontSize, weight });
  if (companionsText)
    lines.push({ text: companionsText, color: textColor, size: Math.round(textFontSize * 0.85), weight });

  if (lines.length > 0) {
    const gap = 8;
    const totalH = lines.reduce((s, l) => s + l.size + gap, -gap);
    let cy = capCy - totalH / 2 + lines[0].size / 2;
    for (const l of lines) {
      ctx.font = `${l.weight} ${l.size}px ${fontFamily}`;
      if (showBox) {
        const tw = ctx.measureText(l.text).width;
        const padX = 12;
        const padY = 6;
        const boxW = tw + padX * 2;
        const boxH = l.size + padY * 2;
        const boxX = align === "left" ? capCx : align === "right" ? capCx - boxW : capCx - boxW / 2;
        const boxY = cy - boxH / 2;
        ctx.fillStyle = "#fff";
        ctx.fillRect(boxX, boxY, boxW, boxH);
      }
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, capCx, cy);
      cy += l.size + gap;
    }
  }

  return canvas.toDataURL("image/png");
}

export function companionsLabel(status: string | null | undefined, companions: number | null | undefined): string {
  if (status !== "attending") return "";
  const c = Number(companions || 0);
  if (c <= 0) return "بدون مرافقين";
  return `عدد المرافقين: ${c}`;
}
