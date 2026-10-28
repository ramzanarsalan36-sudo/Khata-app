import {
  ref,
  push,
  set,
  get,
  update,
  onValue,
  off,
  runTransaction,
} from 'firebase/database';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage } from './config';

const AUTHORIZED_UID = 'FNSMYvR9vhOcvFVPdfu6N7i1Lyc2';

// -------------------------------------------------------------
// SHOP OPERATIONS
// -------------------------------------------------------------

export async function createShop(shopData, userId = AUTHORIZED_UID) {
  if (!db) throw new Error('Firebase Realtime Database is not initialized');

  const shopId = push(ref(db, 'shops')).key;
  const now = new Date().toISOString();

  const newShop = {
    id: shopId,
    shop_name: shopData.shop_name,
    owner_name: shopData.owner_name,
    phone: shopData.phone || '',
    address: shopData.address || '',
    is_active: true,
    owner_id: userId,
    created_at: now,
  };

  const updates = {};
  updates[`shops/${shopId}`] = newShop;
  updates[`user_shops/${userId}/${shopId}`] = {
    id: shopId,
    role: 'owner',
    shop_name: newShop.shop_name,
    created_at: now,
  };
  updates[`shop_members/${shopId}/${userId}`] = {
    role: 'owner',
    user_id: userId,
    created_at: now,
  };

  await update(ref(db), updates);
  return { ...newShop, role: 'owner' };
}

export function subscribeUserShops(userId = AUTHORIZED_UID, callback) {
  if (!db) {
    callback([]);
    return () => {};
  }

  const userShopsRef = ref(db, `user_shops/${userId}`);
  const unsubscribe = onValue(
    userShopsRef,
    async (snapshot) => {
      try {
        const data = snapshot.val();
        if (!data) {
          try {
            const allShopsSnap = await get(ref(db, 'shops'));
            const allShops = allShopsSnap.val();
            if (allShops) {
              const list = Object.values(allShops)
                .filter((s) => s && s.is_active !== false)
                .map((s) => ({ ...s, role: 'owner' }));
              callback(list);
            } else {
              callback([]);
            }
          } catch {
            callback([]);
          }
          return;
        }

        const shopIds = Object.keys(data);
        const shopPromises = shopIds.map(async (sid) => {
          try {
            const snap = await get(ref(db, `shops/${sid}`));
            const shopVal = snap.val();
            if (!shopVal || shopVal.is_active === false) return null;
            return {
              ...shopVal,
              role: data[sid]?.role || 'owner',
            };
          } catch {
            return {
              id: sid,
              shop_name: data[sid]?.shop_name || 'Shop',
              role: data[sid]?.role || 'owner',
            };
          }
        });

        const resolved = (await Promise.all(shopPromises)).filter(Boolean);
        callback(resolved);
      } catch (err) {
        console.warn('Error reading user shops:', err);
        callback([]);
      }
    },
    (error) => {
      console.warn('Firebase RTDB user_shops listener error:', error);
      callback([]);
    }
  );

  return () => off(userShopsRef, 'value', unsubscribe);
}

export async function updateShop(shopId, data) {
  if (!db) return;
  const updates = {
    ...data,
    updated_at: new Date().toISOString(),
  };
  await update(ref(db, `shops/${shopId}`), updates);
}

// -------------------------------------------------------------
// CUSTOMER OPERATIONS
// -------------------------------------------------------------

export function subscribeShopCustomers(shopId, callback) {
  if (!db || !shopId) {
    callback([]);
    return () => {};
  }

  const customersRef = ref(db, `customers/${shopId}`);
  const unsubscribe = onValue(
    customersRef,
    (snapshot) => {
      try {
        const data = snapshot.val();
        if (!data) {
          callback([]);
          return;
        }

        const list = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .filter((c) => !c.deleted_at)
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        callback(list);
      } catch (err) {
        console.warn('Error processing customers snapshot:', err);
        callback([]);
      }
    },
    (error) => {
      console.warn('Firebase RTDB customers listener error:', error);
      callback([]);
    }
  );

  return () => off(customersRef, 'value', unsubscribe);
}

export function subscribeCustomer(shopId, customerId, callback) {
  if (!db || !shopId || !customerId) {
    callback(null);
    return () => {};
  }

  const custRef = ref(db, `customers/${shopId}/${customerId}`);
  const unsubscribe = onValue(
    custRef,
    (snapshot) => {
      try {
        const data = snapshot.val();
        if (!data || data.deleted_at) {
          callback(null);
        } else {
          callback({ id: customerId, ...data });
        }
      } catch (err) {
        console.warn('Error processing customer snapshot:', err);
        callback(null);
      }
    },
    (error) => {
      console.warn('Firebase RTDB customer listener error:', error);
      callback(null);
    }
  );

  return () => off(custRef, 'value', unsubscribe);
}

