import qrcode from 'qrcode-generator'
import { useMemo } from 'react'

/** QR code of the room link, drawn as SVG squares (no image service: the link stays local). */
export function QrCode({ text, label }: { text: string; label: string }) {
  const cells = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(text)
    qr.make()
    const count = qr.getModuleCount()
    const dark: Array<[number, number]> = []
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) dark.push([c, r])
    return { count, dark }
  }, [text])
  const size = cells.count + 8
  return (
    <svg className="coop-qr" viewBox={`-4 -4 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect x={-4} y={-4} width={size} height={size} fill="#fff" />
      <path d={cells.dark.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join('')} fill="#000" />
    </svg>
  )
}
