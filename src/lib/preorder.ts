/**
 * A product is effectively "pre-order" when:
 *  1. is_preorder is manually set to true, OR
 *  2. stock is <= 0 (out of stock → auto pre-order), OR
 *  3. stock is > 0 but < 3 (critically low → auto pre-order)
 */
export const AUTO_PREORDER_THRESHOLD = 3;

export function isEffectivePreorder(product: { is_preorder: boolean; stock: number }): boolean {
  if (product.is_preorder) return true;
  // Auto pre-order: out of stock or critically low stock
  return product.stock <= 0 || product.stock < AUTO_PREORDER_THRESHOLD;
}
