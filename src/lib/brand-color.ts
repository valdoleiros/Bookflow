// Converte a cor de marca escolhida pela barbearia (hex) nas variáveis CSS
// do tema. O tema (globals.css) define --primary/--primary-foreground como
// componentes HSL ("H S% L%"), por isso convertemos hex → HSL aqui e
// escolhemos um texto claro/escuro consoante a luminosidade da cor.

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null

  const r = parseInt(match[1].slice(0, 2), 16) / 255
  const g = parseInt(match[1].slice(2, 4), 16) / 255
  const b = parseInt(match[1].slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return { h: 0, s: 0, l: l * 100 }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case r: h = (g - b) / d + (g < b ? 6 : 0); break
    case g: h = (b - r) / d + 2; break
    default: h = (r - g) / d + 4
  }
  return { h: h * 60, s: s * 100, l: l * 100 }
}

/** CSS custom properties to override the theme's primary color for a single page/section. */
export function brandColorVars(hex: string | null | undefined): Record<string, string> | undefined {
  if (!hex) return undefined
  const hsl = hexToHsl(hex)
  if (!hsl) return undefined

  const h = Math.round(hsl.h)
  const s = Math.round(hsl.s)
  const l = Math.round(hsl.l)

  // Light brand colors get dark text on top, dark colors get light text —
  // matches the dark-theme foreground tones already used in globals.css.
  const foreground = l > 60 ? '0 0% 7%' : '0 0% 98%'

  return {
    '--primary': `${h} ${s}% ${l}%`,
    '--primary-foreground': foreground,
    '--ring': `${h} ${s}% ${l}%`,
  }
}
