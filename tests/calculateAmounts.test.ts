import { Connection, PublicKey } from '@solana/web3.js';
import { Kamino, noopProfiledFunctionExecution, StrategiesFilters, ZERO } from '../src';
import {
  GlobalConfigMainnet,
  KaminoProgramIdMainnet,
  SolUsdcShadowStrategyMainnet,
  UsdcUsdhShadowStrategyMainnet,
} from './utils';
import { WHIRLPOOL_PROGRAM_ID } from '../src/whirlpools-client/programId';
import { PROGRAM_ID as RAYDIUM_PROGRAM_ID } from '../src/raydium_client/programId';
import { expect } from 'chai';
import Decimal from 'decimal.js';

describe.skip('Kamino strategy creation SDK Tests', () => {
  const cluster = 'mainnet-beta';
  const clusterUrl: string = 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(clusterUrl, 'processed');

  it.skip('Calculate Mainnet Raydium ratio', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const res = await kamino.calculateAmountsToBeDeposited(
      new PublicKey('6satrFEw7p382wkJPcS1U3AWi25YcGiJuHkt7NyJa9vi'),
      new Decimal('19737586503'),
      new Decimal('60624622')
    );

    console.log('Res', res);
  });

  it.skip('Calculate Raydium ratios', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    console.log(
      await kamino.calculateAmountsToBeDeposited(
        new PublicKey('6satrFEw7p382wkJPcS1U3AWi25YcGiJuHkt7NyJa9vi'),
        new Decimal('19737586503'),
        new Decimal('0')
      )
    );
    console.log(
      await kamino.calculateAmountsToBeDeposited(
        new PublicKey('6satrFEw7p382wkJPcS1U3AWi25YcGiJuHkt7NyJa9vi'),
        new Decimal('19737586503')
      )
    );

    console.log(
      await kamino.calculateAmountsToBeDeposited(
        new PublicKey('6satrFEw7p382wkJPcS1U3AWi25YcGiJuHkt7NyJa9vi'),
        new Decimal('0'),
        new Decimal('61127955')
      )
    );

    console.log(
      await kamino.calculateAmountsToBeDeposited(
        new PublicKey('6satrFEw7p382wkJPcS1U3AWi25YcGiJuHkt7NyJa9vi'),
        undefined,
        new Decimal('61127955')
      )
    );

    console.log(
      await kamino.calculateAmountsToBeDeposited(
        new PublicKey('6satrFEw7p382wkJPcS1U3AWi25YcGiJuHkt7NyJa9vi'),
        new Decimal('19737580863'),
        new Decimal('61127955')
      )
    );
  });

  it('FilterStrats strategies based on status', async () => {
    console.log('test');

    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const filters: StrategiesFilters = {
      strategyCreationStatus: 'IGNORED',
      isCommunity: true,
    };

    const res = await kamino.getAllStrategiesWithFilters(filters);
    for (const strat of res) {
      console.log('Strat', strat.address.toString(), strat.strategy.isCommunity, strat.strategy.creationStatus);
      expect(strat.strategy.isCommunity).to.be.equal(1);
      expect(strat.strategy.creationStatus).to.be.equal(0);
    }
  });

  it('calculateAmountsToBeDepositedWithSwap for USDC-USDH pair, USDC provided only', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    // tokenA is 0 because the strat is USDH-USDC
    const calculatedAmountsWithSwap = await kamino.calculateAmountsToBeDepositedWithSwap(
      UsdcUsdhShadowStrategyMainnet,
      ZERO,
      new Decimal(100.0)
    );

    console.log('calculatedAmountsWithSwap', calculatedAmountsWithSwap);
    // verify that the total amount to be deposited matches the initial amount (as USDC is slightly bigger than USDH, we should get a total of tokens slightly bigger than what we input)
    expect(
      calculatedAmountsWithSwap.requiredAAmountToDeposit
        .add(calculatedAmountsWithSwap.requiredBAmountToDeposit)
        .gt(new Decimal(100.0))
    ).to.be.true;
    expect(
      calculatedAmountsWithSwap.requiredAAmountToDeposit
        .add(calculatedAmountsWithSwap.requiredBAmountToDeposit)
        .lt(new Decimal(101.0))
    ).to.be.true;

    // verify that given they have ±the same price, what amount to be swapped of USDC is very close to the amount of USDH to be bought
    expect(
      calculatedAmountsWithSwap.tokenAToSwapAmount
        .add(calculatedAmountsWithSwap.tokenBToSwapAmount)
        .abs()
        .lt(new Decimal(0.5))
    ).to.be.true;
  });

  it('calculateAmountsToBeDepositedWithSwap for USDC-USDH pair, too much USDH provided', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const calculatedAmountsWithSwap = await kamino.calculateAmountsToBeDepositedWithSwap(
      UsdcUsdhShadowStrategyMainnet,
      new Decimal(300.0),
      new Decimal(200.0)
    );

    console.log('calculatedAmountsWithSwap', calculatedAmountsWithSwap);
    // verify that the total amount to be deposited almost equals the initial amount (USDH is cheaper so we get less USDC)
    expect(
      calculatedAmountsWithSwap.requiredAAmountToDeposit
        .add(calculatedAmountsWithSwap.requiredBAmountToDeposit)
        .gt(new Decimal(499.5))
    ).to.be.true;
    expect(
      calculatedAmountsWithSwap.requiredAAmountToDeposit
        .add(calculatedAmountsWithSwap.requiredBAmountToDeposit)
        .lt(new Decimal(500.0))
    ).to.be.true;
    // verify that given they have ±the same price, what amount to be swapped of USDC is equal to the amount of USDH to be bought (we have to sell some USDH more because it is the cheaper token)
    expect(
      calculatedAmountsWithSwap.tokenAToSwapAmount
        .add(calculatedAmountsWithSwap.tokenBToSwapAmount)
        .abs()
        .lt(new Decimal(0.5))
    ).to.be.true;
  });

  it('calculateAmountsToBeDepositedWithSwap for SOL-USDC pair, SOL provided only', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    // tokenA is 0 because the strat is USDH-USDC
    const calculatedAmountsWithSwap = await kamino.calculateAmountsToBeDepositedWithSwap(
      SolUsdcShadowStrategyMainnet,
      new Decimal(4.0),
      ZERO
    );

    console.log('calculatedAmountsWithSwap', calculatedAmountsWithSwap);
  });

  it('calculateAmountsToBeDepositedWithSwap for SOL-USDC pair, USDC provided only', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    // tokenA is 0 because the strat is USDH-USDC
    const calculatedAmountsWithSwap = await kamino.calculateAmountsToBeDepositedWithSwap(
      SolUsdcShadowStrategyMainnet,
      ZERO,
      new Decimal(8.0)
    );

    console.log('calculatedAmountsWithSwap', calculatedAmountsWithSwap);
  });

  it('calculateAmountsToBeDepositedWithSwap for SOL-USDC pair, Price SOL/USDC 19', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const price = new Decimal(19.0);
    // tokenA is 0 because the strat is USDH-USDC
    const { requiredAAmountToDeposit, requiredBAmountToDeposit, tokenAToSwapAmount, tokenBToSwapAmount } =
      await kamino.calculateAmountsToBeDepositedWithSwap(
        SolUsdcShadowStrategyMainnet,
        ZERO,
        new Decimal(8.0),
        noopProfiledFunctionExecution,
        price
      );

    expect(requiredAAmountToDeposit.eq(tokenAToSwapAmount)).to.be.true;
    expect(requiredBAmountToDeposit.add(tokenBToSwapAmount.mul(new Decimal(-1))).eq(new Decimal(8.0))).to.be.true;

    const totalDepositValue = requiredAAmountToDeposit.mul(price).add(requiredBAmountToDeposit);
    expect(totalDepositValue.lt(new Decimal(8))).to.be.true;
    expect(totalDepositValue.gt(new Decimal(7.99))).to.be.true;
  });

  it('calculateAmountsToBeDepositedWithSwap for SOL-USDC pair, Price SOL/USDC 185.34, deposit both tokens in low amounts', async () => {
    const kamino = new Kamino(
      cluster,
      connection,
      GlobalConfigMainnet,
      KaminoProgramIdMainnet,
      WHIRLPOOL_PROGRAM_ID,
      RAYDIUM_PROGRAM_ID
    );

    const price = new Decimal(185.34);
    const solToDeposit = new Decimal(0.02);
    const usdcToDeposit = new Decimal(1.5);
    const { requiredAAmountToDeposit, requiredBAmountToDeposit, tokenAToSwapAmount, tokenBToSwapAmount } =
      await kamino.calculateAmountsToBeDepositedWithSwap(
        SolUsdcShadowStrategyMainnet,
        solToDeposit,
        usdcToDeposit,
        noopProfiledFunctionExecution,
        price
      );

    console.log('requiredAAmountToDeposit', requiredAAmountToDeposit.toString());
    console.log('requiredBAmountToDeposit', requiredBAmountToDeposit.toString());
    console.log('tokenAToSwapAmount', tokenAToSwapAmount.toString());
    console.log('tokenBToSwapAmount', tokenBToSwapAmount.toString());

    const totalBUsed = requiredBAmountToDeposit.add(tokenBToSwapAmount.mul(new Decimal(-1)));
    console.log('totalBUsed', totalBUsed.toString());
    expect(requiredAAmountToDeposit.eq(tokenAToSwapAmount.add(solToDeposit))).to.be.true;
    expect(totalBUsed.lt(usdcToDeposit)).to.be.true;
    expect(totalBUsed.gt(usdcToDeposit.sub(new Decimal(0.00001)))).to.be.true;

    const initialTotalValue = solToDeposit.mul(price).add(usdcToDeposit);
    const totalDepositValue = requiredAAmountToDeposit.mul(price).add(requiredBAmountToDeposit);
    expect(totalDepositValue.lt(initialTotalValue)).to.be.true;
    expect(totalDepositValue.gt(initialTotalValue.sub(new Decimal(0.001)))).to.be.true;
  });
});
