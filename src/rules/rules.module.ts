import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RulesController } from './rules.controller';
import { RuleEngineService, ExpressionEvaluatorService } from './services';
import { BusinessRuleRepository, RuleExecutionLogRepository } from './repositories';
import { BusinessRule, RuleExecutionLog } from './entities';

/**
 * Rules Module
 *
 * Provides business rule validation and automation with expression evaluation.
 */
@Module({
  imports: [TypeOrmModule.forFeature([BusinessRule, RuleExecutionLog])],
  controllers: [RulesController],
  providers: [
    RuleEngineService,
    ExpressionEvaluatorService,
    BusinessRuleRepository,
    RuleExecutionLogRepository,
  ],
  exports: [
    RuleEngineService,
    ExpressionEvaluatorService,
    BusinessRuleRepository,
    RuleExecutionLogRepository,
  ],
})
export class RulesModule {}

