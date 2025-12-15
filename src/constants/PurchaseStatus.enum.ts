export enum PurchaseStatus {
  COLD = 'cold',           // cart sem begin_checkout
  WARM = 'warm',           // begin_checkout sem add_payment_info
  HOT = 'hot',             // add_payment_info sem purchase
  COMPLETED = 'completed'  // purchase
}
