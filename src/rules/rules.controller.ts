import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RuleEngineService } from './services/rule-engine.service';
import {
  CreateBusinessRuleDto,
  UpdateBusinessRuleDto,
  ExecuteRuleDto,
  BusinessRuleResponseDto,
  RuleExecutionResultDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RuleType, RuleTriggerType } from './entities/business-rule.entity';

/**
 * Rules Controller
 * 
 * REST API endpoints for business rule management:
 * - Rule definitions (CRUD)
 * - Rule execution
 * - Rule execution logs
 */
@Controller('rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RulesController {
  constructor(private readonly ruleEngineService: RuleEngineService) {}

  /**
   * Create a new business rule
   * POST /rules
   */
  @Post()
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.CREATED)
  async createBusinessRule(
    @Body() createDto: CreateBusinessRuleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<BusinessRuleResponseDto> {
    return this.ruleEngineService.createBusinessRule(createDto, user.userId);
  }

  /**
   * Get business rule by ID
   * GET /rules/:id
   */
  @Get(':id')
  async getBusinessRule(@Param('id', ParseIntPipe) id: number): Promise<BusinessRuleResponseDto> {
    return this.ruleEngineService.getBusinessRule(id);
  }

  /**
   * Get business rule by key
   * GET /rules/key/:ruleKey
   */
  @Get('key/:ruleKey')
  async getBusinessRuleByKey(@Param('ruleKey') ruleKey: string): Promise<BusinessRuleResponseDto> {
    return this.ruleEngineService.getBusinessRuleByKey(ruleKey);
  }

  /**
   * Update a business rule
   * PUT /rules/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR')
  async updateBusinessRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBusinessRuleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<BusinessRuleResponseDto> {
    return this.ruleEngineService.updateBusinessRule(id, updateDto, user.userId);
  }

  /**
   * Execute rules for an entity event
   * POST /rules/execute
   */
  @Post('execute')
  async executeRules(
    @Body() executeDto: ExecuteRuleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RuleExecutionResultDto[]> {
    return this.ruleEngineService.executeRules(executeDto, user.userId);
  }
}


