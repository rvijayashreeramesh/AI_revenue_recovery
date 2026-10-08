/**
 * Authorized Test Customer Phone Numbers & Profiles for AI Revenue Recovery
 * 
 * STRICT SECURITY RESTRICTION:
 * Messages will ONLY ever be dispatched to these 3 designated test customer numbers:
 * 1. 9150840158 -> 919150840158 (Customer 1: Rahul Sharma)
 * 2. 8015992021 -> 918015992021 (Customer 2: Priya Patel)
 * 3. 7358719632 -> 917358719632 (Customer 3: Arjun Mehta)
 */

export const DEMO_PHONE_NUMBERS = {
  CUSTOMER_1: (process.env.WHATSAPP_TEST_NUMBER_1 || '919150840158').replace(/\D/g, ''),
  CUSTOMER_2: (process.env.WHATSAPP_TEST_NUMBER_2 || '918015992021').replace(/\D/g, ''),
  CUSTOMER_3: (process.env.WHATSAPP_TEST_NUMBER_3 || '917358719632').replace(/\D/g, ''),
};

// Strict Whitelist of allowed 10-digit customer numbers
export const ALLOWED_10_DIGIT_NUMBERS = ['9150840158', '8015992021', '7358719632'];

/**
 * Validates whether a given phone number belongs to the authorized customer list
 */
export const isAuthorizedCustomerPhone = (phone) => {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  const last10 = digits.slice(-10);
  return ALLOWED_10_DIGIT_NUMBERS.includes(last10);
};

export const TEST_CUSTOMER_PROFILES = [
  {
    id: 'CUST_1',
    role: 'CUSTOMER',
    name: 'Rahul Sharma',
    phone: DEMO_PHONE_NUMBERS.CUSTOMER_1,
    displayPhone: '+91 91508 40158',
    email: 'rahul.sharma@corp.in',
    company: 'Apex Retail Tech',
    amount: 4999,
    scenario: 'NPCI_DOWNTIME',
    failureReason: 'HDFC Bank 3D-Secure timeout on UPI rail',
    vpa: 'rahul.sharma@okhdfcbank',
    previousSuccessCount: 8,
    ltv: 48500,
  },
  {
    id: 'CUST_2',
    role: 'CUSTOMER',
    name: 'Priya Patel',
    phone: DEMO_PHONE_NUMBERS.CUSTOMER_2,
    displayPhone: '+91 80159 92021',
    email: 'priya.patel@horizon.co',
    company: 'SaaS Horizon Labs',
    amount: 7999,
    scenario: 'INSUFFICIENT_FUNDS',
    failureReason: 'Insufficient funds balance on primary card',
    vpa: 'priyapatel@icici',
    previousSuccessCount: 3,
    ltv: 24000,
  },
  {
    id: 'CUST_3',
    role: 'CUSTOMER',
    name: 'Arjun Mehta',
    phone: DEMO_PHONE_NUMBERS.CUSTOMER_3,
    displayPhone: '+91 73587 19632',
    email: 'arjun.mehta@finscale.in',
    company: 'Kestrel Cloud Systems',
    amount: 12500,
    scenario: 'HIGH_VALUE_INVOICE',
    failureReason: 'Issuing bank corporate mandate auto-debit hold',
    vpa: 'arjun.mehta@axisbank',
    previousSuccessCount: 14,
    ltv: 98000,
  },
];

/**
 * Returns test customer profile matching scenario or default
 */
export const getTestProfileByScenario = (scenarioType) => {
  if (scenarioType === 'INSUFFICIENT_FUNDS') {
    return TEST_CUSTOMER_PROFILES[1]; // Priya (8015992021)
  }
  if (scenarioType === 'HIGH_VALUE_INVOICE') {
    return TEST_CUSTOMER_PROFILES[2]; // Arjun (7358719632)
  }
  return TEST_CUSTOMER_PROFILES[0]; // Rahul (9150840158)
};

export default {
  DEMO_PHONE_NUMBERS,
  ALLOWED_10_DIGIT_NUMBERS,
  isAuthorizedCustomerPhone,
  TEST_CUSTOMER_PROFILES,
  getTestProfileByScenario,
};
