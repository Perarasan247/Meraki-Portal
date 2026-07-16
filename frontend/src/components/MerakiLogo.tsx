/**
 * Meraki "M" mark — a faceted green M built from four triangles (two lighter
 * outer faces + two darker inner folds for the 3D look).
 *
 * Single source of truth for the logo. To use the exact raster artwork instead,
 * drop it at `public/logo.png` and swap the <svg> below for:
 *   <img src="/logo.png" alt="Meraki" className={className} />
 */
export function MerakiLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 84"
      className={className}
      role="img"
      aria-label="Meraki"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* left mountain — outer face / inner fold */}
      <polygon points="8,74 34,12 64,74" fill="#16a34a" />
      <polygon points="34,12 64,46 64,74" fill="#166534" />
      {/* right mountain — outer face / inner fold */}
      <polygon points="120,74 94,12 64,74" fill="#22c55e" />
      <polygon points="94,12 64,46 64,74" fill="#15803d" />
    </svg>
  )
}
