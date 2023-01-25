const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');

describe('ParadiseNFT', function () {
  async function deployParadiseNFTFixture() {
    const [owner, ...accounts] = await ethers.getSigners();

    const baseURI = 'https://paradise.game';

    const Token = await ethers.getContractFactory('Token');
    const token = await Token.deploy();

    const ParadiseNFT = await ethers.getContractFactory('ParadiseNFT');
    const paradiseNFT = await ParadiseNFT.deploy(baseURI, token.address);

    await token.transfer(paradiseNFT.address, 1000);

    return { paradiseNFT, owner, token, baseURI, accounts };
  }

  /**
   * Deployment
   */
  describe('Deployment', function () {
    /**
     * 소유자 및 토큰 설정 확인
     *
     * 배포 후 테스트 진행
     */
    it('Should set the right owner, token', async function () {
      const { paradiseNFT, owner, token } = await loadFixture(
        deployParadiseNFTFixture
      );

      expect(await paradiseNFT.owner()).to.equal(owner.address);
      expect(await paradiseNFT.token()).to.equal(token.address);
    });
  });

  /**
   * URI
   */
  describe('URI', function () {
    /**
     * 토큰 URI 설정 및 반환 확인
     */
    it('Should set & return the right URI', async function () {
      const { paradiseNFT, baseURI } = await loadFixture(
        deployParadiseNFTFixture
      );

      const tokenId = 1;

      await paradiseNFT.setURI(tokenId, `/${tokenId}`);

      expect(await paradiseNFT.uri(tokenId)).to.equal(`${baseURI}/${tokenId}`);
    });

    /**
     * 기본 URI 변경 및 반환 확인
     */
    it('Should set the right base URI', async function () {
      const { paradiseNFT } = await loadFixture(deployParadiseNFTFixture);

      const changedBaseURI = 'https://changed-base-url.com';

      await paradiseNFT.setURI(1, '/1');
      await paradiseNFT.setBaseURI(changedBaseURI);

      expect(await paradiseNFT.uri(1)).to.equal(`${changedBaseURI}/1`);
    });
  });

  /**
   * Minting
   */
  describe('Minting', function () {
    /**
     * 토큰 발행 후 잔액 확인
     *
     * 1. 토큰 발행
     * 2. 발행된 토큰 잔액 확인
     */
    it('Should mint a token', async function () {
      const {
        paradiseNFT,
        accounts: [account],
      } = await loadFixture(deployParadiseNFTFixture);

      const tokenId = 1;
      const amount = 1;
      const data = '0x';

      await paradiseNFT.mint(account.address, tokenId, amount, data);

      expect(await paradiseNFT.balanceOf(account.address, tokenId)).to.equal(
        amount
      );
    });

    /**
     * 토큰 발행 실패
     *
     * - 잘못된 토큰 ID로 발행 시도
     * - 발행 가능한 토큰 수를 초과하여 발행 시도
     */
    it('Should failed mint a token', async function () {
      const {
        paradiseNFT,
        accounts: [account],
      } = await loadFixture(deployParadiseNFTFixture);

      const data = '0x';
      const wrongTokenId = 2;
      const amount = 1;

      expect(
        paradiseNFT.mint(account.address, wrongTokenId, amount, data)
      ).to.be.revertedWith('ParadiseNFT: Invalid token id');

      const tokenId = 1;
      const aLotOfAmount = 10000;

      await expect(
        paradiseNFT.mint(account.address, tokenId, aLotOfAmount, data)
      ).to.be.revertedWith('ParadiseNFT: Not enough tokens to transfer');
    });

    /**
     * 여러 토큰 발행 후 잔액 확인
     *
     * 1. 여러 토큰 발행(mintBatch)
     * 2. 발행된 토큰 잔액 확인(balanceOfBatch)
     */
    it('Should mint multiple tokens', async function () {
      const {
        paradiseNFT,
        accounts: [account],
      } = await loadFixture(deployParadiseNFTFixture);

      const tokenIds = [1, 10];
      const amounts = [1, 1];
      const data = '0x';

      await paradiseNFT.mintBatch(account.address, tokenIds, amounts, data);

      expect(
        await paradiseNFT
          .balanceOfBatch([account.address, account.address], tokenIds)
          .then((balances) => balances.map((balance) => balance.toNumber()))
      ).to.eql(amounts);
    });

    /**
     * 여러 토큰 발행 실패
     *
     * - 잘못된 토큰 ID로 발행 시도
     * - 발행 가능한 토큰 수를 초과하여 발행 시도
     */
    it('Should failed mint multiple tokens', async function () {
      const {
        paradiseNFT,
        accounts: [account],
      } = await loadFixture(deployParadiseNFTFixture);

      const tokenIds = [1, 10];
      const amounts = [1, 1];
      const data = '0x';

      const wrongTokenIds = [2, 3];

      await expect(
        paradiseNFT.mintBatch(account.address, wrongTokenIds, amounts, data)
      ).to.be.revertedWith('ParadiseNFT: Invalid token id');

      const aLotOfAmounts = [1, 100];

      await expect(
        paradiseNFT.mintBatch(account.address, tokenIds, aLotOfAmounts, data)
      ).to.be.revertedWith('ParadiseNFT: Not enough tokens to transfer');
    });

    /**
     * 토큰 발행 실패
     *
     * - 소유자가 아닌 계정으로 발행 시도
     */
    it('Should revert if not called by the owner', async function () {
      const {
        paradiseNFT,
        accounts: [account],
      } = await loadFixture(deployParadiseNFTFixture);

      const tokenId = 1;
      const amount = 1;
      const data = '0x';

      await expect(
        paradiseNFT
          .connect(account)
          .mint(account.address, tokenId, amount, data)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  /**
   * Burning
   */
  describe('Burn', function () {
    /**
     * 토큰 소각
     *
     * 1. 토큰 발행(mint)
     * 2. 토큰 소각(burn)
     * 3. 토큰 잔액 확인(balanceOf)
     *
     * 소각된 토큰 잔액이 0
     */
    it('Should burn a token', async function () {
      const {
        paradiseNFT,
        accounts: [account],
      } = await loadFixture(deployParadiseNFTFixture);

      const tokenId = 1;
      const amount = 1;

      await paradiseNFT.mint(account.address, tokenId, amount, '0x');

      const balanceOf = () => paradiseNFT.balanceOf(account.address, tokenId);

      expect(await balanceOf()).to.equal(amount);
      await paradiseNFT.burn(account.address, tokenId, amount);

      expect(await balanceOf()).to.equal(0);
    });

    /**
     * 토큰 소각 실패
     *
     * - 소각할 토큰 잔액이 부족한 경우
     * - 소각할 토큰 ID가 잘못된 경우
     */
    it('Should failed burn a token', async function () {
      const {
        paradiseNFT,
        accounts: [account],
      } = await loadFixture(deployParadiseNFTFixture);

      const tokenId = 1;
      const amount = 1;

      await expect(
        paradiseNFT.burn(account.address, tokenId, amount)
      ).to.be.revertedWith('ERC1155: burn amount exceeds balance');

      await paradiseNFT.mint(account.address, tokenId, amount, '0x');

      await expect(
        paradiseNFT.burn(account.address, tokenId, amount + 1)
      ).to.be.revertedWith('ERC1155: burn amount exceeds balance');

      await expect(
        paradiseNFT.burn(account.address, tokenId + 1, amount)
      ).to.be.revertedWith('ERC1155: burn amount exceeds balance');
    });

    /**
     * 여러 토큰 소각
     *
     * 1. 여러 토큰 발행(mintBatch)
     * 2. 여러 토큰 소각(burnBatch)
     * 3. 여러 토큰 잔액 확인(balanceOfBatch)
     *
     * 소각된 토큰 잔액이 0
     */
    it('Should burn multiple tokens', async function () {
      const {
        paradiseNFT,
        accounts: [account],
      } = await loadFixture(deployParadiseNFTFixture);

      const tokenIds = [1, 10];
      const amounts = [1, 1];

      await paradiseNFT.mintBatch(account.address, tokenIds, amounts, '0x');

      const balanceOfBatch = () =>
        paradiseNFT
          .balanceOfBatch([account.address, account.address], tokenIds)
          .then((balances) => balances.map((balance) => balance.toNumber()));

      expect(await balanceOfBatch()).to.eql(amounts);

      await paradiseNFT.burnBatch(account.address, tokenIds, amounts);

      expect(await balanceOfBatch()).to.eql([0, 0]);
    });

    /**
     * 여러 토큰 소각 실패
     *
     * - 소각할 토큰 잔액이 부족한 경우
     * - 소각할 토큰이 존재하지 않는 경우
     */
    it('Should failed burn multiple tokens', async function () {
      const {
        paradiseNFT,
        accounts: [account],
      } = await loadFixture(deployParadiseNFTFixture);

      const tokenIds = [1, 10];
      const amounts = [1, 1];

      await expect(
        paradiseNFT.burnBatch(account.address, tokenIds, amounts)
      ).to.be.revertedWith('ERC1155: burn amount exceeds balance');

      await paradiseNFT.mintBatch(account.address, tokenIds, amounts, '0x');

      await expect(
        paradiseNFT.burnBatch(account.address, tokenIds, [amounts[0], 2])
      ).to.be.revertedWith('ERC1155: burn amount exceeds balance');

      await expect(
        paradiseNFT.burnBatch(account.address, [tokenIds[0], 11], amounts)
      ).to.be.revertedWith('ERC1155: burn amount exceeds balance');
    });
  });

  describe('Swap', function () {
    /**
     * 토큰 교환
     *
     * 1. 토큰 발행(mint)
     * 2. 토큰 교환(swap)
     * 3. 토큰 잔액 확인(balanceOf)
     *
     * 교환된 토큰 잔액이 0
     */
    it('Should swap a token', async function () {
      const {
        paradiseNFT,
        accounts: [account],
        token,
      } = await loadFixture(deployParadiseNFTFixture);

      const tokenId = 1;
      const amount = 1;

      await paradiseNFT.mint(account.address, tokenId, amount, '0x');

      const balanceOf = () => paradiseNFT.balanceOf(account.address, tokenId);

      expect(await balanceOf()).to.equal(amount);
      await paradiseNFT.connect(account).swap(tokenId, amount);

      expect(await balanceOf()).to.equal(0);
      expect(await token.balanceOf(account.address)).to.equal(amount);
    });

    /**
     * 토큰 교환 실패
     *
     * - 교환할 토큰 잔액이 부족한 경우
     * - 교환할 토큰 ID가 잘못된 경우
     */
    it('Should failed swap a token', async function () {
      const {
        paradiseNFT: _paradiseNFT,
        accounts: [account],
      } = await loadFixture(deployParadiseNFTFixture);

      const tokenId = 1;
      const amount = 1;

      const paradiseNFT = _paradiseNFT.connect(account);

      await expect(paradiseNFT.swap(tokenId, amount)).to.be.revertedWith(
        'ERC1155: burn amount exceeds balance'
      );

      await _paradiseNFT.mint(account.address, tokenId, amount, '0x');

      await expect(paradiseNFT.swap(tokenId, amount + 1)).to.be.revertedWith(
        'ERC1155: burn amount exceeds balance'
      );

      await expect(paradiseNFT.swap(tokenId + 1, amount)).to.be.revertedWith(
        'ParadiseNFT: Invalid token id'
      );
    });

    it('Should swap multiple tokens', async function () {
      const {
        paradiseNFT,
        accounts: [account],
        token,
      } = await loadFixture(deployParadiseNFTFixture);

      const tokenIds = [1, 10];
      const amounts = [1, 1];

      await paradiseNFT.mintBatch(account.address, tokenIds, amounts, '0x');

      const balanceOfBatch = () =>
        paradiseNFT
          .balanceOfBatch([account.address, account.address], tokenIds)
          .then((balances) => balances.map((balance) => balance.toNumber()));

      expect(await balanceOfBatch()).to.eql(amounts);

      await paradiseNFT.connect(account).swapBatch(tokenIds, amounts);

      expect(await balanceOfBatch()).to.eql([0, 0]);
      expect(await token.balanceOf(account.address)).to.equal(11);
    });

    it('Should failed swap multiple tokens', async function () {
      const {
        paradiseNFT: _paradiseNFT,
        accounts: [account],
      } = await loadFixture(deployParadiseNFTFixture);

      const tokenIds = [1, 10];
      const amounts = [1, 1];

      const paradiseNFT = _paradiseNFT.connect(account);

      await expect(paradiseNFT.swapBatch(tokenIds, amounts)).to.be.revertedWith(
        'ERC1155: burn amount exceeds balance'
      );

      await _paradiseNFT.mintBatch(account.address, tokenIds, amounts, '0x');

      await expect(
        paradiseNFT.swapBatch(tokenIds, [amounts[0], 2])
      ).to.be.revertedWith('ERC1155: burn amount exceeds balance');

      await expect(
        paradiseNFT.swapBatch([tokenIds[0], 11], amounts)
      ).to.be.revertedWith('ParadiseNFT: Invalid token id');
    });
  });
});
