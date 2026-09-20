import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * A scannable QR of `value`, rendered to a data URL off the render path. The
 * codes are 1-bit by nature, so `pixelated` scaling keeps the modules crisp at
 * any size instead of letting the browser smear them — the same rule the icon
 * sprites follow.
 */
export const QrCode = ({ value, size = 160, className = "" }: { value: string; size?: number; className?: string }) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: "#000000", light: "#ffffff" } }).then(
      (url) => alive && setSrc(url),
      () => alive && setSrc(null),
    );
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (!src) return <div className="skeleton" style={{ width: size, height: size }} aria-hidden />;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="Wallet address QR code"
      className={`border border-line bg-white ${className}`}
      style={{ imageRendering: "pixelated" }}
    />
  );
};
