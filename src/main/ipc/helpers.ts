import * as models from '../models'

// Helper to ensure data is cloneable for Electron IPC (Structured Clone Algorithm)
// Mongoose ObjectIds and other internal types can cause "An object could not be cloned" errors.
export const toJSON = (data: any) => {
  if (data === undefined || data === null) return data
  try {
    return JSON.parse(JSON.stringify(data))
  } catch (error) {
    console.error('Serialization error:', error)
    return data
  }
}

export const createAccountTransaction = async ({
  storeId,
  createdBy,
  description,
  referenceType,
  referenceId,
  accountId,
  entryType,
  amount,
  transactionDate
}: {
  storeId: string
  createdBy: string
  description: string
  referenceType: string
  referenceId?: string
  accountId: string
  entryType: 'DEBIT' | 'CREDIT'
  amount: number
  transactionDate?: Date
}) => {
  if (!accountId || amount <= 0) return
  await models.Transaction.create({
    transactionDate: transactionDate || new Date(),
    referenceType,
    referenceId,
    description,
    entries: [
      {
        account: accountId,
        entryType,
        amount
      }
    ],
    totalAmount: amount,
    store: storeId,
    createdBy
  })
}

export const ensureDefaultAccounts = async (storeId: string) => {
  const cashAccount = await models.Account.findOne({
    store: storeId,
    accountName: 'Cash in Hand'
  })

  const bankAccount = await models.Account.findOne({
    store: storeId,
    accountName: 'Bank'
  })

  const cash =
    cashAccount ||
    (await models.Account.create({
      accountCode: '1001',
      accountName: 'Cash in Hand',
      accountType: 'ASSET',
      store: storeId,
      openingBalance: 0,
      currentBalance: 0
    }))

  const bank =
    bankAccount ||
    (await models.Account.create({
      accountCode: '1002',
      accountName: 'Bank',
      accountType: 'ASSET',
      store: storeId,
      openingBalance: 0,
      currentBalance: 0
    }))

  return { cash, bank }
}
