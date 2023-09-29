import { Controller, Get, Query } from '@nestjs/common';
import { TokenTradingService } from './token-trading.service';
import { utils } from 'ethers';

@Controller('token-trading')
export class TokenTradingController {
  constructor(private readonly tokenTradingService: TokenTradingService) {}

  @Get('set-wallet')
  setWallet(@Query('walletNumbers') walletNumbersStr: string): string {
    if (!walletNumbersStr) {
      return 'Không có số ví nào được cung cấp.';
    }

    const walletNumbers = walletNumbersStr.split(',').map(Number);

    const validWalletNumbers = walletNumbers.filter((num) => !isNaN(num));

    if (validWalletNumbers.length === 0) {
      return 'Không có số ví hợp lệ nào được cung cấp.';
    }

    this.tokenTradingService.addWallets(validWalletNumbers);
    return `Đã chọn các số ví: ${validWalletNumbers.join(', ')}`;
  }

  @Get()
  getWalletAddresses() {
    const wallets = this.tokenTradingService.getWallets();

    const addresses = wallets.map((wallet) => wallet.address);

    return { addresses };
  }

  @Get('buy-token')
  async buyToken(
    @Query('amountIn') amountInStr: string,
    @Query('tokenAddress') tokenAddress: string,
    @Query('gasLimit') gasLimit: number,
    @Query('gasPrice') gasPriceStr: string,
    @Query('slippageTolerance') slippageTolerance: number,
    @Query('walletNumbers') walletNumbers: string,
  ): Promise<string> {
    const amountIn = utils.parseEther(amountInStr);
    const gasPrice = utils.parseUnits(gasPriceStr, 'gwei');

    try {
      const walletNumbersArray = walletNumbers.split(',').map(Number);

      const transactionHashes = await this.tokenTradingService.buyToken(
        amountIn,
        tokenAddress,
        gasLimit,
        gasPrice,
        slippageTolerance,
        walletNumbersArray,
      );

      return `Buy Transaction Hashes: ${transactionHashes.join(', ')}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  @Get('sell-token')
  async sellToken(
    @Query('tokenAddress') tokenAddress: string,
    @Query('gasLimit') gasLimit: number,
    @Query('gasPrice') gasPriceStr: string,
    @Query('slippageTolerance') slippageTolerance: number,
    @Query('walletNumbers') walletNumbers: string,
  ): Promise<string> {
    const gasPrice = utils.parseUnits(gasPriceStr, 'gwei');

    try {
      const walletNumbersArray = walletNumbers.split(',').map(Number);

      const transactionHashes = await this.tokenTradingService.sellToken(
        tokenAddress,
        gasLimit,
        gasPrice,
        slippageTolerance,
        walletNumbersArray,
      );

      return `Sell Transaction Hashes: ${transactionHashes.join(', ')}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  @Get('approve-token')
  async approveToken(
    @Query('tokenAddress') tokenAddress: string,
    @Query('walletNumbers') walletNumbers: string,
  ): Promise<string> {
    try {
      const walletNumbersArray = walletNumbers.split(',').map(Number);

      const transactionHashes = await this.tokenTradingService.approveToken(
        tokenAddress,
        walletNumbersArray,
      );

      return `Approve Transaction Hashes: ${transactionHashes.join(', ')}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }
}
