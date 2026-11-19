export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    // Not a valid ISO currency code
    return `${currency} ${amount.toFixed(2)}`
  }
}
