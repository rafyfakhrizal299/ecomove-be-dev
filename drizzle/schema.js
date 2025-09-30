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
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow(),
  // --- tambahan buat verifikasi ---
  isEmailVerified: boolean("is_email_verified").default(false).notNull(),
  verificationToken: varchar("verification_token", { length: 255 }),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
})

export const userServices = pgTable('UserService', {
  userId: varchar('userId', { length: 255 }).notNull().references(() => users.id),
  serviceId: integer('serviceId').notNull().references(() => services.id),
}, (t) => ({
  pk: unique().on(t.userId, t.serviceId),
}))

export const savedAddresses = pgTable('saved_addresses', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).references(() => users.id).notNull(),
  label: text('label'),
  address: text('address').notNull(),
  unitStreet: text('unit_street'),
  pinnedLocation: text('pinned_location').notNull(),
  contactName: text('contact_name').notNull(),
  contactNumber: text('contact_number').notNull(),
  contactEmail: text('contact_email'),
  type: text('type').notNull(), // 'sender' | 'receiver'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
}
// , (table) => ({
//   uniqueSaved: unique('unique_saved').on(
//     table.userId,
//     table.pinnedLocation,
//     table.contactName,
//     table.contactNumber,
//     table.type
//   )
// })
)

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).references(() => users.id).notNull(),

  // Sender
  savedAddress: boolean('saved_address').default(false),
  addAddress: boolean('add_address').default(false),
  senderAddressId: integer('sender_address_id'),

  address: text('address'),
  unitStreet: text('unit_street'),
  pinnedLocation: text('pinned_location'),
  contactName: text('contact_name'),
  contactNumber: text('contact_number'),
  contactEmail: varchar('contact_email'),

  // Total hasil kalkulasi receiver
  totalDistance: numeric('total_distance'),
  totalFee: numeric('total_fee'),
  deliveryNotes: text('delivery_notes'),
  pickupTime: timestamp('pickup_time', { mode: 'date' }),

  orderid: varchar('orderid', { length: 100 }),
  tranID: varchar('tranID', { length: 100 }),
  paymentStatus: text('payment_status').default('pending'),
  modeOfPayment: text('mode_of_payment').default('COD'),
  status: text('status').default('Booked'), // pending | accepted | on-the-way | delivered | cancelled

  driverId: varchar("driver_id", { length: 255 }).references(() => drivers.id),

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
})

export const deliveryRates = pgTable("delivery_rates", {
  id: serial("id").primaryKey(),
  deliveryType: text("delivery_type").notNull(),  // "same-day" | "standard"
  packageSize: text("package_size").notNull(),    // "small" | "large"
  minDistance: integer("min_distance").notNull(), // dalam M
  maxDistance: integer("max_distance"),           // nullable kalau jarak terakhir >10KM
  price: integer("price").notNull(),              // harga dalam Peso
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const transactionReceivers = pgTable('transaction_receivers', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id').references(() => transactions.id).notNull(),

  // Receiver
  savedAddress: boolean('saved_address').default(false),
  addAddress: boolean('add_address').default(false),
  receiverAddressId: integer('receiver_address_id'),

  address: text('address'),
  unitStreet: text('unit_street'),
  pinnedLocation: text('pinned_location'),
  contactName: text('contact_name'),
  contactNumber: text('contact_number'),
  contactEmail: varchar('contact_email'),

  // Detail
  deliveryType: text('delivery_type').notNull(),
  packageSize: text('package_size').notNull(),
  distance: numeric('distance'),
  fee: numeric('fee'),
  bringPouch: boolean('bring_pouch').default(false),
  itemType: text('item_type'),
  packageType: text('package_type').notNull(),
  cod: boolean('cod').default(false),
  itemProtection: boolean('item_protection').default(false),
  deliveryNotes: text('delivery_notes'),
  weight: numeric('weight'), // in KG

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
})

export const drivers = pgTable("drivers", {
  id: varchar('id', { length: 255 }).primaryKey().notNull(), // UUID
  name: varchar("name", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const userFcmTokens = pgTable("user_fcm_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  token: text("token").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});


// export const transactionReceivers = pgTable('transaction_receivers', {
//   id: serial('id').primaryKey(),
//   transactionId: integer('transaction_id').references(() => transactions.id).notNull(),

//   address: text('address').notNull(),
//   unitStreet: text('unit_street'),
//   pinnedLocation: text('pinned_location').notNull(),
//   contactName: text('contact_name').notNull(),
//   contactNumber: text('contact_number').notNull(),
//   label: text('label'),

//   deliveryType: text('delivery_type').notNull(),
//   sizeWeight: text('size_weight').notNull(),
//   itemType: text('item_type').notNull(),

//   insurance: boolean('insurance').default(false),
//   insuranceDetails: text('insurance_details'),

//   createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
//   updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
// })

// export const transactions = pgTable('transactions', {
//   id: serial('id').primaryKey(),
//   userId: varchar('user_id', { length: 255 }).references(() => users.id).notNull(),

//   senderAddressId: integer('sender_address_id').references(() => savedAddresses.id),

//   address: text('address'),
//   unitStreet: text('unit_street'),
//   pinnedLocation: text('pinned_location'),
//   contactName: text('contact_name'),
//   contactNumber: text('contact_number'),
//   contactEmail: varchar('contact_email'),

//   pickupDate: date('pickup_date').notNull(),
//   deliveryType: text('delivery_type').notNull(),
//   packageSize: text('package_size').notNull(),
//   distance: numeric('distance'),
//   fee: numeric('fee'),
//   bringPouch: boolean('bring_pouch').default(false),
//   packageType: text('package_type').notNull(),
//   cod: boolean('cod').default(false),
//   itemProtection: boolean('item_protection').default(false),
//   deliveryNotes: text('delivery_notes'),
//   orderid: varchar('orderid', { length: 100 }), // from FIUU
//   tranID: varchar('tranID', { length: 100 }), // from FIUU
//   paymentStatus: text('payment_status').default('pending'),
//   modeOfPayment: text('mode_of_payment').default('fiuuu'),
//   driverId: varchar("driver_id", { length: 255 }).references(() => drivers.id), // FK ke drivers.id

//   createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
//   updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
// })