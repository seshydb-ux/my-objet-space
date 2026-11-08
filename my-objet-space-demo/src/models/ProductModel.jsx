import { DryerModel, FridgeModel, StylerModel, WasherModel } from './ApplianceModels.jsx'
import { BedModel, CoffeeTableModel, DeskModel, KitchenCounterModel, SofaModel } from './FurnitureModels.jsx'

const MODEL_COMPONENTS = {
  dryer: DryerModel,
  washer: WasherModel,
  fridge: FridgeModel,
  styler: StylerModel,
  bed: BedModel,
  sofa: SofaModel,
  desk: DeskModel,
  'coffee-table': CoffeeTableModel,
  'kitchen-counter': KitchenCounterModel,
}

const LEGACY_MODEL_TYPES = {
  dryer: 'dryer',
  'bed-product': 'bed',
  'sofa-product': 'sofa',
  'desk-product': 'desk',
}

export default function ProductModel({ product, danger }) {
  const modelType = product.model3d ?? LEGACY_MODEL_TYPES[product.id]
  const Model = MODEL_COMPONENTS[modelType]
  if (!Model) throw new Error(`지원하지 않는 3D 모델: ${modelType ?? product.id}`)
  return <Model product={product} danger={danger} />
}
