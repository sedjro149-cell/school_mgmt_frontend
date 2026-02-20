/**
 * Sécurise les données backend pour éviter les erreurs de type .map() or .slice()
 * @param {any} data - La donnée brute
 * @param {any} fallback - Valeur de retour si invalide (défaut: [])
 */
export const ensureArray = (data, fallback = []) => (Array.isArray(data) ? data : fallback);

/**
 * Formate les nombres avec séparateurs de milliers
 */
export const formatNum = (val) => {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat('fr-FR').format(val);
};

/**
 * Calcule les initiales pour l'avatar
 */
export const getInitials = (fn, ln) => {
  const f = fn?.[0] || "";
  const l = ln?.[0] || "";
  return (f + l).toUpperCase() || "?";
};