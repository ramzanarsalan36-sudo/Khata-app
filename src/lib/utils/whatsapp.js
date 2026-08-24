import { formatINR } from './currency.js';
import { normalizeIndianPhoneNumber } from './phone.js';

// Unicode Character Constants (UTF-8 Safe)
const EMOJI_ROSE = '🌹'; // \u{1F339}
const EMOJI_RECEIPT = '🧾'; // \u{1F9FE}
const CURRENCY_RUPEE = '₹'; // \u20B9

/**
 * Format raw balance number into clean Indian Rupee string without currency symbol
 * e.g., 78 -> "78", 1000 -> "1,000", 10000 -> "10,000", 125000 -> "1,25,000"
 */
export function formatAmountNumber(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0';
  const num = Math.abs(Number(amount));
  return num.toLocaleString('en-IN', {
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  });
}

/**
 * Format balance string with status for transaction receipts
 */
export function formatBalanceWithStatus(balance) {
  const num = Number(balance) || 0;
  const formatted = formatAmountNumber(num);
  if (num > 0) {
    return `${formatted} (Udhaar)`;
  } else if (num < 0) {
    return `${formatted} (Advance Jama)`;
  }
  return '0 (Poora Clear)';
}

/**
 * 1. Build Payment Reminder WhatsApp Message
 *
 * Consistent Format:
 * Assalamualaikum Mohtaram Janab 🌹
 *
 * Aapke khate mein abhi *₹{outstanding_balance}* baki hain. 🧾
 *
 * Aapki sahulat ke liye hisaab ki yaad-dihani bhej raha hoon.
 *
 * Jab aapko munasib ho, payment kar dein.
 *
 * JazakAllah Khair
 *
 * Aapka apna dukan wala
 * {dukan_name}
 */
export function buildPaymentReminderWhatsAppMessage({ balance, shopName = '' }) {
  const numBalance = Number(balance);
  if (isNaN(numBalance) || numBalance <= 0) {
    return null; // Do not send reminder for 0 or negative balance
  }

  const formattedBalance = formatAmountNumber(numBalance);
  const shop = shopName && shopName.trim() ? shopName.trim() : '';

  let msg = `Assalamualaikum Mohtaram Janab ${EMOJI_ROSE}\n\n`;
  msg += `Aapke khate mein abhi *${CURRENCY_RUPEE}${formattedBalance}* baki hain. ${EMOJI_RECEIPT}\n\n`;
  msg += `Aapki sahulat ke liye hisaab ki yaad-dihani bhej raha hoon.\n\n`;
  msg += `Jab aapko munasib ho, payment kar dein.\n\n`;
  msg += `JazakAllah Khair\n\n`;
  msg += `Aapka apna dukan wala`;
  if (shop) {
    msg += `\n${shop}`;
  }

  return msg.normalize('NFC');
}

/**
 * 2. Build Default / Current Customer Balance Message (for general balance share)
 */
export function buildCustomerBalanceWhatsAppMessage({
  shopName = '',
  balance = 0,
}) {
  const numBalance = Number(balance) || 0;
  return buildPaymentReminderWhatsAppMessage({
    balance: numBalance,
    shopName,
  });
}

/**
 * 3. Build Transaction-Specific Message (GAVE / GOT)
 *
 * Follows the exact consistent greeting, tone, emojis, and styling.
 */
export function buildTransactionWhatsAppMessage({
  transactionAmount = 0,
  type = 'GAVE', // 'GAVE' or 'GOT'
  newBalance = 0,
  shopName = '',
  note = '',
}) {
  const formattedTxAmount = formatAmountNumber(transactionAmount);
  const formattedNewBalance = formatAmountNumber(newBalance);
  const shop = shopName && shopName.trim() ? shopName.trim() : '';
  const numBalance = Number(newBalance) || 0;

  let msg = `Assalamualaikum Mohtaram Janab ${EMOJI_ROSE}\n\n`;

  if (type === 'GAVE') {
    msg += `Aaj aapke khate mein *${CURRENCY_RUPEE}${formattedTxAmount}* udhaar darj kiya gaya hai. ${EMOJI_RECEIPT}\n\n`;
    if (numBalance > 0) {
      msg += `Ab aapka total baki *${CURRENCY_RUPEE}${formattedNewBalance}* hai.\n\n`;
    }
    msg += `Aapki sahulat ke liye hisaab ki raseed bhej raha hoon.\n\n`;
  } else {
    msg += `Aapki taraf se *${CURRENCY_RUPEE}${formattedTxAmount}* payment jama ho gayi hai. ${EMOJI_RECEIPT}\n\n`;
    if (numBalance > 0) {
      msg += `Ab aapka total baki *${CURRENCY_RUPEE}${formattedNewBalance}* hai.\n\n`;
    } else if (numBalance < 0) {
      msg += `Aapka *${CURRENCY_RUPEE}${formattedNewBalance}* advance jama hai.\n\n`;
    } else {
      msg += `Aapka hisaab poora clear ho gaya hai.\n\n`;
    }
    msg += `Aapka hisaab update kar diya gaya hai.\n\n`;
  }

  if (note && note.trim()) {
    msg += `Vivaran: ${note.trim()}\n\n`;
  }

  msg += `JazakAllah Khair\n\n`;
  msg += `Aapka apna dukan wala`;
  if (shop) {
    msg += `\n${shop}`;
  }

  return msg.normalize('NFC');
}

/**
 * 4. Generate fully UTF-8 encoded WhatsApp URL
 * Uses encodeURIComponent on NFC normalized string to strictly prevent  replacement characters.
 */
export function generateWhatsAppUrl({ phone, message }) {
  if (!message) return null;
  const normalizedPhone = normalizeIndianPhoneNumber(phone);
  if (!normalizedPhone) return null;

  // Normalize string to UTF-8 Canonical Composition (NFC)
  const safeMessage = String(message).normalize('NFC');
  const encodedText = encodeURIComponent(safeMessage);

  return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
}

/**
 * 5. Helper to trigger WhatsApp opening safely with UTF-8
 */
export function openWhatsAppMessage({ phone, message, onError }) {
  if (!message) {
    if (onError && typeof onError === 'function') {
      onError('Message body cannot be empty or zero balance.');
    }
    return false;
  }

  const url = generateWhatsAppUrl({ phone, message });
  if (!url) {
    const errorMsg = 'Customer ka valid WhatsApp number available nahi hai.';
    if (onError && typeof onError === 'function') {
      onError(errorMsg);
    } else {
      alert(errorMsg);
    }
    return false;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

// Dedicated Payment Reminder WhatsApp URL Generator
export function generateReminderWhatsAppUrl({
  customerPhone,
  currentBalance,
  shopName = '',
}) {
  const message = buildPaymentReminderWhatsAppMessage({
    balance: currentBalance,
    shopName,
  });
  if (!message) return null;
  return generateWhatsAppUrl({ phone: customerPhone, message });
}

// Backward compatibility helper
export function generateTransactionWhatsAppUrl({
  shopName,
  customerPhone,
  amount,
  type,
  currentBalance,
  note,
}) {
  const message = buildTransactionWhatsAppMessage({
    shopName,
    transactionAmount: amount,
    type,
    newBalance: currentBalance,
    note,
  });
  return generateWhatsAppUrl({ phone: customerPhone, message });
}

