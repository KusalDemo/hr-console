import { Injectable, Logger } from '@nestjs/common';
import { LeadScoringRuleRepository } from '../repositories/lead-scoring-rule.repository';
import {
  LeadScoringRule,
  ScoringRuleType,
  ScoringRuleOperator,
} from '../entities/lead-scoring-rule.entity';
import { Lead } from '../entities/lead.entity';

/**
 * Lead Scoring Service
 * 
 * Automated lead scoring based on scoring rules.
 * Evaluates rules and calculates lead scores.
 */
@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(
    private readonly leadScoringRuleRepository: LeadScoringRuleRepository,
  ) {}

  /**
   * Calculate lead score based on active scoring rules
   */
  async calculateLeadScore(
    lead: Lead,
    organizationId?: number,
  ): Promise<number> {
    // Get active scoring rules
    const rules = await this.leadScoringRuleRepository.findActive(organizationId);

    if (rules.length === 0) {
      this.logger.debug('No active scoring rules found, returning current score');
      return lead.leadScore;
    }

    let newScore = lead.leadScore || 0;

    // Evaluate each rule
    for (const rule of rules) {
      if (!rule.isCurrentlyActive()) {
        continue;
      }

      const matches = await this.evaluateRule(rule, lead);

      if (matches) {
        newScore += rule.scorePoints;
        this.logger.debug(
          `Rule "${rule.ruleName}" matched for lead ${lead.id}, adding ${rule.scorePoints} points`,
        );
      }
    }

    // Apply score caps/floors from rules
    for (const rule of rules) {
      if (rule.maxScoreCap !== null && newScore > rule.maxScoreCap) {
        newScore = rule.maxScoreCap;
        this.logger.debug(
          `Score capped at ${rule.maxScoreCap} by rule "${rule.ruleName}"`,
        );
      }

      if (rule.minScoreFloor !== null && newScore < rule.minScoreFloor) {
        newScore = rule.minScoreFloor;
        this.logger.debug(
          `Score floored at ${rule.minScoreFloor} by rule "${rule.ruleName}"`,
        );
      }
    }

    // Ensure score doesn't go below 0
    if (newScore < 0) {
      newScore = 0;
    }

    return newScore;
  }

  /**
   * Evaluate a scoring rule against a lead
   */
  private async evaluateRule(
    rule: LeadScoringRule,
    lead: Lead,
  ): Promise<boolean> {
    switch (rule.ruleType) {
      case ScoringRuleType.FIELD_MATCH:
        return this.evaluateFieldMatch(rule, lead);

      case ScoringRuleType.FIELD_RANGE:
        return this.evaluateFieldRange(rule, lead);

      case ScoringRuleType.BEHAVIOR:
        return this.evaluateBehavior(rule, lead);

      case ScoringRuleType.ENGAGEMENT:
        return this.evaluateEngagement(rule, lead);

      case ScoringRuleType.CUSTOM:
        return this.evaluateCustom(rule, lead);

      default:
        this.logger.warn(`Unknown rule type: ${rule.ruleType}`);
        return false;
    }
  }

  /**
   * Evaluate field match rule
   */
  private evaluateFieldMatch(rule: LeadScoringRule, lead: Lead): boolean {
    if (!rule.fieldName || !rule.operator || !rule.fieldValue) {
      return false;
    }

    const fieldValue = this.getFieldValue(lead, rule.fieldName);
    if (fieldValue === null || fieldValue === undefined) {
      return rule.operator === ScoringRuleOperator.IS_NULL;
    }

    const ruleValue = this.parseRuleValue(rule.fieldValue);

    switch (rule.operator) {
      case ScoringRuleOperator.EQUALS:
        return String(fieldValue).toLowerCase() === String(ruleValue).toLowerCase();

      case ScoringRuleOperator.NOT_EQUALS:
        return String(fieldValue).toLowerCase() !== String(ruleValue).toLowerCase();

      case ScoringRuleOperator.CONTAINS:
        return String(fieldValue).toLowerCase().includes(String(ruleValue).toLowerCase());

      case ScoringRuleOperator.NOT_CONTAINS:
        return !String(fieldValue).toLowerCase().includes(String(ruleValue).toLowerCase());

      case ScoringRuleOperator.STARTS_WITH:
        return String(fieldValue).toLowerCase().startsWith(String(ruleValue).toLowerCase());

      case ScoringRuleOperator.ENDS_WITH:
        return String(fieldValue).toLowerCase().endsWith(String(ruleValue).toLowerCase());

      case ScoringRuleOperator.IS_NULL:
        return fieldValue === null || fieldValue === undefined;

      case ScoringRuleOperator.IS_NOT_NULL:
        return fieldValue !== null && fieldValue !== undefined;

      case ScoringRuleOperator.IN:
        const inValues = Array.isArray(ruleValue) ? ruleValue : String(ruleValue).split(',');
        return inValues.some((v) => String(v).toLowerCase() === String(fieldValue).toLowerCase());

      case ScoringRuleOperator.NOT_IN:
        const notInValues = Array.isArray(ruleValue) ? ruleValue : String(ruleValue).split(',');
        return !notInValues.some((v) => String(v).toLowerCase() === String(fieldValue).toLowerCase());

      default:
        return false;
    }
  }

  /**
   * Evaluate field range rule
   */
  private evaluateFieldRange(rule: LeadScoringRule, lead: Lead): boolean {
    if (!rule.fieldName || !rule.operator || !rule.fieldValue) {
      return false;
    }

    const fieldValue = this.getFieldValue(lead, rule.fieldName);
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }

    const numericValue = Number(fieldValue);
    if (isNaN(numericValue)) {
      return false;
    }

    const ruleValue = this.parseRuleValue(rule.fieldValue);
    const numericRuleValue = Number(ruleValue);
    if (isNaN(numericRuleValue)) {
      return false;
    }

    switch (rule.operator) {
      case ScoringRuleOperator.GREATER_THAN:
        return numericValue > numericRuleValue;

      case ScoringRuleOperator.LESS_THAN:
        return numericValue < numericRuleValue;

      case ScoringRuleOperator.GREATER_THAN_OR_EQUAL:
        return numericValue >= numericRuleValue;

      case ScoringRuleOperator.LESS_THAN_OR_EQUAL:
        return numericValue <= numericRuleValue;

      case ScoringRuleOperator.BETWEEN:
        const range = Array.isArray(ruleValue) ? ruleValue : String(ruleValue).split('-');
        if (range.length !== 2) {
          return false;
        }
        const min = Number(range[0]);
        const max = Number(range[1]);
        return numericValue >= min && numericValue <= max;

      default:
        return false;
    }
  }

  /**
   * Evaluate behavior rule
   */
  private evaluateBehavior(rule: LeadScoringRule, lead: Lead): boolean {
    // Behavior-based rules can check lead metadata, interaction history, etc.
    // This is a simplified implementation - can be extended based on requirements
    if (!rule.fieldName || !rule.customExpression) {
      return false;
    }

    // For now, check if behavior field exists in metadata
    if (lead.leadMetadata && lead.leadMetadata[rule.fieldName]) {
      return true;
    }

    return false;
  }

  /**
   * Evaluate engagement rule
   */
  private evaluateEngagement(rule: LeadScoringRule, lead: Lead): boolean {
    // Engagement-based rules can check last contact date, interaction count, etc.
    if (!rule.fieldName || !rule.operator || !rule.fieldValue) {
      return false;
    }

    // Check last contact date
    if (rule.fieldName === 'lastContactDate' && lead.lastContactDate) {
      const daysSinceContact = Math.floor(
        (Date.now() - lead.lastContactDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const threshold = Number(rule.fieldValue);

      switch (rule.operator) {
        case ScoringRuleOperator.LESS_THAN:
          return daysSinceContact < threshold;
        case ScoringRuleOperator.GREATER_THAN:
          return daysSinceContact > threshold;
        default:
          return false;
      }
    }

    return false;
  }

  /**
   * Evaluate custom expression rule
   */
  private evaluateCustom(rule: LeadScoringRule, lead: Lead): boolean {
    // Custom expression evaluation - simplified implementation
    // In production, you might use a proper expression evaluator
    if (!rule.customExpression) {
      return false;
    }

    // This is a placeholder - implement proper expression evaluation
    // For now, return false to be safe
    this.logger.warn('Custom expression evaluation not fully implemented');
    return false;
  }

  /**
   * Get field value from lead entity
   */
  private getFieldValue(lead: Lead, fieldName: string): any {
    // Direct property access
    if (lead[fieldName] !== undefined) {
      return lead[fieldName];
    }

    // Check metadata
    if (lead.leadMetadata && lead.leadMetadata[fieldName] !== undefined) {
      return lead.leadMetadata[fieldName];
    }

    return null;
  }

  /**
   * Parse rule value (handle JSON, arrays, etc.)
   */
  private parseRuleValue(value: string): any {
    try {
      // Try to parse as JSON
      return JSON.parse(value);
    } catch {
      // Return as string if not JSON
      return value;
    }
  }

  /**
   * Recalculate scores for all leads (batch operation)
   */
  async recalculateAllScores(
    organizationId?: number,
    batchSize = 100,
  ): Promise<{ processed: number; updated: number }> {
    this.logger.log('Starting batch score recalculation');

    const rules = await this.leadScoringRuleRepository.findActive(organizationId);
    if (rules.length === 0) {
      this.logger.warn('No active scoring rules found');
      return { processed: 0, updated: 0 };
    }

    // This would typically be done in batches with pagination
    // For now, this is a placeholder - implement based on your needs
    this.logger.log(`Found ${rules.length} active scoring rules`);

    return { processed: 0, updated: 0 };
  }
}

