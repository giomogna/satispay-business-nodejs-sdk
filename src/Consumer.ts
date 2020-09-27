import Request from "./Request";

interface ConsumerGetResponse {
  id: string
}

export class Consumer {
  private static apiPath = '/g_business/v1/consumers';

  static async get(phoneNumber: string) {
    console.log(await Request.get(`${this.apiPath}/${phoneNumber}`, { sign: true }));
    
    return Request.get(`${this.apiPath}/${phoneNumber}`, { sign: true }) as Promise<ConsumerGetResponse>;
  }
}