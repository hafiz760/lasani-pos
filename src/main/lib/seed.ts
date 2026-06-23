import * as bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import * as models from '../models'

const DEFAULT_ADMIN = {
  email: 'admin@shop.com',
  password: '123456',
  fullName: 'Shop Administrator'
}

const LEGACY_DEFAULT_ADMIN = {
  email: 'admin@rexpos.local',
  fullName: 'RexPOS Administrator'
}

const DEFAULT_ROLES = [
  {
    name: 'Administrator',
    description: 'Full system administration access.',
    permissions: ['*']
  },
  {
    name: 'Store Manager',
    description: 'Manage store operations, inventory, customers, and reports.',
    permissions: ['store.manage', 'inventory.manage', 'sales.manage', 'reports.view']
  },
  {
    name: 'Cashier',
    description: 'Create sales and view assigned store information.',
    permissions: ['sales.create', 'sales.view', 'customers.view']
  }
]

const DEFAULT_CATEGORIES = [
  { name: 'Ladies', slug: 'ladies', description: 'Women clothing and fabrics.' },
  { name: 'Gents', slug: 'gents', description: 'Men clothing and fabrics.' },
  { name: 'Quilts', slug: 'quilts', description: 'Quilts and bedding sets.' },
  { name: 'Blankets', slug: 'blankets', description: 'Blankets and winter bedding.' }
]

const DEFAULT_BRANDS = [
  'Gul Ahmed',
  'Zain',
  'Khaadi',
  'Sapphire',
  'Nishat Linen',
  'Alkaram Studio',
  'Bonanza Satrangi',
  'J.'
]

const DEFAULT_ATTRIBUTES = [
  { name: 'Lawn', type: 'FABRIC' },
  { name: 'Khaddar', type: 'FABRIC' },
  { name: 'Linen', type: 'FABRIC' },
  { name: 'Cotton', type: 'FABRIC' },
  { name: 'Wash & Wear', type: 'FABRIC' },
  { name: 'Plain', type: 'PATTERN' },
  { name: 'Printed', type: 'PATTERN' },
  { name: 'Embroidered', type: 'PATTERN' },
  { name: 'Summer', type: 'COLLECTION' },
  { name: 'Winter', type: 'COLLECTION' },
  { name: 'Single', type: 'PIECE_COUNT' },
  { name: '2 Piece', type: 'PIECE_COUNT' },
  { name: '3 Piece', type: 'PIECE_COUNT' },
  { name: 'Black', type: 'COLOR' },
  { name: 'White', type: 'COLOR' },
  { name: 'Navy Blue', type: 'COLOR' },
  { name: 'Maroon', type: 'COLOR' },
  { name: 'Small', value: 'S', type: 'SIZE' },
  { name: 'Medium', value: 'M', type: 'SIZE' },
  { name: 'Large', value: 'L', type: 'SIZE' },
  { name: 'Extra Large', value: 'XL', type: 'SIZE' }
] as const

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function ensureRoles(): Promise<{ _id: mongoose.Types.ObjectId }> {
  for (const role of DEFAULT_ROLES) {
    await models.Role.updateOne({ name: role.name }, { $setOnInsert: role }, { upsert: true })
  }

  const administratorRole = await models.Role.findOne({ name: 'Administrator' }).lean()
  if (!administratorRole) {
    throw new Error('The Administrator role could not be created.')
  }

  return administratorRole as { _id: mongoose.Types.ObjectId }
}

async function ensureAdministrator(roleId: mongoose.Types.ObjectId): Promise<boolean> {
  const adminExists = await models.User.exists({ globalRole: 'ADMIN' })

  if (adminExists) {
    const legacyAdmin = await models.User.findOne({
      email: LEGACY_DEFAULT_ADMIN.email,
      fullName: LEGACY_DEFAULT_ADMIN.fullName,
      globalRole: 'ADMIN'
    })
    const replacementAccount = await models.User.findOne({ email: DEFAULT_ADMIN.email })

    if (legacyAdmin && !replacementAccount) {
      legacyAdmin.email = DEFAULT_ADMIN.email
      legacyAdmin.fullName = DEFAULT_ADMIN.fullName
      legacyAdmin.password = await bcrypt.hash(DEFAULT_ADMIN.password, 12)
      legacyAdmin.role = roleId
      await legacyAdmin.save()
      return true
    }

    return false
  }

  const password = await bcrypt.hash(DEFAULT_ADMIN.password, 12)
  const defaultAdmin = await models.User.findOne({ email: DEFAULT_ADMIN.email })

  if (defaultAdmin) {
    defaultAdmin.fullName = DEFAULT_ADMIN.fullName
    defaultAdmin.role = roleId
    defaultAdmin.globalRole = 'ADMIN'
    defaultAdmin.isActive = true
    await defaultAdmin.save()
    return true
  }

  await models.User.create({
    ...DEFAULT_ADMIN,
    password,
    role: roleId,
    globalRole: 'ADMIN',
    isActive: true
  })
  return true
}

async function ensureStores(): Promise<Array<{ _id: mongoose.Types.ObjectId }>> {
  const stores = await models.Store.find().select('_id').lean()
  if (stores.length > 0) return stores as Array<{ _id: mongoose.Types.ObjectId }>

  const store = await models.Store.create({
    name: 'Main Store',
    code: 'MAIN',
    address: 'Update this address in Store Settings',
    phone: '0000000000',
    email: DEFAULT_ADMIN.email,
    settings: {
      currency: 'PKR',
      taxRate: 0,
      timezone: 'Asia/Karachi'
    },
    isActive: true
  })

  return [{ _id: store._id }]
}

async function seedStoreCatalog(storeId: mongoose.Types.ObjectId): Promise<void> {
  await models.Category.bulkWrite(
    DEFAULT_CATEGORIES.map((category, index) => ({
      updateOne: {
        filter: { store: storeId, slug: category.slug },
        update: {
          $setOnInsert: { ...category, store: storeId, displayOrder: index + 1, isActive: true }
        },
        upsert: true
      }
    }))
  )

  await models.Brand.bulkWrite(
    DEFAULT_BRANDS.map((name) => ({
      updateOne: {
        filter: { store: storeId, slug: toSlug(name) },
        update: {
          $setOnInsert: {
            name,
            slug: toSlug(name),
            store: storeId,
            description: `Starter clothing brand: ${name}.`,
            isActive: true
          }
        },
        upsert: true
      }
    }))
  )

  await models.Attribute.bulkWrite(
    DEFAULT_ATTRIBUTES.map((attribute) => ({
      updateOne: {
        filter: { store: storeId, type: attribute.type, name: attribute.name },
        update: { $setOnInsert: { ...attribute, store: storeId, isActive: true } },
        upsert: true
      }
    }))
  )
}

export async function seedInitialData(): Promise<void> {
  const administratorRole = await ensureRoles()
  const createdAdmin = await ensureAdministrator(administratorRole._id)
  const stores = await ensureStores()

  for (const store of stores) {
    await seedStoreCatalog(store._id)
  }

  if (createdAdmin) {
    console.warn(
      `Default administrator account configured: ${DEFAULT_ADMIN.email}. Change the password immediately.`
    )
  }

  console.log(`Starter data verified for ${stores.length} store(s).`)
}