export async function addCustomer(shopId, customerData) {
  if (!db) throw new Error('Firebase Database is not initialized');
  if (!shopId) throw new Error('Shop ID is required');

  const customerId = push(ref(db, `customers/${shopId}`)).key;
  const now = new Date().toISOString();

  const newCustomer = {
    id: customerId,
    shop_id: shopId,
    name: customerData.name || '',
    phone: customerData.phone || '',
    photo_url: customerData.photo_url || null,
    notes: customerData.notes || '',
    address: customerData.address || '',
    balance: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await set(ref(db, `customers/${shopId}/${customerId}`), newCustomer);
  return newCustomer;
}

export async function updateCustomer(shopId, customerId, updates) {
  if (!db) return;
  await update(ref(db, `customers/${shopId}/${customerId}`), {
    ...updates,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteCustomer(shopId, customerId) {
  if (!db) return;
  await update(ref(db, `customers/${shopId}/${customerId}`), {
    deleted_at: new Date().toISOString(),
  });
}

// -------------------------------------------------------------
// TRANSACTION OPERATIONS (ATOMIC BALANCE MUTATIONS)
// -------------------------------------------------------------

export function subscribeCustomerTransactions(shopId, customerId, callback) {
  if (!db || !shopId || !customerId) {
    callback([]);
    return () => {};
  }

  const txRef = ref(db, `transactions/${shopId}/${customerId}`);
  const unsubscribe = onValue(
    txRef,
    (snapshot) => {
      try {
        const data = snapshot.val();
        if (!data) {
          callback([]);
          return;
        }

        const list = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .filter((tx) => !tx.deleted_at)
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        callback(list);
      } catch (err) {
        console.warn('Error processing transactions snapshot:', err);
        callback([]);
      }
    },
    (error) => {
      console.warn('Firebase RTDB transactions listener error:', error);
      callback([]);
    }
  );

  return () => off(txRef, 'value', unsubscribe);
}

export async function createTransaction({
  shopId,
  customerId,
  amount,
  type, // 'GAVE' or 'GOT'
  note = '',
  billPath = null,
  billUrl = null,
  userId = AUTHORIZED_UID,
  clientTransactionId = null,
}) {
  if (!db) throw new Error('Firebase Database is not initialized');
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Valid positive amount required');
  }

  const customerRef = ref(db, `customers/${shopId}/${customerId}`);
  let newBalance = 0;

  // 1. Atomic balance calculation via runTransaction on Customer node
  const txResult = await runTransaction(customerRef, (currentData) => {
    if (!currentData) return currentData;
    const currentBal = parseFloat(currentData.balance) || 0;
    const change = type === 'GAVE' ? numAmount : -numAmount;
    newBalance = currentBal + change;

    currentData.balance = newBalance;
    currentData.updated_at = new Date().toISOString();
    return currentData;
  });

  if (!txResult.committed) {
    throw new Error('Transaction could not be committed. Please retry.');
  }

  // 2. Insert Transaction Record
  const txId = push(ref(db, `transactions/${shopId}/${customerId}`)).key;
  const now = new Date().toISOString();

  const transactionData = {
    id: txId,
    shop_id: shopId,
    customer_id: customerId,
    type,
    amount: numAmount,
    balance_after: newBalance,
    note: note || '',
    bill_path: billPath || null,
    bill_url: billUrl || null,
    created_by: userId,
    client_transaction_id: clientTransactionId || crypto.randomUUID(),
    created_at: now,
    deleted_at: null,
  };

  await set(ref(db, `transactions/${shopId}/${customerId}/${txId}`), transactionData);

  // 3. Keep index in shop_transactions
  await set(ref(db, `shop_transactions/${shopId}/${txId}`), transactionData);

  return {
    transaction: transactionData,
    customer_balance: newBalance,
    is_duplicate: false,
  };
}

export async function softDeleteTransaction({
  shopId,
  customerId,
  transactionId,
  amount,
  type,
}) {
  if (!db) throw new Error('Firebase Database is not initialized');

  const numAmount = parseFloat(amount);
  const customerRef = ref(db, `customers/${shopId}/${customerId}`);
  let newBalance = 0;

  // Reverse balance mutation
  const txResult = await runTransaction(customerRef, (currentData) => {
    if (!currentData) return currentData;
    const currentBal = parseFloat(currentData.balance) || 0;
    const reverseChange = type === 'GAVE' ? -numAmount : numAmount;
    newBalance = currentBal + reverseChange;

    currentData.balance = newBalance;
    currentData.updated_at = new Date().toISOString();
    return currentData;
  });

  if (!txResult.committed) {
    throw new Error('Could not reverse balance');
  }

  const now = new Date().toISOString();
  await update(ref(db, `transactions/${shopId}/${customerId}/${transactionId}`), {
    deleted_at: now,
  });
  await update(ref(db, `shop_transactions/${shopId}/${transactionId}`), {
    deleted_at: now,
  });

  return { customer_balance: newBalance };
}

// -------------------------------------------------------------
// RECEIPT IMAGE UPLOAD
// -------------------------------------------------------------

export async function uploadReceipt({ shopId, customerId, file }) {
  if (!file) return null;

  try {
    if (storage) {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const fullPath = `bill-receipts/${shopId}/${customerId}/${fileName}`;
      const fileStorageRef = storageRef(storage, fullPath);

      await uploadBytes(fileStorageRef, file, { contentType: file.type || 'image/jpeg' });
      const downloadUrl = await getDownloadURL(fileStorageRef);
      return {
        billPath: fullPath,
        billUrl: downloadUrl,
      };
    }
  } catch (err) {
    console.warn('Firebase Storage upload failed, converting to Base64:', err);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        billPath: `data-uri/${Date.now()}`,
        billUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
  });
}
