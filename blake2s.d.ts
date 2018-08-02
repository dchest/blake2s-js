export as namespace BLAKE2s;

export type ByteArray = number[] | Uint8Array;

export default class BLAKE2s {
  constructor(digestLength: number | undefined, keyOrConfig: ByteArray | BLAKE2sConfig);
  processBlock(length: number): void;
  update(p: ByteArray, offset?: number, length?: number): this;
  digest(): Uint8Array;
  hexDigest(): string;
  digestLength: number;
  blockLength: number;
  keyLength: number;
  saltLength: number;
  personalizationLength: number;
}

export interface BLAKE2sConfig {
  key?: ByteArray;
  personalization?: ByteArray;
  salt?: ByteArray;
}
