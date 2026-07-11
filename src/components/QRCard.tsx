import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QRCard({
  url,
  size = 512,
  className = "block w-full h-full",
}: {
  url: string;
  /** Rendering resolution in pixels — the canvas is scaled by CSS to fit its parent. */
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 1,
      color: { dark: "#0F3D2E", light: "#FFFFFF" },
    })
      .then(() => {
        // qrcode library sets inline width/height in px which breaks
        // responsive CSS sizing. Clear so w-full / h-full apply.
        canvas.style.width = "";
        canvas.style.height = "";
      })
      .catch(() => {});
  }, [url, size]);

  return <canvas ref={canvasRef} className={className} />;
}
