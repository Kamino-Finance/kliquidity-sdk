import { Address, Rpc, GetProgramAccountsApi, Account, GetMultipleAccountsApi, Base58EncodedBytes } from '@solana/kit';
import { LUT_OWNER_KEY } from '../constants/pubkeys';
import { SolanaCluster } from '@hubbleprotocol/hubble-config';
import {
  ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS,
  AddressLookupTable,
  getAddressLookupTableDecoder,
} from '@solana-program/address-lookup-table';

const lutDecoder = getAddressLookupTableDecoder();

export async function getLookupTable(
  cluster: SolanaCluster,
  rpc: Rpc<GetProgramAccountsApi>
): Promise<Account<AddressLookupTable>[]> {
  if (cluster == 'mainnet-beta' || cluster == 'devnet') {
    return getAllUserLookupTables(rpc, LUT_OWNER_KEY);
  }
  return [];
}

export async function getAllUserLookupTables(
  c: Rpc<GetProgramAccountsApi>,
  user: Address
): Promise<Account<AddressLookupTable>[]> {
  const accountInfos = await c
    .getProgramAccounts(ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS, {
      filters: [
        {
          memcmp: {
            offset: 22n,
            bytes: user.toString() as Base58EncodedBytes,
            encoding: 'base58',
          },
        },
      ],
      encoding: 'base64',
    })
    .send();

  return accountInfos.map((info) => {
    const data = lutDecoder.decode(Buffer.from(info.account.data[0], 'base64'));
    const acc: Account<AddressLookupTable> = {
      executable: info.account.executable,
      programAddress: info.account.owner,
      lamports: info.account.lamports,
      address: info.pubkey,
      data: data,
      space: info.account.space,
    };
    return acc;
  });
}

export async function fetchMultipleLookupTableAccounts(
  rpc: Rpc<GetMultipleAccountsApi>,
  addresses: Address[]
): Promise<Account<AddressLookupTable>[]> {
  const accountInfos = await rpc.getMultipleAccounts(addresses).send();
  const luts: Account<AddressLookupTable>[] = [];
  for (let i = 0; i < accountInfos.value.length; i++) {
    const info = accountInfos.value[i];
    if (info === null) {
      throw new Error(`Could not get lookup table ${addresses[i]}`);
    }
    const address = addresses[i];
    const data = lutDecoder.decode(Buffer.from(info.data[0], 'base64'));
    const acc: Account<AddressLookupTable> = {
      executable: info.executable,
      programAddress: info.owner,
      lamports: info.lamports,
      address,
      data: data,
      space: info.space,
    };
    luts.push(acc);
  }
  return luts;
}
