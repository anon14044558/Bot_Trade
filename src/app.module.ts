import { Module } from '@nestjs/common';
import { TokenTradingModule } from './Adapters/Token-trading/token-trading.module';

@Module({
  imports: [TokenTradingModule],
})
export class AppModule {}
