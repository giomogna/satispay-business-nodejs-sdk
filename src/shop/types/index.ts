export interface GetDailyClosureResponse {
  shop_daily_closure: {
    id: string;
    type: "SHOP";
    customer_uid: string;
    amount_unit: number;
    currency: string;
  };
}
