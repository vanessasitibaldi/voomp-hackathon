const STORAGE_KEY = 'voomp_userId';

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

/**
 * Obtém ou cria um userId persistente no localStorage
 * Se não existir, cria um novo e salva
 * Se já existir, retorna o userId existente
 */
export function getUserId(): string {
  try {
    // Tenta recuperar userId existente do localStorage
    const existingUserId = localStorage.getItem(STORAGE_KEY);
    
    if (existingUserId) {
      console.log('♻️ userId recuperado do localStorage:', existingUserId);
      return existingUserId;
    }
    
    // Se não existe, cria um novo userId
    const newUserId = generateUserId();
    localStorage.setItem(STORAGE_KEY, newUserId);
    console.log('✨ Novo userId criado e salvo:', newUserId);
    
    return newUserId;
  } catch (error) {
    // Fallback: se localStorage não estiver disponível, apenas gera um ID
    console.warn('⚠️ localStorage não disponível, gerando userId temporário');
    return generateUserId();
  }
}

/**
 * Remove o userId do localStorage
 * Usado após compra concluída com sucesso
 */
export function clearUserId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🧹 userId removido do localStorage');
  } catch (error) {
    console.warn('⚠️ Erro ao limpar userId do localStorage:', error);
  }
}
