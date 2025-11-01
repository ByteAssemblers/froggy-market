import * as bitcoin from 'bitcoinjs-lib';

export const pepeNetwork: bitcoin.networks.Network = {
  messagePrefix: '\x19Pepecoin Signed Message:\n',
  bech32: 'pepe',
  bip32: {
    public: 0x02facafd, // EXT_PUBLIC_KEY
    private: 0x02fac398, // EXT_SECRET_KEY
  },
  pubKeyHash: 0x38, // 56 decimal → Addresses start with 'P'
  scriptHash: 0x16, // 22 decimal
  wif: 0x9e,        // 158 decimal
};