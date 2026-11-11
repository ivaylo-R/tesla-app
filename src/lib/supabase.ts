import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { CryptoDigestAlgorithm, digest, getRandomValues as expoGetRandomValues } from 'expo-crypto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

type CryptoWithOptionalSubtle = Omit<Crypto, 'subtle'> & { subtle?: SubtleCrypto };
type SecureRandomTypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array;

function binaryStringToBase64(input: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let index = 0; index < input.length; index += 3) {
    const first = input.charCodeAt(index);
    const hasSecond = index + 1 < input.length;
    const hasThird = index + 2 < input.length;
    const second = hasSecond ? input.charCodeAt(index + 1) : 0;
    const third = hasThird ? input.charCodeAt(index + 2) : 0;

    if (first > 0xff || second > 0xff || third > 0xff) {
      throw new TypeError('btoa input must contain only byte values.');
    }

    output += alphabet[first >> 2];
    output += alphabet[((first & 0x03) << 4) | (second >> 4)];
    output += hasSecond ? alphabet[((second & 0x0f) << 2) | (third >> 6)] : '=';
    output += hasThird ? alphabet[third & 0x3f] : '=';
  }

  return output;
}

function isSecureRandomTypedArray(value: ArrayBufferView): value is SecureRandomTypedArray {
  return (
    value instanceof Int8Array ||
    value instanceof Uint8Array ||
    value instanceof Uint8ClampedArray ||
    value instanceof Int16Array ||
    value instanceof Uint16Array ||
    value instanceof Int32Array ||
    value instanceof Uint32Array
  );
}

function installNativePkceCrypto() {
  if (Platform.OS === 'web') return;

  const runtimeGlobal = globalThis as unknown as { crypto?: CryptoWithOptionalSubtle };
  let cryptoObject = runtimeGlobal.crypto;
  if (!cryptoObject) {
    cryptoObject = {} as CryptoWithOptionalSubtle;
    try {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: cryptoObject,
        writable: true,
      });
    } catch {
      throw new Error('globalThis.crypto cannot be initialized for secure Supabase PKCE.');
    }
  }

  if (typeof expoGetRandomValues !== 'function') {
    throw new Error(
      'expo-crypto synchronous getRandomValues() is unavailable; refusing to start Supabase PKCE.'
    );
  }

  const fillWithExpoCrypto = <T extends ArrayBufferView>(typedArray: T): T => {
    if (!ArrayBuffer.isView(typedArray) || !isSecureRandomTypedArray(typedArray)) {
      throw new TypeError('Supabase PKCE requires an integer TypedArray for secure random values.');
    }

    try {
      const byteView = new Uint8Array(
        typedArray.buffer,
        typedArray.byteOffset,
        typedArray.byteLength
      );
      expoGetRandomValues(byteView);
      return typedArray;
    } catch {
      throw new Error(
        'expo-crypto native getRandomValues() is unavailable; refusing to start Supabase PKCE.'
      );
    }
  };

  try {
    Object.defineProperty(cryptoObject, 'getRandomValues', {
      configurable: true,
      value: fillWithExpoCrypto,
      writable: true,
    });
  } catch {
    throw new Error(
      'expo-crypto is available, but globalThis.crypto.getRandomValues could not be installed; refusing Supabase PKCE.'
    );
  }

  const randomProbe = new Uint8Array([0xa5, 0, 0x5a]);
  const randomProbeView = randomProbe.subarray(1, 2);
  if (
    fillWithExpoCrypto(randomProbeView) !== randomProbeView ||
    randomProbe[0] !== 0xa5 ||
    randomProbe[2] !== 0x5a
  ) {
    throw new Error(
      'expo-crypto native getRandomValues() failed its Uint8Array range check; refusing to start Supabase PKCE.'
    );
  }

  if (typeof TextEncoder === 'undefined') {
    throw new Error('TextEncoder is unavailable; refusing to start Supabase PKCE.');
  }

  if (typeof globalThis.btoa !== 'function') {
    Object.defineProperty(globalThis, 'btoa', {
      configurable: true,
      value: binaryStringToBase64,
    });
  }

  const existingSubtle = cryptoObject.subtle;
  if (typeof existingSubtle?.digest !== 'function') {
    const subtle = existingSubtle ?? ({} as SubtleCrypto);
    Object.defineProperty(subtle, 'digest', {
      configurable: true,
      value: (algorithm: AlgorithmIdentifier, data: BufferSource) => {
        const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
        if (name?.toUpperCase() !== CryptoDigestAlgorithm.SHA256) {
          throw new Error(`Unsupported native WebCrypto digest algorithm: ${name ?? 'unknown'}`);
        }
        return digest(CryptoDigestAlgorithm.SHA256, data);
      },
    });
    Object.defineProperty(cryptoObject, 'subtle', {
      configurable: true,
      value: subtle,
    });
  }

  if (typeof cryptoObject.subtle?.digest !== 'function' || typeof globalThis.btoa !== 'function') {
    throw new Error('SHA-256 PKCE support could not be initialized.');
  }
}

installNativePkceCrypto();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isWebServer = Platform.OS === 'web' && typeof window === 'undefined';

function getAuthStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return window.localStorage;
    }

    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

const authStorage = {
  async getItem(key: string) {
    return getAuthStorage()?.getItem(key) ?? null;
  },
  async setItem(key: string, value: string) {
    getAuthStorage()?.setItem(key, value);
  },
  async removeItem(key: string) {
    getAuthStorage()?.removeItem(key);
  },
};

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  !supabaseUrl.includes('YOUR_PROJECT_REF') &&
  !supabasePublishableKey.includes('YOUR_')
);

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        storage: authStorage,
        autoRefreshToken: !isWebServer,
        persistSession: !isWebServer,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;
