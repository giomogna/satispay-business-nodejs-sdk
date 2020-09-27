export interface Context {
  readonly privateKey: string;
  readonly keyId: string;
  readonly env: string;
  readonly authserviceUrl: string;
}

interface HasContext {
  readonly context?: Context;
}

let globalContext: Context;

function initSatispay(config: {
  privateKey: string,
  keyId: string,
  env?: 'staging' | 'production'
}): void {
  globalContext = {
    privateKey: config.privateKey,
    keyId: config.keyId,
    authserviceUrl: config.env === 'staging' ? 'https://staging.authservices.satispay.com' : 'https://authservices.satispay.com',
    env: config.env || 'production',
  };
}


function getContext(obj?: HasContext): Context {
  if (obj && obj.context) {
    return obj.context;
  }

  if (globalContext) {
    return globalContext;
  }

  throw new Error(`No global Satispay context. Did you forget to call \`initSatispay\`?`);
}

function getPrivateKey(obj?: HasContext): string {
  return getContext(obj).privateKey;
}

function getKeyId(obj?: HasContext): string {
  return getContext(obj).keyId;
}

function getAuthserviceUrl(obj?: HasContext): string {
  return getContext(obj).authserviceUrl;
}

function getEnv(obj?: HasContext): string {
  return getContext(obj).env;
}

export { initSatispay, getPrivateKey, getKeyId, getAuthserviceUrl, getEnv };