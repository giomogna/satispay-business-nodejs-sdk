export type ReportType = "PAYMENT_FEE";
export type ReportFormat = "CSV" | "XLS";
export type ReportQueryType = "PAYMENT_DATE_INTERVAL";
export type ReportStatus = "PENDING" | "SUCCESS";

export type ReportColumnIdentifier =
  | "transaction_id"
  | "transaction_acceptance_date"
  | "transaction_amount_unit"
  | "transaction_signed_amount_unit"
  | "transaction_type"
  | "transaction_external_code"
  | "transaction_counterpart_type"
  | "transaction_counterpart_id"
  | "transaction_currency"
  | "transaction_group_id"
  | "transaction_e_money_amount_unit"
  | "transaction_meal_voucher_amount_unit"
  | "fee_amount_unit"
  | "fee_acceptance_date"
  | "fee_signed_amount_unit"
  | "fee_transaction_original_id"
  | "fee_transaction_id"
  | "fee_type"
  | "fee_id"
  | "shop_id"
  | "shop_name"
  | "shop_external_code";

export interface ReportColumn {
  /** Each identifier may be used only once per `columns` array */
  identifier: ReportColumnIdentifier;
  /** Up to 50 characters: letters, numbers, `-`, `_` and spaces */
  name?: string;
  /** Defaults to the position in the array */
  order?: number;
}

export interface ReportNotification {
  /** Emails notified when the report is ready */
  email_cc_list?: string[];
  /** Called with an HTTP GET when the report is ready (`{uuid}` is replaced with the report id) */
  callback_url?: string;
}

export interface CreateReportQueryPayload {
  /** `YYYY-MM-dd` string or a `Date` (formatted in UTC) */
  payment_date_from: string | Date;
  /** `YYYY-MM-dd` string or a `Date` (formatted in UTC) */
  payment_date_to: string | Date;
  /** IANA time zone, e.g. `Europe/Rome` */
  time_zone?: string;
  columns?: ReportColumn[];
}

export interface CreateReportRequest {
  type: ReportType;
  format: ReportFormat;
  notification?: ReportNotification;
  query_type: ReportQueryType;
  query_payload: CreateReportQueryPayload;
}

export interface CreateReportResponse {
  id: string;
  type: ReportType;
  status: ReportStatus;
  notification?: ReportNotification;
  query_type: ReportQueryType;
  /** Echo of the request payload; Satispay may add fields such as `merchant_uid` */
  query_payload: Record<string, unknown> & {
    time_zone?: string;
    columns?: ReportColumn[];
  };
}
