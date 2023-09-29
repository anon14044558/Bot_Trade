import { Module } from '@nestjs/common';
import { TokenTradingService } from './token-trading.service';
import { TokenTradingController } from './token-trading.controller';

@Module({
  providers: [TokenTradingService],
  controllers: [TokenTradingController],
})
export class TokenTradingModule {}
