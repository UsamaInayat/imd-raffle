import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("IdentityMDRaffle (Chainlink VRF)", function () {
  this.timeout(120_000);

  async function deployFixture() {
    const [owner, alice, bob, carol, stranger] = await ethers.getSigners();

    const Mock721 = await ethers.getContractFactory("MockIdentityMD");
    const nft = await Mock721.deploy();
    await nft.waitForDeployment();

    const MockVrf = await ethers.getContractFactory("MockVRFCoordinatorV2Plus");
    const vrf = await MockVrf.deploy();
    await vrf.waitForDeployment();

    const Raffle = await ethers.getContractFactory("IdentityMDRaffle");
    const raffle = await Raffle.deploy(
      await nft.getAddress(),
      await vrf.getAddress(),
      owner.address,
      {
        keyHash: ethers.id("test-key-hash"),
        subscriptionId: 1n,
        callbackGasLimit: 100_000,
        requestConfirmations: 3,
        nativePayment: false,
      }
    );
    await raffle.waitForDeployment();

    await nft.mint(alice.address);
    await nft.mint(bob.address);
    await nft.mint(carol.address);

    return { owner, alice, bob, carol, stranger, nft, vrf, raffle };
  }

  async function receiveSeedViaVrf(
    raffle: Awaited<ReturnType<typeof deployFixture>>["raffle"],
    vrf: Awaited<ReturnType<typeof deployFixture>>["vrf"],
    raffleId: bigint,
    randomWord = 987_654_321n
  ) {
    const raffleData = await raffle.getRaffle(raffleId);
    const requestId = raffleData.vrfRequestId;
    await vrf.fulfillRandomWords(requestId, randomWord);
  }

  async function completeDraw(
    raffle: Awaited<ReturnType<typeof deployFixture>>["raffle"],
    vrf: Awaited<ReturnType<typeof deployFixture>>["vrf"],
    raffleId: bigint,
    randomWord = 987_654_321n
  ) {
    await receiveSeedViaVrf(raffle, vrf, raffleId, randomWord);
    await raffle.finalizeDraw(raffleId);
  }

  it("creates raffles and accepts holder entries", async () => {
    const { owner, alice, bob, raffle } = await deployFixture();
    const endsAt = (await time.latest()) + 3600;

    await raffle
      .connect(owner)
      .createRaffle("Genesis Drop", "First holder raffle", 1, endsAt);

    await expect(raffle.connect(alice).enter(0))
      .to.emit(raffle, "RaffleEntered")
      .withArgs(0, alice.address);

    await expect(raffle.connect(bob).enter(0))
      .to.emit(raffle, "RaffleEntered")
      .withArgs(0, bob.address);

    expect(await raffle.getEntryCount(0)).to.equal(2);
  });

  it("rejects non-holders and non-admins", async () => {
    const { owner, alice, stranger, raffle } = await deployFixture();
    const endsAt = (await time.latest()) + 3600;

    await expect(
      raffle.connect(stranger).createRaffle("Test", "", 1, endsAt)
    ).to.be.revertedWithCustomError(raffle, "NotAdmin");

    await raffle.connect(owner).createRaffle("Test", "", 1, endsAt);
    await expect(raffle.connect(stranger).enter(0)).to.be.revertedWithCustomError(
      raffle,
      "NotIdentityMDHolder"
    );
    await expect(raffle.connect(alice).enter(0)).to.not.be.reverted;
  });

  it("manages admins", async () => {
    const { owner, alice, raffle } = await deployFixture();
    await raffle.connect(owner).addAdmin(alice.address);
    expect(await raffle.isAdmin(alice.address)).to.equal(true);

    const endsAt = (await time.latest()) + 3600;
    await expect(
      raffle.connect(alice).createRaffle("Admin Drop", "", 1, endsAt)
    ).to.not.be.reverted;
  });

  it("snapshots eligible holders at requestDraw and excludes sold NFTs", async () => {
    const { owner, alice, bob, carol, nft, vrf, raffle } = await deployFixture();
    const endsAt = (await time.latest()) + 100;

    await raffle.connect(owner).createRaffle("Draw", "Verify me", 2, endsAt);
    await raffle.connect(alice).enter(0);
    await raffle.connect(bob).enter(0);
    await raffle.connect(carol).enter(0);

    await nft.connect(carol).transferFrom(carol.address, owner.address, 2n);

    await time.increaseTo(endsAt + 1);
    await expect(raffle.requestDraw(0)).to.emit(raffle, "DrawRequested");

    const eligible = await raffle.getEligibleEntriesAtDraw(0);
    expect(eligible.length).to.equal(2);
    expect(eligible).to.not.include(carol.address);

    await completeDraw(raffle, vrf, 0n);

    const [valid] = await raffle.verifyWinners(0);
    expect(valid).to.equal(true);
  });

  it("closes immediately without VRF when no eligible holders remain", async () => {
    const { owner, alice, bob, carol, nft, raffle } = await deployFixture();
    const endsAt = (await time.latest()) + 100;

    await raffle.connect(owner).createRaffle("Empty Draw", "", 2, endsAt);
    await raffle.connect(alice).enter(0);
    await raffle.connect(bob).enter(0);
    await raffle.connect(carol).enter(0);

    await nft.connect(alice).transferFrom(alice.address, owner.address, 0n);
    await nft.connect(bob).transferFrom(bob.address, owner.address, 1n);
    await nft.connect(carol).transferFrom(carol.address, owner.address, 2n);

    await time.increaseTo(endsAt + 1);
    await expect(raffle.requestDraw(0))
      .to.emit(raffle, "RaffleFinalized")
      .withArgs(0, 0, 0, 0);

    const raffleData = await raffle.getRaffle(0);
    expect(raffleData.status).to.equal(3); // Closed
    expect(raffleData.winners.length).to.equal(0);
    expect(raffleData.vrfRequestId).to.equal(0);

    const [valid] = await raffle.verifyWinners(0);
    expect(valid).to.equal(true);
  });

  it("allows admin to cancel open raffles", async () => {
    const { owner, alice, raffle } = await deployFixture();
    const endsAt = (await time.latest()) + 3600;

    await raffle.connect(owner).createRaffle("Cancel Me", "", 1, endsAt);
    await raffle.connect(alice).enter(0);

    await expect(raffle.connect(owner).cancelRaffle(0))
      .to.emit(raffle, "RaffleCancelled")
      .withArgs(0, owner.address);

    const raffleData = await raffle.getRaffle(0);
    expect(raffleData.status).to.equal(4); // Cancelled

    await expect(raffle.connect(alice).enter(0)).to.be.revertedWithCustomError(
      raffle,
      "RaffleNotOpen"
    );
  });

  it("requires finalizeDraw after VRF seed is received", async () => {
    const { owner, alice, bob, carol, vrf, raffle } = await deployFixture();
    const endsAt = (await time.latest()) + 100;

    await raffle.connect(owner).createRaffle("Draw", "Verify me", 2, endsAt);
    await raffle.connect(alice).enter(0);
    await raffle.connect(bob).enter(0);
    await raffle.connect(carol).enter(0);

    await time.increaseTo(endsAt + 1);
    await raffle.requestDraw(0);
    await receiveSeedViaVrf(raffle, vrf, 0n, 42n);

    let raffleData = await raffle.getRaffle(0);
    expect(raffleData.status).to.equal(2); // SeedReady
    expect(raffleData.randomSeed).to.equal(42n);
    expect(raffleData.winners.length).to.equal(0);

    await expect(raffle.finalizeDraw(0)).to.emit(raffle, "RaffleFinalized");

    raffleData = await raffle.getRaffle(0);
    expect(raffleData.status).to.equal(3); // Closed
    expect(raffleData.winners.length).to.equal(2);

    const [valid] = await raffle.verifyWinners(0);
    expect(valid).to.equal(true);
  });

  it("rejects finalizeDraw before seed is ready", async () => {
    const { owner, alice, vrf, raffle } = await deployFixture();
    const endsAt = (await time.latest()) + 100;

    await raffle.connect(owner).createRaffle("Draw", "", 1, endsAt);
    await raffle.connect(alice).enter(0);

    await time.increaseTo(endsAt + 1);
    await raffle.requestDraw(0);

    await expect(raffle.finalizeDraw(0)).to.be.revertedWithCustomError(
      raffle,
      "SeedNotReady"
    );

    await receiveSeedViaVrf(raffle, vrf, 0n);
    await expect(raffle.finalizeDraw(0)).to.not.be.reverted;
  });
});
