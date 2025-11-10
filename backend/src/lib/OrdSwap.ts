/* eslint-env es2020 */
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from '@bitcoinerlab/secp256k1';
import { pepeNetwork } from './pepeNetwork';
import {
  fetchUtxos,
  fetchRawTransaction,
  broadcastRawTxCore,
} from './inscribe';

function estimateFee(inCount: any, outCount: any, feePerByte: any) {
  const bytes = 10 + inCount * 148 + outCount * 34;
  return Math.ceil(bytes * feePerByte);
}

const ECPair = ECPairFactory(ecc);

export const SELLER_SIGHASH =
  bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY;

const DEFAULT_FEE_RATE: any = 10000; // sat/vB
const DEFAULT_POSTAGE_SATS: any = 1_000_000;
const SMALL_UTXO_MULTIPLIER = 2;
const DUST_THRESHOLD = 1_000_000;

function assertParam(condition: any, message: any) {
  if (!condition) {
    throw new Error(message);
  }
}

function toBuffer(data: any, encoding: any) {
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === 'string') {
    return Buffer.from(data, encoding);
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data);
  }
  throw new Error('Unsupported buffer conversion');
}

function createPlaceholderTransaction() {
  const phTx = new bitcoin.Transaction();
  phTx.version = 2;
  phTx.addInput(Buffer.alloc(32), 0xffffffff, 0xffffffff, Buffer.alloc(0));
  phTx.addOutput(Buffer.alloc(0), BigInt(0));
  phTx.addOutput(Buffer.alloc(0), BigInt(0));
  return phTx;
}

const ecValidator = (pubkey: any, msghash: any, signature: any) => {
  try {
    return ECPair.fromPublicKey(pubkey).verify(msghash, signature);
  } catch (_err) {
    return false;
  }
};

function deriveAddressFromKeyPair(keyPair: any) {
  const { payments } = bitcoin;
  const { address } = payments.p2pkh({
    pubkey: keyPair.publicKey,
    network: pepeNetwork,
  });
  return address;
}

function normalizeBigInt(value: any) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  if (typeof value === 'string' && value.trim()) {
    return BigInt(value.trim());
  }
  throw new Error('Unable to normalize value to bigint');
}

function normalizeInteger(value: any, defaultValue = null) {
  const num = Number(value);
  if (!Number.isFinite(num)) return defaultValue;
  return Math.trunc(num);
}

function sortAscValue(a: any, b: any) {
  const left = Number(a?.value ?? 0);
  const right = Number(b?.value ?? 0);
  return left - right;
}

function sortDescValue(a: any, b: any) {
  return sortAscValue(b, a);
}

function createUtxoKey(utxo: any) {
  if (!utxo) return '';
  const txid =
    typeof utxo.txid === 'string' ? utxo.txid.trim().toLowerCase() : '';
  const vout =
    typeof utxo.vout === 'number' ? utxo.vout : Number(utxo.vout ?? -1);
  return `${txid}:${vout}`;
}

function cacheKey(txid: any) {
  if (typeof txid !== 'string') return '';
  return txid.trim().toLowerCase();
}

function computeSplitDummyValue(postageSats: any) {
  const base = Math.max(1, Math.floor(Number(postageSats ?? 0)));
  const minValue = Math.floor(base * 1.3) + 1;
  const maxSmall = Math.max(minValue, Math.floor(base * SMALL_UTXO_MULTIPLIER));
  const target = Math.floor(base * 1.5);
  const bounded = Math.min(Math.max(target, minValue), maxSmall);
  return Math.max(minValue, bounded);
}

