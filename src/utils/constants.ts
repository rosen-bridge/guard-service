class EventStatus {
  static pendingPayment = 'pending-payment';
  static pendingReward = 'pending-reward';
  static inPayment = 'in-payment';
  static inReward = 'in-reward';
  static completed = 'completed';
  static spent = 'spent'; // same as completed but no data is available about its process
  static rejected = 'rejected';
  static timeout = 'timeout';
  static paymentWaiting = 'payment-waiting';
  static rewardWaiting = 'reward-waiting';
}

class TransactionStatus {
  static approved = 'approved';
  static inSign = 'in-sign';
  static signFailed = 'sign-failed';
  static signed = 'signed';
  static sent = 'sent';
  static invalid = 'invalid';
  static completed = 'completed';
}

class TransactionTypes {
  static payment = 'payment';
  static reward = 'reward';
  static coldStorage = 'cold-storage';
}

enum RevenuePeriod {
  year = 'year',
  month = 'month',
  week = 'week',
}
const DefaultApiLimit = 100;
const DefaultRevenueApiCount = 10;

export {
  EventStatus,
  TransactionStatus,
  TransactionTypes,
  RevenuePeriod,
  DefaultApiLimit,
  DefaultRevenueApiCount,
};
