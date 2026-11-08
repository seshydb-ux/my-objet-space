import registry from './products.json' with { type: 'json' }

function toCatalogProduct(product) {
  return Object.freeze({
    ...product,
    name: product.productName,
    model: product.modelNumber,
    image: product.catalogImage,
    officialUrl: product.officialProductUrl,
    priceNote: product.priceLabel,
    width: product.widthMm / 1000,
    height: product.heightMm / 1000,
    depth: product.depthMm / 1000,
  })
}

export const PRODUCT_REGISTRY = Object.freeze(registry.map((product) => Object.freeze({ ...product })))
export const PRODUCT_CATALOG = Object.freeze(PRODUCT_REGISTRY.map(toCatalogProduct))
export const PRODUCT_BY_ID = Object.freeze(Object.fromEntries(PRODUCT_CATALOG.map((product) => [product.id, product])))
