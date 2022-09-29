const { expect, use } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;
const { solidity } = require('ethereum-waffle');
use(solidity);

function numberToBytes32(_number) {
  return ethers.utils.hexZeroPad(ethers.BigNumber.from(_number).toHexString(), 32);
}

async function getCurrentTimestamp(blockNum) {
  blockNum = blockNum || await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNum);
  return block.timestamp;
}

function getEmittedEvent(eventName, receipt) {
  return receipt.events.find(({ event }) => event === eventName);
}

describe("Market", () => {
  let governor;
  let user1;
  let user2;
  let user3;
  let bidder1;
  let bidder2;
  let bidder3;
  let bidder4;
  let market1;
  let market2;

  let arbitrator;
  let curateProxy;
  let auctionContract;
  const markets = [
    "0x000000000000000000000000000000000000000A",
    "0x000000000000000000000000000000000000000B",
    "0x000000000000000000000000000000000000000C",
    "0x000000000000000000000000000000000000000D"
  ]

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const NIKE_AD = "PHN2ZyB3aWR0aD0iMjkwIiBoZWlnaHQ9IjQzMCIgdmlld0JveD0iMCAwIDI5MCA0MzAiCiAgICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgICB4bWxuczp4bGluaz0naHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayc+CgogICAgPHJlY3Qgd2lkdGg9IjI5MCIgaGVpZ2h0PSI0MzAiIGZpbGw9InJnYmEoMTUyLDIwNywyMzkpIiBzdHJva2U9InJnYmEoMTQsMTQsMTQpIi8+CiAgICA8YSBocmVmPSJodHRwczovL3d3dy5uaWtlLmNvbS8iPgogICAgICAgIDxwYXRoIHRyYW5zZm9ybT0idHJhbnNsYXRlKDUwLCA2NSkiIGQ9Ik00Mi43NDEgNzEuNDc3Yy05Ljg4MSAxMS42MDQtMTkuMzU1IDI1Ljk5NC0xOS40NSAzNi43NS0uMDM3IDQuMDQ3IDEuMjU1IDcuNTggNC4zNTQgMTAuMjU2IDQuNDYgMy44NTQgOS4zNzQgNS4yMTMgMTQuMjY0IDUuMjIxIDcuMTQ2LjAxIDE0LjI0Mi0yLjg3MyAxOS43OTgtNS4wOTYgOS4zNTctMy43NDIgMTEyLjc5LTQ4LjY1OSAxMTIuNzktNDguNjU5Ljk5OC0uNS44MTEtMS4xMjMtLjQzOC0uODEyLS41MDQuMTI2LTExMi42MDMgMzAuNTA1LTExMi42MDMgMzAuNTA1YTI0Ljc3MSAyNC43NzEgMCAwIDEtNi41MjQuOTM0Yy04LjYxNS4wNTEtMTYuMjgxLTQuNzMxLTE2LjIxOS0xNC44MDguMDI0LTMuOTQzIDEuMjMxLTguNjk4IDQuMDI4LTE0LjI5MXoiLz4KICAgICAgICA8dGV4dCB5PSIyNDBweCIgeD0iOTBweCIgZmlsbD0iIzIyMjIyMiIgZm9udC1mYW1pbHk9IidGdXR1cmEnLCBtb25vc3BhY2UiIGZvbnQtd2VpZ2h0PSJib2xkZXIiIGZvbnQtc2l6ZT0iMjBweCI+SlVTVCBETyBJVC48L3RleHQ+CiAgICA8L2E+Cjwvc3ZnPg==";
  const NIKE_PINK_AD = "PHN2ZyB3aWR0aD0iMjkwIiBoZWlnaHQ9IjQzMCIgdmlld0JveD0iMCAwIDI5MCA0MzAiCiAgICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgICB4bWxuczp4bGluaz0naHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayc+CiAgICA8cmVjdCB3aWR0aD0iMjkwIiBoZWlnaHQ9IjQzMCIgZmlsbD0icmdiYSgxODAsMTI1LDE1NSkiIHN0cm9rZT0icmdiYSgxNCwxNCwxNCkiLz4KICAgIDxhIGhyZWY9Imh0dHBzOi8vd3d3Lm5pa2UuY29tLyI+CiAgICAgICAgPHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNTAsIDY1KSIgZD0iTTQyLjc0MSA3MS40NzdjLTkuODgxIDExLjYwNC0xOS4zNTUgMjUuOTk0LTE5LjQ1IDM2Ljc1LS4wMzcgNC4wNDcgMS4yNTUgNy41OCA0LjM1NCAxMC4yNTYgNC40NiAzLjg1NCA5LjM3NCA1LjIxMyAxNC4yNjQgNS4yMjEgNy4xNDYuMDEgMTQuMjQyLTIuODczIDE5Ljc5OC01LjA5NiA5LjM1Ny0zLjc0MiAxMTIuNzktNDguNjU5IDExMi43OS00OC42NTkuOTk4LS41LjgxMS0xLjEyMy0uNDM4LS44MTItLjUwNC4xMjYtMTEyLjYwMyAzMC41MDUtMTEyLjYwMyAzMC41MDVhMjQuNzcxIDI0Ljc3MSAwIDAgMS02LjUyNC45MzRjLTguNjE1LjA1MS0xNi4yODEtNC43MzEtMTYuMjE5LTE0LjgwOC4wMjQtMy45NDMgMS4yMzEtOC42OTggNC4wMjgtMTQuMjkxeiIvPgogICAgICAgIDx0ZXh0IHk9IjI0MHB4IiB4PSI5MHB4IiBmaWxsPSIjMjIyMjIyIiBmb250LWZhbWlseT0iJ0Z1dHVyYScsIG1vbm9zcGFjZSIgZm9udC13ZWlnaHQ9ImJvbGRlciIgZm9udC1zaXplPSIyMHB4Ij5KVVNUIERPIElULjwvdGV4dD4KICAgIDwvYT4KPC9zdmc+";
  const ITEM_ID_1 = "0x0000000000000000000000000000000000000000000000000000000000000001";
  const ITEM_ID_PINK = "0x0000000000000000000000000000000000000000000000000000000000000002";
  const ITEM_ID_EMPTY = "0x0000000000000000000000000000000000000000000000000000000000000003";

  let nikeAdContract;
  let nikePinkAdContract;

  before("Get accounts", async () => {
    const accounts = await ethers.getSigners();
    governor = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];
    user3 = accounts[3];
    bidder1 = accounts[4];
    bidder2 = accounts[5];
    bidder3 = accounts[6];
    bidder4 = accounts[7];
    market1 = accounts[8];
    market2 = accounts[9];
  });

  beforeEach("initialize the contract", async function () {
    const CurateProxy = await ethers.getContractFactory("CurateProxySVGMock");
    curateProxy = await CurateProxy.deploy();
    await curateProxy.deployed();

    // Deploy SVG contract
    const Base64Ad = await ethers.getContractFactory("Base64AdMock");
    const base64Ad = await Base64Ad.deploy();
    await base64Ad.deployed();

    // Deploy SVG Factory contract
    const Base64AdFactory = await ethers.getContractFactory("Base64AdFactoryMock");
    const svgFactory = await Base64AdFactory.deploy(base64Ad.address);
    await svgFactory.deployed();

    // Deploy Billing contract
    const Billing = await ethers.getContractFactory("Billing");
    const billing = await Billing.deploy(governor.address, governor.address);
    await billing.deployed();

    // Deploy NFT Descriptor contract
    const FirstPriceAuction = await ethers.getContractFactory("FirstPriceAuction");
    auctionContract = await FirstPriceAuction.deploy(curateProxy.address, billing.address);
    await auctionContract.deployed();

    await svgFactory.createAd(NIKE_AD);
    nikeAdContract = await svgFactory.ads(0);
    await svgFactory.createAd(NIKE_PINK_AD);
    nikePinkAdContract = await svgFactory.ads(1);

    await curateProxy.setItem(ITEM_ID_1, nikeAdContract, true);
    await curateProxy.setItem(ITEM_ID_PINK, nikePinkAdContract, true);
  });

  describe("Placing Bids", () => {
    it("Should only accept valid bids.", async () => {
      await expect(
        auctionContract.placeBid(ITEM_ID_1, market1.address, 0, { value: 100 })
      ).to.be.revertedWith("reverted with panic code 0x12 (Division or modulo division by zero)");

      await expect(
        auctionContract.placeBid(ITEM_ID_1, market1.address, 1, { value: 0 })
      ).to.be.revertedWith("Not enough funds");
      await expect(
        auctionContract.placeBid(ITEM_ID_1, market1.address, 1, { value: 600 })
      ).to.be.revertedWith("Not enough funds");

      await expect(
        auctionContract.placeBid(ITEM_ID_EMPTY, market1.address, 1, { value: 601 })
      ).to.be.revertedWith("Item must be registered");

      await auctionContract.placeBid(ITEM_ID_1, market1.address, 1, { value: 601 });

      await auctionContract.placeBid(ITEM_ID_PINK, market2.address, 2, { value: 1202 });
    });

    it("Should insert bids correctly.", async () => {
      let bids;

      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 1202 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder1.address);
      expect(bids[1].bidder).to.eq(ZERO_ADDRESS);
      
      await auctionContract.connect(bidder2).placeBid(ITEM_ID_1, market1.address, 2, { value: 2404 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder1.address);
      expect(bids[1].bidder).to.eq(bidder2.address);
      expect(bids[2].bidder).to.eq(ZERO_ADDRESS);

      await ethers.provider.send('evm_increaseTime', [1202]);
      await ethers.provider.send('evm_mine');

      await auctionContract.connect(bidder3).placeBid(ITEM_ID_PINK, market1.address, 1, { value: 601 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder1.address);
      expect(bids[1].bidder).to.eq(bidder2.address);
      expect(bids[2].bidder).to.eq(bidder3.address);
      expect(bids[3].bidder).to.eq(ZERO_ADDRESS);

      await auctionContract.executeHighestBid(market1.address);

      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder2.address);
      expect(bids[1].bidder).to.eq(bidder3.address);
      expect(bids[2].bidder).to.eq(ZERO_ADDRESS);

      await auctionContract.executeHighestBid(market1.address);

      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder2.address);
      expect(bids[1].bidder).to.eq(bidder3.address);
      expect(bids[2].bidder).to.eq(ZERO_ADDRESS);

      await auctionContract.connect(bidder4).placeBid(ITEM_ID_PINK, market1.address, 10, { value: 10000 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder4.address);
      expect(bids[1].bidder).to.eq(bidder2.address);
      expect(bids[2].bidder).to.eq(bidder3.address);
      expect(bids[3].bidder).to.eq(ZERO_ADDRESS);
    });

    it("Should remove bid correctly.", async () => {
      let bids;

      await expect(
        auctionContract.removeBid(ITEM_ID_EMPTY, market1.address)
      ).to.be.revertedWith("Bid does not exist");

      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 1202 });
      await expect(
        auctionContract.connect(user1).removeBid(ITEM_ID_1, market1.address)
      ).to.be.revertedWith("Bid does not exist");

      await auctionContract.connect(bidder1).removeBid(ITEM_ID_1, market1.address);
      await expect(
        auctionContract.connect(bidder1).removeBid(ITEM_ID_1, market1.address)
      ).to.be.revertedWith("Bid already removed");
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(ZERO_ADDRESS);

      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 1202 });
      await auctionContract.connect(bidder2).placeBid(ITEM_ID_1, market1.address, 2, { value: 2404 });
      await auctionContract.connect(bidder1).removeBid(ITEM_ID_1, market1.address);
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder2.address);
      expect(bids[1].bidder).to.eq(ZERO_ADDRESS);
      await auctionContract.connect(bidder2).removeBid(ITEM_ID_1, market1.address);
      
      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 1202 });
      await auctionContract.connect(bidder2).placeBid(ITEM_ID_1, market1.address, 2, { value: 2404 });
      await auctionContract.connect(bidder3).placeBid(ITEM_ID_1, market1.address, 1, { value: 2404 });
      await auctionContract.connect(bidder2).removeBid(ITEM_ID_1, market1.address);
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder1.address);
      expect(bids[1].bidder).to.eq(bidder3.address);
      expect(bids[2].bidder).to.eq(ZERO_ADDRESS);

      await auctionContract.connect(bidder2).placeBid(ITEM_ID_1, market1.address, 2, { value: 2404 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder1.address);
      expect(bids[1].bidder).to.eq(bidder2.address);
      expect(bids[2].bidder).to.eq(bidder3.address);
      expect(bids[3].bidder).to.eq(ZERO_ADDRESS);
    });

    it("Should increase bid's balance correctly.", async () => {
      let bids;

      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 1202 });
      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 32 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].balance).to.eq(BigNumber.from(1234));
      expect(bids[1].bidder).to.eq(ZERO_ADDRESS);

      await auctionContract.connect(bidder1).removeBid(ITEM_ID_1, market1.address);
      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 1234 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].balance).to.eq(BigNumber.from(1234));
      expect(bids[1].bidder).to.eq(ZERO_ADDRESS);

      await ethers.provider.send('evm_increaseTime', [500]);
      await ethers.provider.send('evm_mine');
      await auctionContract.executeHighestBid(market1.address);

      await expect(
        auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 32 })
      ).to.be.revertedWith("Not enough funds");

      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 2000 });
      
      await ethers.provider.send('evm_increaseTime', [2000]);
      await ethers.provider.send('evm_mine');
      
      await auctionContract.executeHighestBid(market1.address);
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(ZERO_ADDRESS);

      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 1234 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].balance).to.eq(BigNumber.from(1234));
      expect(bids[1].bidder).to.eq(ZERO_ADDRESS);
    });

    it("Should update bid's balance correctly.", async () => {
      let bids;

      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 1202 });
      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 32 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[1].bidder).to.eq(ZERO_ADDRESS);

      await auctionContract.connect(bidder1).removeBid(ITEM_ID_1, market1.address);
      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 1234 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[1].bidder).to.eq(ZERO_ADDRESS);

      await ethers.provider.send('evm_increaseTime', [500]);
      await ethers.provider.send('evm_mine');
      await auctionContract.executeHighestBid(market1.address);

      await expect(
        auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 32 })
      ).to.be.revertedWith("Not enough funds");

      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 2000 });
      
      await ethers.provider.send('evm_increaseTime', [2000]);
      await ethers.provider.send('evm_mine');
      
      await auctionContract.executeHighestBid(market1.address);
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(ZERO_ADDRESS);

      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 1234 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].balance).to.eq(BigNumber.from(1234));
      expect(bids[1].bidder).to.eq(ZERO_ADDRESS);
    });

    it("Should update bid correctly.", async () => {
      let bids;

      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 1202 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder1.address);
      expect(bids[1].bidder).to.eq(ZERO_ADDRESS);
      
      await auctionContract.connect(bidder2).placeBid(ITEM_ID_1, market1.address, 2, { value: 2404 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder1.address);
      expect(bids[1].bidder).to.eq(bidder2.address);
      expect(bids[2].bidder).to.eq(ZERO_ADDRESS);

      await ethers.provider.send('evm_increaseTime', [1202]);
      await ethers.provider.send('evm_mine');

      await auctionContract.connect(bidder3).placeBid(ITEM_ID_PINK, market1.address, 1, { value: 601 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder1.address);
      expect(bids[1].bidder).to.eq(bidder2.address);
      expect(bids[2].bidder).to.eq(bidder3.address);
      expect(bids[3].bidder).to.eq(ZERO_ADDRESS);

      await auctionContract.executeHighestBid(market1.address);

      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder2.address);
      expect(bids[1].bidder).to.eq(bidder3.address);
      expect(bids[2].bidder).to.eq(ZERO_ADDRESS);

      await auctionContract.executeHighestBid(market1.address);
      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 1, { value: 601 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder2.address);
      expect(bids[1].bidder).to.eq(bidder3.address);
      expect(bids[2].bidder).to.eq(bidder1.address);
      expect(bids[3].bidder).to.eq(ZERO_ADDRESS);

      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 10, { value: 10000 });
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder1.address);
      expect(bids[1].bidder).to.eq(bidder2.address);
      expect(bids[2].bidder).to.eq(bidder3.address);
      expect(bids[3].bidder).to.eq(ZERO_ADDRESS);

      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2);
      bids = await auctionContract.getBids(market1.address, 0, 5);
      expect(bids[0].bidder).to.eq(bidder2.address);
      expect(bids[1].bidder).to.eq(bidder1.address);
      expect(bids[2].bidder).to.eq(bidder3.address);
      expect(bids[3].bidder).to.eq(ZERO_ADDRESS);
    });

    it("Should get ads correctly.", async () => {
      let svg;

      await auctionContract.connect(bidder1).placeBid(ITEM_ID_1, market1.address, 2, { value: 1202 });
      svg = await auctionContract.getAd(market1.address, 0);
      expect(svg).to.eq(NIKE_AD);
      
      await auctionContract.connect(bidder2).placeBid(ITEM_ID_1, market1.address, 2, { value: 2404 });
      svg = await auctionContract.getAd(market1.address, 10000);
      expect(svg).to.eq(NIKE_AD);

      await ethers.provider.send('evm_increaseTime', [1202]);
      await ethers.provider.send('evm_mine');

      await auctionContract.connect(bidder3).placeBid(ITEM_ID_PINK, market1.address, 1, { value: 601 });
      svg = await auctionContract.getAd(market1.address, 0);
      expect(svg).to.eq(NIKE_AD);

      await auctionContract.executeHighestBid(market1.address);

      svg = await auctionContract.getAd(market1.address, 0);
      expect(svg).to.eq(NIKE_AD);

      await auctionContract.executeHighestBid(market1.address);

      svg = await auctionContract.getAd(market1.address, 0);
      expect(svg).to.eq(NIKE_AD);

      await auctionContract.connect(bidder4).placeBid(ITEM_ID_PINK, market1.address, 10, { value: 10000 });
      svg = await auctionContract.getAd(market1.address, 0);
      expect(svg).to.eq(NIKE_PINK_AD);

      svg = await auctionContract.getAd(market2.address, 0);
      expect(svg).to.eq("");

      const corruptedItemID = "0x0000000000000000000000000000000000000000000000000000000000000005";
      await curateProxy.setItem(corruptedItemID, user1.address, true);
      await auctionContract.connect(bidder4).placeBid(corruptedItemID, market1.address, 11, { value: 110000 });
      svg = await auctionContract.getAd(market1.address, 0);
      expect(svg).to.eq("");
    });
  });
});