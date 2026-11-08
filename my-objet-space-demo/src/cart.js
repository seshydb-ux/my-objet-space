import { PRODUCT_BY_ID } from './layout.js'

export function isPurchasable(productId) {
  return PRODUCT_BY_ID[productId]?.purchasable === true
}

export function addCartItem(cart, productId) {
  if (!isPurchasable(productId)) return cart

  const existing = cart.find((item) => item.productId === productId)
  if (existing) {
    return cart.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item)
  }
  return [...cart, { productId, quantity: 1 }]
}

export function changeCartQuantity(cart, productId, delta) {
  return cart
    .map((item) => item.productId === productId ? { ...item, quantity: item.quantity + delta } : item)
    .filter((item) => item.quantity > 0)
}

export function removeCartItem(cart, productId) {
  return cart.filter((item) => item.productId !== productId)
}

export function cartSummary(cart, productsById) {
  return cart.reduce((summary, item) => {
    const product = productsById[item.productId]
    summary.quantity += item.quantity
    if (product?.price == null) summary.unpricedQuantity += item.quantity
    else summary.knownTotal += product.price * item.quantity
    return summary
  }, { quantity: 0, knownTotal: 0, unpricedQuantity: 0 })
}
