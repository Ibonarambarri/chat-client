// Utilidades para sanitización, validación y helpers

// ===== SANITIZACIÓN =====

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitiza atributos HTML (para ids, classes, etc)
 */
function sanitizeAttribute(attr) {
  if (typeof attr !== 'string') return '';
  // Solo permitir caracteres alfanuméricos, guiones y guiones bajos
  return attr.replace(/[^a-zA-Z0-9\-_]/g, '');
}

/**
 * Sanitiza URL - valida que sea HTTP/HTTPS válido
 */
function sanitizeUrl(url) {
  if (typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);
    // Solo permitir http y https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    // Remover trailing slash
    return parsed.toString().replace(/\/$/, '');
  } catch (e) {
    return null;
  }
}

// ===== DEBOUNCE Y THROTTLE =====

/**
 * Debounce: retrasa la ejecución hasta que pasen `wait` ms sin llamadas
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle: limita ejecución a una vez cada `limit` ms
 */
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ===== VALIDACIÓN =====

/**
 * Valida que un email tenga formato correcto
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida que una fecha sea válida y esté en el futuro
 */
function isValidFutureDate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date > new Date();
}

/**
 * Valida longitud de string
 */
function isValidLength(str, min, max) {
  if (typeof str !== 'string') return false;
  const len = str.trim().length;
  return len >= min && len <= max;
}

// ===== FORMATEO =====

/**
 * Formatea una fecha de manera relativa (hace 2 horas, ayer, etc)
 */
function formatRelativeDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'hace un momento';
  if (diffMins < 60) return `hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;

  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/**
 * Formatea duración en formato HH:MM:SS o MM:SS
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (num) => num.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
}

/**
 * Trunca texto con ellipsis
 */
function truncateText(text, maxLength) {
  if (typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ===== ERROR HANDLING =====

/**
 * Maneja errores de forma segura y retorna mensaje user-friendly
 */
function handleError(error) {
  console.error('Error:', error);

  if (error.name === 'AbortError') {
    return 'Timeout: La petición tardó demasiado';
  }

  if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
    return 'Error de red. Verifica tu conexión';
  }

  if (error.message.includes('JSON')) {
    return 'Error al procesar la respuesta';
  }

  return error.message || 'Error desconocido';
}

/**
 * Crea un error boundary para funciones async
 */
function createAsyncErrorBoundary(asyncFunc, fallback) {
  return async function(...args) {
    try {
      return await asyncFunc(...args);
    } catch (error) {
      console.error('Async error boundary caught:', error);
      if (typeof fallback === 'function') {
        return fallback(error);
      }
      return null;
    }
  };
}

// ===== PERFORMANCE =====

/**
 * Mide tiempo de ejecución de una función
 */
function measureTime(label, func) {
  return async function(...args) {
    const start = performance.now();
    const result = await func(...args);
    const end = performance.now();
    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  };
}

/**
 * Crea un LRU cache simple
 */
function createLRUCache(maxSize = 100) {
  const cache = new Map();

  return {
    get(key) {
      if (!cache.has(key)) return null;
      // Mover al final (más reciente)
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value);
      return value;
    },

    set(key, value) {
      // Si existe, eliminar primero
      if (cache.has(key)) {
        cache.delete(key);
      }
      // Si está lleno, eliminar el más antiguo
      else if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(key, value);
    },

    clear() {
      cache.clear();
    },

    get size() {
      return cache.size;
    }
  };
}

// ===== RETRY LOGIC =====

/**
 * Reintentar función con backoff exponencial
 */
async function retryWithBackoff(func, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await func();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Exportar si es módulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    sanitizeAttribute,
    sanitizeUrl,
    debounce,
    throttle,
    isValidEmail,
    isValidFutureDate,
    isValidLength,
    formatRelativeDate,
    formatDuration,
    truncateText,
    handleError,
    createAsyncErrorBoundary,
    measureTime,
    createLRUCache,
    retryWithBackoff
  };
}
