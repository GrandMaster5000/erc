import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { expect, use } from 'chai';
import { ethers } from 'hardhat';
import { solidity } from 'ethereum-waffle';
import tokenJSON from '../artifacts/contracts/Erc.sol/TolikToken.json';

import type { TShop } from '../typechain/Erc.sol/TShop';
import type { TolikToken } from '../typechain/Erc.sol/TolikToken';
use(solidity);

describe('TShop', function () {
  let owner: SignerWithAddress;
  let buyer: SignerWithAddress;
  let shop: TShop;
  let erc20: TolikToken;

  beforeEach(async function () {
    [owner, buyer] = await ethers.getSigners();

    const TShop = await ethers.getContractFactory('TShop', owner);
    shop = (await TShop.deploy()) as TShop;
    await shop.deployed();

    erc20 = new ethers.Contract(
      await shop.token(),
      tokenJSON.abi,
      owner
    ) as TolikToken;
  });

  it('should have an owner and a token', async function () {
    expect(await shop.owner()).to.eq(owner.address);

    expect(await shop.token()).to.be.properAddress;
  });

  it('allows to buy', async function () {
    const tokenAmount = 3;

    const txData = {
      value: tokenAmount,
      to: shop.address,
    };

    const tx = await buyer.sendTransaction(txData);
    await tx.wait();

    expect(await erc20.balanceOf(buyer.address)).to.eq(tokenAmount);

    await expect(() => tx).to.changeEtherBalance(shop, tokenAmount);

    await expect(tx)
      .to.emit(shop, 'Bought')
      .withArgs(tokenAmount, buyer.address);
  });

  it('allows to sell', async function () {
    const tx = await buyer.sendTransaction({
      value: 3,
      to: shop.address,
    });
    await tx.wait();

    const sellAmount = 2;

    const approval = await erc20
      .connect(buyer)
      .approve(shop.address, sellAmount);

    await approval.wait();

    const sellTx = await shop.connect(buyer).sell(sellAmount);

    expect(await erc20.balanceOf(buyer.address)).to.eq(1);

    await expect(() => sellTx).to.changeEtherBalance(shop, -sellAmount);

    await expect(sellTx)
      .to.emit(shop, 'Sold')
      .withArgs(sellAmount, buyer.address);
  });
});
