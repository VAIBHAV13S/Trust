declare module '@noble/hashes/blake2' {
    export function blake2b(msg: Uint8Array, opts?: { dkLen?: number; key?: Uint8Array; salt?: Uint8Array; personal?: Uint8Array }): Uint8Array;
}
