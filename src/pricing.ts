// Each return value is a discount in whole rupees.
export function baseline(subtotal: number, delivery: number): number {
  return subtotal > 1000 ? 100 : 0;
}
export function candidate(subtotal: number, delivery: number): number {
  return subtotal + delivery >= 1000 ? 100 : 0;
}
export function corrected(subtotal: number, delivery: number): number {
  return subtotal >= 1000 ? 100 : 0;
}