async function splitBuyerUtxo({
  candidate,
  buyerKey,
  buyerAddress,
  postageSats,
  feeRate,
  loadPrevHex,
}: any) {
  if (!candidate) {
    throw new Error('splitBuyerUtxo: candidate utxo required');
  }

  const utxoValue = normalizeBigInt(candidate.value);
  const dummyValue = normalizeBigInt(computeSplitDummyValue(postageSats));
  const feeEstimate = normalizeBigInt(estimateFee(1, 3, feeRate));
  const remainder = utxoValue - BigInt(2) * dummyValue - feeEstimate;

  if (remainder <= BigInt(DUST_THRESHOLD)) {
    throw new Error(
      'splitBuyerUtxo: insufficient value after split to remain above dust threshold',
    );
  }

  const prevHex = await loadPrevHex(candidate.txid);
  if (!prevHex) {
    throw new Error(
      'splitBuyerUtxo: failed to load raw transaction hex for candidate utxo',
    );
  }

  const splitPsbt = new bitcoin.Psbt({ network: pepeNetwork });
  splitPsbt.addInput({
    hash: candidate.txid,
    index: candidate.vout,
    nonWitnessUtxo: Buffer.from(prevHex, 'hex'),
  });

  const splitOutputs = [
    { address: buyerAddress, value: dummyValue },
    { address: buyerAddress, value: dummyValue },
    { address: buyerAddress, value: remainder },
  ];
  splitOutputs.forEach((output) => splitPsbt.addOutput(output));

  splitPsbt.signAllInputs(buyerKey);
  splitPsbt.finalizeAllInputs();
  splitPsbt.setMaximumFeeRate(1_000_000);

  const splitTx = splitPsbt.extractTransaction();
  const rawHex = splitTx.toHex();
  const txid = splitTx.getId().toLowerCase();

  await broadcastRawTxCore(rawHex);

  return {
    txid,
    rawHex,
    outputs: splitOutputs.map((output, index) => ({
      txid,
      vout: index,
      value: Number(output.value),
    })),
  };
}

async function ensureDummyInputs({
  buyerKey,
  buyerAddress,
  utxos,
  postageSats,
  feeRate,
  loadPrevHex,
  buyerPrevHexCache,
}: any) {
  const workingUtxos = Array.isArray(utxos) ? [...utxos] : [];
  const performedSplits: any = [];
  const triedCandidates = new Set();
  let lastSplitError = null;

  const buyerScript = bitcoin.address.toOutputScript(buyerAddress, pepeNetwork);
  const buyerScriptHex = Buffer.from(buyerScript ?? []).toString('hex');

  const findCandidatePool = (list: any) =>
    list
      .filter((utxo: any) => {
        if (!utxo) return false;
        const key = createUtxoKey(utxo);
        if (triedCandidates.has(key)) return false;
        return !isPotentialInscriptionUtxo(utxo, postageSats);
      })
      .sort(sortDescValue);

  let dummyInputs = pickTwoDummies(workingUtxos, postageSats);

  while (
    dummyInputs.length < 2 ||
    isOversizedDummyList(dummyInputs, postageSats)
  ) {
    const candidatePool = findCandidatePool(workingUtxos);
    if (!candidatePool.length) {
      break;
    }

    let splitSuccess = false;
    for (const candidate of candidatePool) {
      const candidateKey = createUtxoKey(candidate);
      triedCandidates.add(candidateKey);
      try {
        const splitResult = await splitBuyerUtxo({
          candidate,
          buyerKey,
          buyerAddress,
          postageSats,
          feeRate,
          loadPrevHex,
        });

        buyerPrevHexCache.set(cacheKey(splitResult.txid), splitResult.rawHex);

        const splitOutputs = splitResult.outputs.map((output) => ({
          txid: splitResult.txid,
          vout: output.vout,
          value: output.value,
          scriptPubKey: buyerScriptHex,
          confirmations: 0,
          rawTxHex: splitResult.rawHex,
        }));

        const filtered = workingUtxos.filter(
          (utxo) =>
            !(utxo.txid === candidate.txid && utxo.vout === candidate.vout),
        );
        workingUtxos.length = 0;
        workingUtxos.push(...filtered, ...splitOutputs);

        performedSplits.push({
          txid: splitResult.txid,
          rawHex: splitResult.rawHex,
        });
        splitSuccess = true;
        break;
      } catch (err) {
        lastSplitError = err;
      }
    }

    if (!splitSuccess) {
      break;
    }

    dummyInputs = pickTwoDummies(workingUtxos, postageSats);
  }

  return {
    utxos: workingUtxos,
    dummyInputs,
    performedSplits,
    lastSplitError,
  };
}

