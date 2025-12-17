/**
 * Gera um hash aleatório único para userId
 * Usa crypto.randomUUID() se disponível, caso contrário gera um hash baseado em timestamp e números aleatórios
 */
export function generateUserId(): string {
  // Tenta usar crypto.randomUUID() se disponível (navegadores modernos)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: gera um hash usando timestamp + números aleatórios
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  
  // Combina tudo e cria um hash simples
  const hash = `${timestamp}_${random}${random2}`;
  
  return hash;
}
