import { Injectable } from '@nestjs/common';
import { BigNumber, Contract, providers, utils, Wallet } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class TokenTradingService {
  private wallets: Wallet[] = [];
  private provider: providers.JsonRpcProvider;

  constructor() {
    const rpcUrl = process.env.RPC_URL;
    this.provider = new providers.JsonRpcProvider(rpcUrl);
    this.wallets = [];
  }

  addWallets(walletNumbers: number[]) {
    for (const walletNumber of walletNumbers) {
      const privateKey = process.env[`PRIVATE_KEY_${walletNumber}`];
      if (!privateKey) {
        throw new Error(`Không tìm thấy khóa riêng cho ví số ${walletNumber}`);
      }

      const NewWallet = new Wallet(privateKey, this.provider);
      const existingWallet = this.wallets.find(
        (wallet) => wallet.address === NewWallet.address,
      );

      if (!existingWallet) {
        this.wallets.push(NewWallet);
      }
    }
  }

  getWallets(): Wallet[] {
    return this.wallets;
  }

  logWallets() {
    console.log('Danh sách các ví:');
    this.wallets.forEach((wallet, index) => {
      console.log(`Ví số ${index + 1}: ${wallet.address}`);
    });
  }

  async buyToken(
    amountIn: BigNumber,
    tokenAddress: string,
    gasLimit: number,
    gasPrice: BigNumber,
    slippage: number,
    walletNumbers: number[],
  ): Promise<string[]> {
    const routerAddress = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
    const abi = [
      'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint256, address[], address, uint256) external payable',
      'function getAmountsOut(uint amountIn, address[] memory routes) public view returns (uint[] memory amounts)',
    ];

    const promises: Promise<string>[] = [];

    for (const walletNumber of walletNumbers) {
      promises.push(
        new Promise(async (resolve, reject) => {
          try {
            const wallet = this.wallets[walletNumber - 1];
            const router = new Contract(routerAddress, abi, wallet);

            const amounts = await router.getAmountsOut(amountIn, [
              '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
              tokenAddress,
            ]);
            const amountOutToken = BigNumber.from(amounts[1]);

            const amountOutMin = amountOutToken.mul(100 - slippage).div(100);

            const tx =
              await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
                amountOutMin.toString(),
                ['0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', tokenAddress],
                wallet.address,
                Math.floor(Date.now() / 1000) + 60 * 1,
                { value: amountIn, gasLimit, gasPrice },
              );

            resolve(tx.transactionHash);
          } catch (error) {
            reject(error);
          }
        }),
      );
    }

    try {
      const transactionHashes = await Promise.all(promises);
      return transactionHashes;
    } catch (error) {
      throw new Error(`Error: ${error.message}`);
    }
  }

  async approveToken(
    tokenAddress: string,
    walletNumbers: number[],
    gwei: number = 3,
  ): Promise<string[]> {
    const amountToApprove = utils.parseEther('99999999999999999999999');
    const routerAddress = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';

    const promises: Promise<string>[] = [];

    for (const walletNumber of walletNumbers) {
      promises.push(
        new Promise(async (resolve, reject) => {
          try {
            if (walletNumber <= 0 || walletNumber > this.wallets.length) {
              reject(new Error(`Ví số ${walletNumber} không tồn tại`));
              return;
            }

            const wallet = this.wallets[walletNumber - 1];

            const router = new Contract(
              routerAddress,
              ['function approve(address spender, uint256 amount) external'],
              wallet,
            );

            const erc20Contract = new Contract(
              tokenAddress,
              ['function approve(address spender, uint256 amount) external'],
              wallet,
            );

            const gasPrice = utils.parseUnits(gwei.toString(), 'gwei');

            const approveTx = await erc20Contract.approve(
              router.address,
              amountToApprove,
              { gasPrice },
            );

            const approveReceipt = await approveTx.wait();
            resolve(approveReceipt.transactionHash);
          } catch (error) {
            reject(error);
          }
        }),
      );
    }

    try {
      const approveReceipts = await Promise.all(promises);
      return approveReceipts;
    } catch (error) {
      throw new Error(`Error: ${error.message}`);
    }
  }

  async sellToken(
    tokenAddress: string,
    gasLimit: number,
    gasPrice: BigNumber,
    slippage: number,
    walletNumbers: number[],
  ): Promise<string[]> {
    const path = [tokenAddress, '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 1;
    const routerAddress = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
    const abi2 = [
      'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint256, uint256, address[], address, uint256) external',
      'function getAmountsOut(uint amountIn, address[] memory routes) public view returns (uint[] memory amounts)',
    ];

    const promises: Promise<string>[] = [];

    for (const walletNumber of walletNumbers) {
      promises.push(
        new Promise(async (resolve, reject) => {
          try {
            if (walletNumber <= 0 || walletNumber > this.wallets.length) {
              reject(new Error(`Ví số ${walletNumber} không tồn tại`));
              return;
            }

            const wallet = this.wallets[walletNumber - 1];

            const router2 = new Contract(routerAddress, abi2, wallet);

            const erc20Contract = new Contract(
              tokenAddress,
              ['function balanceOf(address) view returns (uint256)'],
              wallet,
            );

            const balance = await erc20Contract.balanceOf(wallet.address);

            console.log(
              `Balance in Wallet ${walletNumber}:`,
              balance.toString(),
            );

            const amounts = await router2.getAmountsOut(balance, path);
            const amountOutToken = BigNumber.from(amounts[1]);

            const amountOutMin = amountOutToken.mul(100 - slippage).div(100);

            const tx =
              await router2.swapExactTokensForETHSupportingFeeOnTransferTokens(
                balance,
                amountOutMin.toString(),
                path,
                wallet.address,
                deadline,
                { gasLimit, gasPrice },
              );

            const receipt = await tx.wait();
            resolve(receipt.transactionHash);
          } catch (error) {
            reject(error);
          }
        }),
      );
    }

    try {
      const transactionHashes = await Promise.all(promises);
      return transactionHashes;
    } catch (error) {
      console.error('Lỗi trong sellToken:', error);
      throw error;
    }
  }
}