function isPotentialInscriptionUtxo(
  utxo: any,
  postageSats = DEFAULT_POSTAGE_SATS,
) {
  if (!utxo) return false;
  const value = Number(utxo.value);
  if (!Number.isFinite(value)) return false;
  const basePostage = Math.max(546, Math.floor(postageSats));
  const low = Math.max(546, Math.floor(basePostage * 0.8));
  const high = Math.floor(basePostage * 1.3);
  return value >= low && value <= high;
}

function isOversizedDummyList(
  dummyList: any,
  postageSats = DEFAULT_POSTAGE_SATS,
) {
  if (!Array.isArray(dummyList) || dummyList.length === 0) return false;
  const cutoff = Math.max(1, Math.floor(postageSats * SMALL_UTXO_MULTIPLIER));
  return dummyList.some((utxo) => {
    if (!utxo) return false;
    const value = Number(utxo.value);
    return Number.isFinite(value) && value > cutoff;
  });
}

function filterSpendable(
  utxos: any,
  {
    avoidSmall = false,
    avoidInscription = false,
    postageSats = DEFAULT_POSTAGE_SATS,
    smallCutoffMultiplier = SMALL_UTXO_MULTIPLIER,
  } = {},
) {
  const normalized = Array.isArray(utxos) ? utxos : [];
  const cutoff = Math.max(1, Math.floor(postageSats * smallCutoffMultiplier));
  return normalized.filter((utxo) => {
    if (!utxo) return false;
    const value = Number(utxo.value);
    if (!Number.isFinite(value)) return false;
    if (avoidInscription && isPotentialInscriptionUtxo(utxo, postageSats))
      return false;
    if (avoidSmall && value <= cutoff) return false;
    return true;
  });
}

function pickTwoDummies(utxos: any, postageSats = DEFAULT_POSTAGE_SATS) {
  const minValue = Math.max(1, Math.floor(postageSats));
  return (Array.isArray(utxos) ? utxos : [])
    .filter((utxo) => {
      if (!utxo) return false;
      const value = Number(utxo.value);
      if (!Number.isFinite(value)) return false;
      if (value < minValue) return false;
      return !isPotentialInscriptionUtxo(utxo, postageSats);
    })
    .sort(sortAscValue)
    .slice(0, 2);
}

