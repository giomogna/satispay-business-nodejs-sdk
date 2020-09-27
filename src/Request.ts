import * as crypto from 'crypto';
import * as moment from 'moment';
import fetch from 'node-fetch';
import { getAuthserviceUrl, getKeyId, getPrivateKey } from './init';

const DATE_RFC2822 = "ddd, DD MMM YYYY HH:mm:ss ZZ";


interface OptionType {
  body?: any;
  sign?: boolean;
}

interface RequestOptions {
  body?: any;
  sign?: boolean;
  path: string;
  method?: string;
}

interface SignRequestOptions {
  body?: any;
  path: string;
  method: string;
}

class Request {
  static get(path: string, options?: OptionType) {
    return this.request({
      path: path,
      sign: options.sign,
      method: "GET",
    });
  }

  static post(path: string, options?: OptionType) {
    return this.request({
      path: path,
      sign: options.sign,
      method: "POST",
      body: options.body
    });
  }

  static put(path: string, options?: OptionType) {
    return this.request({
      path: path,
      sign: options.sign,
      method: "PUT",
      body: options.body
    });
  }

  private static signRequest(options: SignRequestOptions) {
    const headers: { [x: string]: any } = {};

    const privateKey = getPrivateKey();
    const keyId = getKeyId();
    const date = moment().locale('en').format(DATE_RFC2822);

    const body = options.body ? JSON.stringify(options.body) : "";
    console.log(body);


    const digest = crypto.createHash('sha256').update(body).digest('base64');

    const signature = `(request-target): ${options.method.toLowerCase()} ${options.path}
host: ${getAuthserviceUrl().replace('https://', '')}
date: ${date}
digest: SHA-256=${digest}`;

    const signedSignature = crypto.createSign('RSA-SHA256').update(signature).sign(privateKey, 'base64');
    const authorizationHeader = `Signature keyId="${keyId}", algorithm="rsa-sha256", headers="(request-target) host date digest", signature="${signedSignature}"`

    headers['Date'] = date;
    headers['Digest'] = `SHA-256=${digest}`;
    headers['Authorization'] = authorizationHeader;
    return headers;

  }

  static async request(options: RequestOptions) {
    let headers: { [x: string]: any } = {}
    if (options.sign) {
      const authorizationHeader = this.signRequest({
        body: options.body,
        path: options.path,
        method: options.method || "GET"
      });

      headers = { ...headers, ...authorizationHeader };
    }

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      console.log(headers);

      const res = await fetch(`${getAuthserviceUrl()}${options.path}`, {
        method: options.method || "GET",
        headers: headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      console.log(res.status);
      return res.json()
    } catch (e) {
      console.log(e);

      throw e;
    }
  }
}

export default Request;