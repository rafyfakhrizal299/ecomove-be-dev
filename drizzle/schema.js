import {
  pgTable, varchar, boolean, timestamp, text, integer,
  pgEnum, serial, numeric, date, unique
} from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('Role', ['ADMIN', 'USER'])

export const services = pgTable('Service', {
  id: serial('id').primaryKey().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow(),
})

export const users = pgTable('User', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  firstName: varchar('firstName', { length: 255 }).notNull(),
  lastName: varchar('lastName', { length: 255 }).notNull(),
  mobileNumber: varchar('mobileNumber', { length: 20 }),
  email: varchar('email', { length: 255 }).unique(),
  password: varchar('password', { length: 255 }),
  provider: varchar('provider', { length: 100 }),
  providerId: varchar('providerId', { length: 255 }),
  emailVerifiedAt: timestamp('emailVerifiedAt', { mode: 'date' }),
  role: roleEnum('role').default('USER').notNull(),
  canAccessCMS: boolean('canAccessCMS').default(false).notNull(),
  serviceId: integer('serviceId'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow(),
})

export const savedAddresses = pgTable('saved_addresses', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).references(() => users.id).notNull(),
  label: text('label'),
  address: text('address').notNull(),
  unitStreet: text('unit_street'),
  pinnedLocation: text('pinned_location').notNull(),
  contactName: text('contact_name').notNull(),
  contactNumber: text('contact_number').notNull(),
  type: text('type').notNull(), // 'sender' | 'receiver'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
}, (table) => ({
  uniqueSaved: unique('unique_saved').on(
    table.userId,
    table.pinnedLocation,
    table.contactName,
    table.contactNumber,
    table.type
  )
}))

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).references(() => users.id).notNull(),

  senderAddressId: integer('sender_address_id').references(() => savedAddresses.id),

  address: text('address'),
  unitStreet: text('unit_street'),
  pinnedLocation: text('pinned_location'),
  contactName: text('contact_name'),
  contactNumber: text('contact_number'),

  pickupDate: date('pickup_date').notNull(),
  deliveryType: text('delivery_type').notNull(),
  packageSize: text('package_size').notNull(),
  distance: numeric('distance'),
  fee: numeric('fee'),
  bringPouch: boolean('bring_pouch').default(false),
  packageType: text('package_type').notNull(),
  cod: boolean('cod').default(false),
  itemProtection: boolean('item_protection').default(false),
  deliveryNotes: text('delivery_notes'),
  paymentStatus: text('payment_status').default('pending'),
  modeOfPayment: text('mode_of_payment').default('fiuuu'),
  driver: text('driver'),

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
})

export const transactionReceivers = pgTable('transaction_receivers', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id').references(() => transactions.id).notNull(),

  address: text('address').notNull(),
  unitStreet: text('unit_street'),
  pinnedLocation: text('pinned_location').notNull(),
  contactName: text('contact_name').notNull(),
  contactNumber: text('contact_number').notNull(),
  label: text('label'),

  deliveryType: text('delivery_type').notNull(),
  sizeWeight: text('size_weight').notNull(),
  itemType: text('item_type').notNull(),

  insurance: boolean('insurance').default(false),
  insuranceDetails: text('insurance_details'),

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
})