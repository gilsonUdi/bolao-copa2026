// Mapeamento país → código ISO para bandeiras (flagcdn.com)
export const PAISES: Record<string, string> = {
  // Grupo A
  'México': 'mx', 'Equador': 'ec', 'Honduras': 'hn', 'Jamaica': 'jm',
  // Grupo B
  'Argentina': 'ar', 'Chile': 'cl', 'Peru': 'pe', 'Canadá': 'ca',
  // Grupo C
  'EUA': 'us', 'Estados Unidos': 'us', 'Panamá': 'pa', 'Uruguai': 'uy', 'Bolivia': 'bo',
  // Grupo D
  'França': 'fr', 'Tunísia': 'tn', 'Polônia': 'pl', 'Arabia Saudita': 'sa',
  // Grupo E
  'Brasil': 'br', 'Japão': 'jp', 'Suíça': 'ch', 'Camarões': 'cm',
  // Grupo F
  'Espanha': 'es', 'Coreia do Sul': 'kr', 'Romênia': 'ro', 'Burkina Faso': 'bf',
  // Grupo G
  'Alemanha': 'de', 'Colômbia': 'co', 'Argélia': 'dz', 'Qatar': 'qa',
  // Grupo H
  'Portugal': 'pt', 'Dinamarca': 'dk', 'Nigeria': 'ng', 'Venezuela': 've',
  // Grupo I
  'Noruega': 'no', 'Senegal': 'sn', 'Iraque': 'iq',
  'Holanda': 'nl', 'Austrália': 'au', 'RD Congo': 'cd',
  // Grupo J
  'Áustria': 'at', 'Jordânia': 'jo',
  'Inglaterra': 'gb-eng', 'Costa Rica': 'cr', 'Iran': 'ir', 'Eslovênia': 'si',
  // Grupo K
  'Marrocos': 'ma', 'Gana': 'gh', 'Austria': 'at', 'Zambia': 'zm',
  // Grupo L
  'Bélgica': 'be', 'Croácia': 'hr', 'Kenya': 'ke',
  // Fase eliminatória / outros
  'Escócia': 'gb-sct', 'Haiti': 'ht', 'Suécia': 'se',
  'Turquia': 'tr', 'Ucrânia': 'ua', 'Sérvia': 'rs', 'Islândia': 'is',
};

export function getBandeira(pais: string): string {
  const code = PAISES[pais];
  if (!code) return '';
  return `https://flagcdn.com/w40/${code}.png`;
}

// Emojis de bandeira como fallback
export const EMOJI_BANDEIRAS: Record<string, string> = {
  'México': '🇲🇽', 'Equador': '🇪🇨', 'Honduras': '🇭🇳', 'Jamaica': '🇯🇲',
  'Argentina': '🇦🇷', 'Chile': '🇨🇱', 'Peru': '🇵🇪', 'Canadá': '🇨🇦',
  'EUA': '🇺🇸', 'Estados Unidos': '🇺🇸', 'Panamá': '🇵🇦', 'Uruguai': '🇺🇾', 'Bolivia': '🇧🇴',
  'França': '🇫🇷', 'Tunísia': '🇹🇳', 'Polônia': '🇵🇱', 'Arabia Saudita': '🇸🇦',
  'Brasil': '🇧🇷', 'Japão': '🇯🇵', 'Suíça': '🇨🇭', 'Camarões': '🇨🇲',
  'Espanha': '🇪🇸', 'Coreia do Sul': '🇰🇷', 'Romênia': '🇷🇴', 'Burkina Faso': '🇧🇫',
  'Alemanha': '🇩🇪', 'Colômbia': '🇨🇴', 'Argélia': '🇩🇿', 'Qatar': '🇶🇦',
  'Portugal': '🇵🇹', 'Dinamarca': '🇩🇰', 'Nigeria': '🇳🇬', 'Venezuela': '🇻🇪',
  'Noruega': '🇳🇴', 'Senegal': '🇸🇳', 'Iraque': '🇮🇶',
  'Holanda': '🇳🇱', 'Austrália': '🇦🇺', 'RD Congo': '🇨🇩',
  'Áustria': '🇦🇹', 'Jordânia': '🇯🇴',
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Costa Rica': '🇨🇷', 'Iran': '🇮🇷', 'Eslovênia': '🇸🇮',
  'Marrocos': '🇲🇦', 'Gana': '🇬🇭', 'Austria': '🇦🇹', 'Zambia': '🇿🇲',
  'Bélgica': '🇧🇪', 'Croácia': '🇭🇷', 'Kenya': '🇰🇪',
  'Escócia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Haiti': '🇭🇹', 'Suécia': '🇸🇪',
  'Turquia': '🇹🇷', 'Ucrânia': '🇺🇦', 'Sérvia': '🇷🇸', 'Islândia': '🇮🇸',
};
