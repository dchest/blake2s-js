export as namespace BLAKE2s;

export type ByteArray = number[] | Uint8Array;

export default class BLAKE2s {
  constructor(digestLength?: number);
  constructor(digestLength: number | undefined, key: ByteArray);
  constructor(digestLength: number | undefined, config: BLAKE2sConfig);
  update(p: ByteArray, offset?: number, length?: number): this;
  digest(): Uint8Array;
  hexDigest(): string;
  static readonly digestLength: 32;
  static readonly blockLength: 64;
  static readonly keyLength: 32;
  static readonly saltLength: 8;
  static readonly personalizationLength: 8;
}

export const digestLength: 32;
export const blockLength: 64;
export const keyLength: 32;
export const saltLength: 8;
export const personalizationLength: 8;

export interface BLAKE2sConfig {
  key?: ByteArray;
  personalization?: ByteArray;
  salt?: ByteArray;
  hashLength?: number;
  maxLeafLength?: number;
  fanOut?: number;
  maxDepth?: number;
  nodeOffset?: number;
  xofDigestLength?: number;
}