export async function buildSellerListingPsbt({
  sellerWif,
  nftTxid,
  nftVout,
  priceSats,
  sellerReceiveAddress,
  postageSats,
}: any = {}) {
  const wif = typeof sellerWif === 'string' ? sellerWif.trim() : '';
  assertParam(wif, 'buildSellerListingPsbt: sellerWif is required');

  const txid = typeof nftTxid === 'string' ? nftTxid.trim().toLowerCase() : '';
  assertParam(
    txid && txid.length === 64,
    'buildSellerListingPsbt: nftTxid must be 64 hex characters',
  );

  const vout = Number(nftVout);
  assertParam(
    Number.isInteger(vout) && vout >= 0,
    'buildSellerListingPsbt: nftVout must be a non-negative integer',
  );

  const price = Number(priceSats);
  assertParam(
    Number.isFinite(price) && price > 0,
    'buildSellerListingPsbt: priceSats must be positive',
  );

  const sellerKey = ECPair.fromWIF(wif, pepeNetwork);
  const derivedAddress = deriveAddressFromKeyPair(sellerKey);
  const sellerAddr = sellerReceiveAddress
    ? sellerReceiveAddress.trim()
    : derivedAddress;

  const prevHex = await fetchRawTransaction(txid);
  const prevTx = bitcoin.Transaction.fromHex(prevHex);
  assertParam(
    vout < prevTx.outs.length,
    'buildSellerListingPsbt: nftVout out of range for the transaction',
  );
  const nftOutput = prevTx.outs[vout];
  const nftOutputValue = normalizeBigInt(nftOutput.value);

  if (postageSats != null) {
    const postage = normalizeBigInt(postageSats);
    assertParam(
      nftOutputValue >= postage,
      `NFT utxo value ${nftOutputValue} is smaller than required postage ${postage}`,
    );
  }

  // Detect the script type of the NFT output
  const scriptType = bitcoin.script.toASM(nftOutput.script);
  const isP2PKH = nftOutput.script.length === 25 &&
                   nftOutput.script[0] === 0x76 && // OP_DUP
                   nftOutput.script[1] === 0xa9;   // OP_HASH160

  // Build payment object for P2PKH
  const payment = bitcoin.payments.p2pkh({
    pubkey: sellerKey.publicKey,
    network: pepeNetwork,
  });

  // Verify the seller controls this UTXO
  const outputScript = Buffer.from(nftOutput.script).toString('hex');
  const expectedScript = payment.output ? Buffer.from(payment.output).toString('hex') : '';

  if (outputScript !== expectedScript) {
    throw new Error(
      `buildSellerListingPsbt: seller key does not control NFT UTXO.\n` +
      `Expected script: ${expectedScript}\n` +
      `Actual script: ${outputScript}\n` +
      `Make sure you're using the correct private key for address ${derivedAddress}`
    );
  }

  const placeholderTx = createPlaceholderTransaction();
  const placeholderHex = placeholderTx.toHex();
  const placeholderTxid = placeholderTx.getId();

  const psbt = new bitcoin.Psbt({ network: pepeNetwork });

  const placeholderBytes = toBuffer(placeholderHex, 'hex');
  psbt.addInput({
    hash: placeholderTxid,
    index: 0,
    nonWitnessUtxo: placeholderBytes,
  });
  psbt.addInput({
    hash: placeholderTxid,
    index: 1,
    nonWitnessUtxo: placeholderBytes,
  });

  // Add the NFT input with proper script information
  psbt.addInput({
    hash: txid,
    index: vout,
    nonWitnessUtxo: toBuffer(prevHex, 'hex'),
    sighashType: SELLER_SIGHASH,
  });

  psbt.addOutput({ script: Buffer.alloc(0), value: BigInt(0) });
  psbt.addOutput({ script: Buffer.alloc(0), value: BigInt(0) });
  psbt.addOutput({ address: sellerAddr, value: BigInt(Math.trunc(price)) });

  psbt.signInput(2, sellerKey, [SELLER_SIGHASH]);

  if (!psbt.validateSignaturesOfInput(2, ecValidator)) {
    throw new Error(
      'buildSellerListingPsbt: signature validation failed for seller input',
    );
  }

  const psbtBase64 = psbt.toBase64();
  return {
    psbtBase64,
    sellerRecvAddress: sellerAddr,
    sellerAddress: derivedAddress,
    priceSats: Math.trunc(price),
    nftOutputValue: Number(nftOutputValue),
  };
}

