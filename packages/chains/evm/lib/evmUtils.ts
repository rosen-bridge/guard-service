import { transferABI } from './constants';
import { PaymentOrder, SinglePayment } from '@rosen-chains/abstract-chain';
import { Contract } from 'ethers';

/**
 * extracts every SinglePayment from PaymentOrder
 * @param orders the aggregated PaymentOrder
 * @returns the splitted PaymentOrder
 */
export const splitPaymentOrders = (orders: PaymentOrder): PaymentOrder => {
  return orders.reduce((sum: PaymentOrder, order: SinglePayment) => {
    if (order.assets.nativeToken !== 0n) {
      sum.push({
        address: order.address,
        assets: {
          nativeToken: order.assets.nativeToken,
          tokens: [],
        },
        extra: order.extra,
      });
    }
    order.assets.tokens.forEach((token) => {
      sum.push({
        address: order.address,
        assets: {
          nativeToken: 0n,
          tokens: [token],
        },
        extra: order.extra,
      });
    });
    return sum;
  }, []);
};

/**
 * generates calldata to execute `transfer` function in the given contract
 * @param contractAddress the address of the contract
 * @param to the recipient's address
 * @param amount the amount to be transfered
 * @returns calldata in hex string with the initial '0x'
 */
export const encodeTransferCallData = (
  contractAddress: string,
  to: string,
  amount: bigint
): string => {
  const contract = new Contract(contractAddress, transferABI, null);
  return contract.interface.encodeFunctionData('transfer', [to, amount]);
};

/**
 * checks whether the transaction is an erc-20 `transfer`
 * @param contractAddress the address of the contract
 * @param data the transaction's call data
 * @returns true if it performs a `transfer` call, otherwise false
 */
export const isTransfer = (contractAddress: string, data: string): boolean => {
  const contract = new Contract(contractAddress, transferABI, null);
  const description = contract.interface.parseTransaction({ data: data });

  if (description == null) return false;
  if (description.name !== 'transfer') return false;
  try {
    description.args[0];
  } catch {
    return false;
  }
  return true;
};

/**
 * extracts `to` and `value from calldata
 * @param contractAddress the address of the contract
 * @param to the recipient's address
 * @param amount the amount to be transfered
 * @returns the array of [`to`, `amount`], if can't decode, puts error inside the array
 */
export const decodeTransferCallData = (
  contractAddress: string,
  calldata: string
): Array<any> => {
  const contract = new Contract(contractAddress, transferABI, null);
  return contract.interface.decodeFunctionData('transfer', calldata);
};
