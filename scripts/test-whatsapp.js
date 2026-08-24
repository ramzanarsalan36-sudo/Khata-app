import {
  normalizeIndianPhoneNumber,
  normalizePhoneNumber,
  formatIndianPhoneNumber,
} from '../src/lib/utils/phone.js';

import {
  buildPaymentReminderWhatsAppMessage,
  buildTransactionWhatsAppMessage,
  buildCustomerBalanceWhatsAppMessage,
  generateWhatsAppUrl,
  formatAmountNumber,
} from '../src/lib/utils/whatsapp.js';

console.log('========================================');
console.log('RUNNING WHATSAPP TEST SUITE (10 CASES)');
console.log('========================================\n');

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
  }
}

// Case 1: Customer balance ₹1,500
const msg1 = buildPaymentReminderWhatsAppMessage({
  balance: 1500,
  shopName: 'Madina General Store',
});
assert(msg1.includes('₹1,500') && msg1.includes('Madina General Store') && msg1.includes('🌹') && msg1.includes('🧾'), 'Case 1: ₹1,500 balance contains ₹1,500, shop name, and emojis');

// Case 2: Customer balance ₹500
const msg2 = buildPaymentReminderWhatsAppMessage({
  balance: 500,
  shopName: 'Sharma Traders',
});
assert(msg2.includes('₹500') && msg2.includes('Aapka apna dukan wala'), 'Case 2: ₹500 balance contains ₹500 and dukan wala footer');

// Case 3: Customer balance ₹0 (Clear) -> should be null for reminder
const msg3 = buildPaymentReminderWhatsAppMessage({
  balance: 0,
  shopName: 'Bismillah Store',
});
assert(msg3 === null, 'Case 3: ₹0 balance returns null (no reminder sent)');

// Case 4: Customer advance balance -₹200 -> should be null for reminder
const msg4 = buildPaymentReminderWhatsAppMessage({
  balance: -200,
  shopName: 'Bismillah Store',
});
assert(msg4 === null, 'Case 4: Negative balance returns null (no reminder sent)');

// Case 5: Phone 9876543210 -> 919876543210
const p1 = normalizePhoneNumber('9876543210');
assert(p1 === '919876543210', 'Case 5: 10-digit phone 9876543210 normalized to 919876543210');

// Case 6: Phone +91 98765 43210 -> 919876543210
const p2 = normalizeIndianPhoneNumber('+91 98765 43210');
assert(p2 === '919876543210', 'Case 6: Formatted phone +91 98765 43210 normalized to 919876543210 without duplicate 91');

// Case 7: Missing phone number
const p3 = normalizePhoneNumber('');
const p4 = normalizePhoneNumber(null);
const urlInvalid = generateWhatsAppUrl({ phone: '', message: 'Test' });
assert(p3 === null && p4 === null && urlInvalid === null, 'Case 7: Missing phone returns null / prevented from opening');

// Case 8: Emojis and Urdu/Hindi characters with encodeURIComponent
const url8 = generateWhatsAppUrl({ phone: '9876543210', message: msg1 });
assert(url8.includes('https://wa.me/919876543210?text=') && url8.includes(encodeURIComponent('🌹')), 'Case 8: encodeURIComponent correctly encodes Hindi/Urdu & Emojis');

// Case 9: Verify no replacement character () in output
assert(!msg1.includes('\uFFFD') && !msg2.includes('\uFFFD'), 'Case 9: No replacement character  present in any message');

// Case 10: Transaction GAVE ₹500, new balance ₹1500
const msg10 = buildTransactionWhatsAppMessage({
  shopName: 'Super Mart',
  transactionAmount: 500,
  type: 'GAVE',
  newBalance: 1500,
  note: '5kg Basmati Rice',
});
assert(
  msg10.includes('₹500') &&
  msg10.includes('1,500') &&
  msg10.includes('5kg Basmati Rice'),
  'Case 10: Transaction message has ₹500, ₹1,500 balance and note'
);

console.log(`\nRESULTS: ${passed}/${total} TESTS PASSED!`);
if (passed === total) {
  console.log('🎉 ALL 10 TEST CASES PASSED SUCCESSFULLY!');
}