export async function completeBuyerFromSellerPsbt({
  sellerPsbtBase64,
  buyerWif,
  buyerReceiveAddress,
  platformAddress,
  platformFeeSats,
  postageSats = DEFAULT_POSTAGE_SATS,
  feeRate = DEFAULT_FEE_RATE,
  minConfirmations = 0,
}: any = {}) {
  const psbtBase64 =
    typeof sellerPsbtBase64 === 'string' ? sellerPsbtBase64.trim() : '';
  assertParam(
    psbtBase64,
    'completeBuyerFromSellerPsbt: sellerPsbtBase64 is required',
  );

  const wif = typeof buyerWif === 'string' ? buyerWif.trim() : '';
  assertParam(wif, 'completeBuyerFromSellerPsbt: buyerWif is required');

  const normalizedPostage: any = normalizeInteger(
    postageSats,
    DEFAULT_POSTAGE_SATS,
  );
  assertParam(
    normalizedPostage && normalizedPostage > 0,
    'completeBuyerFromSellerPsbt: postageSats must be a positive integer',
  );

  const normalizedFeeRate = normalizeInteger(feeRate, DEFAULT_FEE_RATE);
  assertParam(
    normalizedFeeRate && normalizedFeeRate > 0,
    'completeBuyerFromSellerPsbt: feeRate must be a positive integer',
  );

  const normalizedPlatformFee = normalizeInteger(platformFeeSats ?? 0) || 0;
  const platformAddr =
    typeof platformAddress === 'string' && platformAddress.trim().length
      ? platformAddress.trim()
      : '';

  const buyerKey = ECPair.fromWIF(wif, pepeNetwork);
  const buyerAddr: any = deriveAddressFromKeyPair(buyerKey);
  const receiveAddr =
    typeof buyerReceiveAddress === 'string' && buyerReceiveAddress.trim().length
      ? buyerReceiveAddress.trim()
      : buyerAddr;

  const sellerPsbt = bitcoin.Psbt.fromBase64(psbtBase64, {
    network: pepeNetwork,
  });
  assertParam(
    sellerPsbt.data.inputs.length >= 1,
    'completeBuyerFromSellerPsbt: seller PSBT must contain inputs',
  );
  assertParam(
    sellerPsbt.data.outputs.length >= 3,
    'completeBuyerFromSellerPsbt: seller PSBT missing expected outputs',
  );

  let sellerInputPos = sellerPsbt.data.inputs.findIndex(
    (input) => Array.isArray(input?.partialSig) && input.partialSig.length > 0,
  );
  if (sellerInputPos < 0) {
    sellerInputPos = sellerPsbt.data.inputs.length - 1;
  }

  const sellerInput = sellerPsbt.data.inputs[sellerInputPos];
  const sellerTxIn = sellerPsbt.txInputs[sellerInputPos];
  assertParam(
    sellerInput && sellerTxIn,
    'completeBuyerFromSellerPsbt: unable to locate seller input',
  );

  const sellerInputHashBuf = sellerTxIn.hash;
  const sellerInputIndex = sellerTxIn.index;
  const sellerTxid = Buffer.from(sellerInputHashBuf).reverse().toString('hex');

  let sellerPrevHex = '';
  if (sellerInput.nonWitnessUtxo && sellerInput.nonWitnessUtxo.length) {
    sellerPrevHex = Buffer.from(sellerInput.nonWitnessUtxo).toString('hex');
  } else {
    sellerPrevHex = await fetchRawTransaction(sellerTxid);
  }
  assertParam(
    sellerPrevHex && sellerPrevHex.length,
    'completeBuyerFromSellerPsbt: failed to load seller previous transaction',
  );

  const sellerPrevTx = bitcoin.Transaction.fromHex(sellerPrevHex);
  assertParam(
    sellerInputIndex < sellerPrevTx.outs.length,
    'completeBuyerFromSellerPsbt: seller input index out of range',
  );
  const nftValue = normalizeBigInt(sellerPrevTx.outs[sellerInputIndex].value);

  const sellerPriceOutput = sellerPsbt.txOutputs[2];
  assertParam(
    sellerPriceOutput &&
      sellerPriceOutput.value !== undefined &&
      sellerPriceOutput.value !== null,
    'completeBuyerFromSellerPsbt: seller price output missing',
  );
  const sellerPrice = normalizeBigInt(sellerPriceOutput.value);

  let buyerUtxoList = (await fetchUtxos(buyerAddr)).filter((utxo) => {
    if (!utxo) return false;
    if (!minConfirmations) return true;
    const confs = Number(utxo.confirmations || 0);
    return Number.isFinite(confs) && confs >= minConfirmations;
  });
  assertParam(
    buyerUtxoList.length > 0,
    'completeBuyerFromSellerPsbt: buyer wallet has no spendable UTXOs',
  );

  const buyerPrevHexCache = new Map();
  buyerUtxoList.forEach((utxo) => {
    const rawHex =
      typeof utxo.rawTxHex === 'string' ? utxo.rawTxHex.trim() : '';
    if (rawHex) {
      buyerPrevHexCache.set(cacheKey(utxo.txid), rawHex);
    }
  });

  const loadPrevHex = async (txid: any) => {
    const key = cacheKey(txid);
    assertParam(
      key,
      'completeBuyerFromSellerPsbt: invalid txid for previous hex lookup',
    );
    if (!buyerPrevHexCache.has(key)) {
      const prevHex = await fetchRawTransaction(txid);
      buyerPrevHexCache.set(key, prevHex);
    }
    return buyerPrevHexCache.get(key);
  };

  let dummyInputs = pickTwoDummies(buyerUtxoList, normalizedPostage);
  let performedSplits: any = [];
  let lastSplitError: any = null;

  const shouldEnsureDummyInputs =
    minConfirmations === 0 &&
    (dummyInputs.length < 2 ||
      isOversizedDummyList(dummyInputs, normalizedPostage));

  if (shouldEnsureDummyInputs) {
    const ensured = await ensureDummyInputs({
      buyerKey,
      buyerAddress: buyerAddr,
      utxos: buyerUtxoList,
      postageSats: normalizedPostage,
      feeRate: normalizedFeeRate,
      loadPrevHex,
      buyerPrevHexCache,
    });

    buyerUtxoList = ensured.utxos;
    dummyInputs = ensured.dummyInputs;
    performedSplits = ensured.performedSplits || [];
    lastSplitError = ensured.lastSplitError;
  }

  if (dummyInputs.length < 2) {
    const baseMessage =
      'completeBuyerFromSellerPsbt: need at least two eligible buyer UTXOs for dummy inputs';
    if (lastSplitError) {
      const reason =
        lastSplitError instanceof Error
          ? lastSplitError.message
          : String(lastSplitError);
      throw new Error(`${baseMessage} (split attempt failed: ${reason})`);
    }
    assertParam(false, baseMessage);
  }

  const dummyKeys = new Set(dummyInputs.map((utxo) => createUtxoKey(utxo)));
  const spendablePool = filterSpendable(buyerUtxoList, {
    avoidSmall: true,
    avoidInscription: true,
    postageSats: normalizedPostage,
  }).filter((utxo) => !dummyKeys.has(createUtxoKey(utxo)));

  assertParam(
    spendablePool.length > 0,
    'completeBuyerFromSellerPsbt: insufficient buyer liquidity to fund the swap',
  );

  const psbt = new bitcoin.Psbt({ network: pepeNetwork });

  // Dummy inputs occupy index 0 and 1
  for (const utxo of dummyInputs) {
    const prevHex = await loadPrevHex(utxo.txid);
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(prevHex, 'hex'),
    });
  }

  // Seller input at index 2 (preserve ANYONECANPAY signature)
  psbt.addInput({
    hash: sellerInputHashBuf,
    index: sellerInputIndex,
    nonWitnessUtxo: Buffer.from(sellerPrevHex, 'hex'),
    sighashType: SELLER_SIGHASH,
  });
  if (Array.isArray(sellerInput.partialSig) && sellerInput.partialSig.length) {
    psbt.updateInput(2, { partialSig: sellerInput.partialSig });
  }

  const outputs: any = [];
  const dummyValue =
    normalizeBigInt(dummyInputs[0].value) +
    normalizeBigInt(dummyInputs[1].value);
  outputs.push({ address: buyerAddr, value: dummyValue });
  outputs.push({ address: receiveAddr, value: nftValue });
  outputs.push({
    script: sellerPriceOutput.script,
    value: sellerPrice,
  });
  const platformFeeBigInt =
    platformAddr && normalizedPlatformFee > 0
      ? normalizeBigInt(normalizedPlatformFee)
      : BigInt(0);
  if (platformFeeBigInt > BigInt(0)) {
    outputs.push({ address: platformAddr, value: platformFeeBigInt });
  }
  const postageBigInt = normalizeBigInt(normalizedPostage);
  outputs.push({ address: buyerAddr, value: postageBigInt });
  outputs.push({ address: buyerAddr, value: postageBigInt });
  const changeIndex = outputs.length;
  outputs.push({ address: buyerAddr, value: BigInt(0) });

  const staticRequirement =
    sellerPrice + platformFeeBigInt + BigInt(2) * postageBigInt;

  const fundingPool = [...spendablePool].sort(sortAscValue);
  const pickedFunding: any = [];
  let fundingSum = BigInt(0);
  let feeEstimate = BigInt(0);

  for (let i = 0; i <= fundingPool.length; i += 1) {
    feeEstimate = BigInt(
      estimateFee(3 + pickedFunding.length, outputs.length, normalizedFeeRate),
    );
    const required = staticRequirement + feeEstimate + BigInt(DUST_THRESHOLD);
    if (fundingSum >= required) {
      break;
    }
    if (i === fundingPool.length) {
      assertParam(
        false,
        'completeBuyerFromSellerPsbt: not enough funds to cover price and fees',
      );
    }
    const next = fundingPool[i];
    pickedFunding.push(next);
    fundingSum += normalizeBigInt(next.value);
  }

  let buyerChange =
    fundingSum - (staticRequirement + feeEstimate + BigInt(DUST_THRESHOLD));
  if (buyerChange < BigInt(0)) {
    buyerChange = BigInt(0);
  }
  if (buyerChange > BigInt(0) && buyerChange < BigInt(DUST_THRESHOLD)) {
    buyerChange = BigInt(0);
  }
  outputs[changeIndex].value = buyerChange;

  for (const utxo of pickedFunding) {
    const prevHex = await loadPrevHex(utxo.txid);
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(prevHex, 'hex'),
    });
  }

  outputs.forEach((output) => {
    psbt.addOutput(output);
  });

  for (let idx = 0; idx < psbt.data.inputs.length; idx += 1) {
    if (idx === 2) continue;
    psbt.signInput(idx, buyerKey);
  }

  for (let idx = 0; idx < psbt.data.inputs.length; idx += 1) {
    if (idx === 2) continue;
    const valid = psbt.validateSignaturesOfInput(idx, ecValidator);
    assertParam(
      valid,
      `completeBuyerFromSellerPsbt: signature validation failed for input ${idx}`,
    );
  }

  psbt.finalizeAllInputs();
  psbt.setMaximumFeeRate(1_000_000);

  const signedPsbtBase64 = psbt.toBase64();
  const transaction = psbt.extractTransaction();
  const rawHex = transaction.toHex();
  const txid = transaction.getId();

  return {
    txid,
    rawHex,
    signedPsbtBase64,
    buyerAddress: buyerAddr,
    buyerReceiveAddress: receiveAddr,
    sellerPriceSats: Number(sellerPrice),
    platformFeeSats: normalizedPlatformFee,
    postageSats: normalizedPostage,
    buyerChangeSats: Number(buyerChange),
    splitTransactions: performedSplits.map((split: any) => split.txid),
  };
}

const pepeOrdSwap = {
  buildSellerListingPsbt,
  completeBuyerFromSellerPsbt,
  SELLER_SIGHASH,
};

export default pepeOrdSwap;
