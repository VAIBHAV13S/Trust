import { blake2b } from '@noble/hashes/blake2.js';

export const generateSalt = (): Uint8Array => {
    return window.crypto.getRandomValues(new Uint8Array(16));
};

export const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
};

export const hexToBytes = (hex: string): Uint8Array => {
    if (hex.startsWith('0x')) hex = hex.slice(2);
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
};

export const computeCommitment = (choice: number, salt: Uint8Array): Uint8Array => {
    // choice is 0, 1, or 2 (Cooperate, Betray, Abstain)
    // salt is 16 bytes
    // payload = choice (1 byte) || salt (16 bytes)

    const normalizedChoice = choice & 0xff;
    const payload = new Uint8Array(1 + salt.length);
    payload[0] = normalizedChoice;
    payload.set(salt, 1);

    // Blake2b-256
    return blake2b(payload, { dkLen: 32 });
};

export const CHOICE_MAP = {
    COOPERATE: 0,
    BETRAY: 1,
    ABSTAIN: 2,
} as const;

export type ChoiceKey = keyof typeof CHOICE_MAP;
