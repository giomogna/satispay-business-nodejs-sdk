import Request from "./Request";
import * as querystring from 'querystring';

type Flow = 'MATCH_CODE' | 'MATCH_USER' | 'REFUND' | 'PRE_AUTHORIZED';
type Type = 'TO_BUSINESS' | 'REFUND_TO_BUSINESS';
type Status = 'PENDING' | 'ACCEPTED' | 'CANCELED';
type ActorType = 'CONSUMER' | 'SHOP';
type Action = 'ACCEPT' | 'CANCEL' | 'CANCEL_OR_REFUND';

interface PaymentCreateRequest {
  flow: Flow;
  amount_unit: number;
  currency: string;
  pre_authorized_payments_token?: string;
  parent_payment_uid?: string;
  expiration_date?: string;
  external_code?: string;
  callback_url?: string;
  metadata?: any;
  consumer_uid?: string;
}

interface PaymentAllParams {
  status?: Status;
  limit?: number;
  starting_after?: string;
  starting_after_timestamp?: string;
}

interface PaymentUpdateRequest {
  action: Action;
  metadata?: any;
}

interface PaymentResponse {
  id: string;
  code_identifier: string;
  type: Type;
  amount_unit: string;
  currency: string;
  status: Status;
  expired: boolean;
  metadata: any;
  sender: {
    id: string;
    type: ActorType;
    name: string;
  }
  receiver: {
    id: string;
    type: ActorType;
  }
  status_owner?: {
    id: string;
    type: string;
  }
  daily_closure?: {
    id: string;
    date: string;
  }
  insert_date: string;
  expire_date: string;
  external_code: string;
}

export class Payment {
  private static apiPath = '/g_business/v1/payments';

  static create(body: PaymentCreateRequest) {
    return Request.post(this.apiPath, {
      body: body,
      sign: true
    }) as Promise<PaymentResponse>;
  }

  static get(id: string) {
    return Request.get(`${this.apiPath}/${id}`, { sign: true }) as Promise<PaymentResponse>;
  }

  static all(query: PaymentAllParams = {}) {
    let queryString = ""
    if (query !== {}) {
      queryString += '?';
      queryString += querystring.stringify(query as querystring.ParsedUrlQueryInput);
    }

    return Request.get(`${this.apiPath}${queryString}`, { sign: true }) as Promise<{
      has_more: boolean,
      data: PaymentResponse[],
    }>;
  }

  static update(id: string, body: PaymentUpdateRequest) {
    return Request.put(`${this.apiPath}/${id}`, { sign: true, body: body }) as Promise<PaymentResponse>;
  }
}