import { Injectable, Logger } from '@nestjs/common';
import { LeavePolicy, AccrualMethod, AccrualFrequency, AccrualCalculationBasis } from '../entities/leave-policy.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { EmployeeLeavePolicyAssignment } from '../entities/employee-leave-policy-assignment.entity';

/**
 * Leave Accrual Service
 * 
 * Handles leave accrual calculations for different methods:
 * - Front-loaded: Entire year's leave granted at start
 * - Pro-rated: Accrued proportionally over time
 * - Custom formula: Formula-based accrual
 * 
 * Supports different accrual frequencies (daily, weekly, monthly, yearly)
 * and calculation bases (calendar year, hire anniversary, fiscal year).
 */
@Injectable()
export class LeaveAccrualService {
  private readonly logger = new Logger(LeaveAccrualService.name);

  /**
   * Calculate accrued leave for an employee based on policy assignment
   */
  async calculateAccruedLeave(
    employee: Employee,
    policy: LeavePolicy,
    assignment: EmployeeLeavePolicyAssignment,
    leaveTypeMaxDays: number,
    leaveTypeAccrualRate?: number,
    asOfDate: Date = new Date(),
  ): Promise<number> {
    // Check waiting period
    const accrualStartDate = this.calculateAccrualStartDate(employee, policy, assignment);
    if (asOfDate < accrualStartDate) {
      return 0;
    }

    // Get accrual method from policy
    const accrualMethod = policy.accrualMethod || AccrualMethod.PRO_RATED;

    let accruedDays = 0;

    switch (accrualMethod) {
      case AccrualMethod.FRONT_LOADED:
        accruedDays = this.calculateFrontLoadedAccrual(
          employee,
          policy,
          assignment,
          leaveTypeMaxDays,
          asOfDate,
          accrualStartDate,
        );
        break;
      case AccrualMethod.PRO_RATED:
        accruedDays = this.calculateProRatedAccrual(
          employee,
          policy,
          assignment,
          leaveTypeMaxDays,
          leaveTypeAccrualRate,
          asOfDate,
          accrualStartDate,
        );
        break;
      case AccrualMethod.CUSTOM_FORMULA:
        accruedDays = this.calculateCustomFormulaAccrual(
          employee,
          policy,
          assignment,
          leaveTypeMaxDays,
          asOfDate,
          accrualStartDate,
        );
        break;
    }

    return Math.round(accrualDays * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate front-loaded accrual (entire year's leave granted at start)
   */
  private calculateFrontLoadedAccrual(
    employee: Employee,
    policy: LeavePolicy,
    assignment: EmployeeLeavePolicyAssignment,
    maxDaysPerYear: number,
    asOfDate: Date,
    accrualStartDate: Date,
  ): number {
    if (asOfDate < accrualStartDate) {
      return 0;
    }

    const yearStart = this.getYearStart(employee, policy, accrualStartDate);
    if (asOfDate < yearStart) {
      return 0;
    }

    // Front-loaded: grant entire year's leave at start of year
    return maxDaysPerYear;
  }

  /**
   * Calculate pro-rated accrual (accrued proportionally over time)
   */
  private calculateProRatedAccrual(
    employee: Employee,
    policy: LeavePolicy,
    assignment: EmployeeLeavePolicyAssignment,
    maxDaysPerYear: number,
    accrualRatePerPeriod: number | undefined,
    asOfDate: Date,
    accrualStartDate: Date,
  ): number {
    if (asOfDate < accrualStartDate) {
      return 0;
    }

    const yearStart = this.getYearStart(employee, policy, accrualStartDate);
    const yearEnd = this.getYearEnd(employee, policy, yearStart);
    const calculationDate = asOfDate > yearEnd ? yearEnd : asOfDate;

    // Calculate accrual rate
    const accrualRate =
      accrualRatePerPeriod !== undefined
        ? accrualRatePerPeriod
        : this.calculateDefaultAccrualRate(maxDaysPerYear, policy.accrualFrequency || AccrualFrequency.MONTHLY);

    // Calculate periods elapsed
    const periods = this.calculatePeriodsElapsed(
      policy.accrualFrequency || AccrualFrequency.MONTHLY,
      yearStart,
      calculationDate,
    );

    return accrualRate * periods;
  }

  /**
   * Calculate custom formula accrual
   */
  private calculateCustomFormulaAccrual(
    employee: Employee,
    policy: LeavePolicy,
    assignment: EmployeeLeavePolicyAssignment,
    maxDaysPerYear: number,
    asOfDate: Date,
    accrualStartDate: Date,
  ): number {
    if (asOfDate < accrualStartDate) {
      return 0;
    }

    const formula = policy.accrualCustomFormula;

    if (!formula || formula.trim().length === 0) {
      this.logger.warn(
        `No custom formula specified for policy ${policy.id}, falling back to pro-rated calculation`,
      );
      // Fall back to pro-rated calculation
      return this.calculateProRatedAccrual(
        employee,
        policy,
        assignment,
        maxDaysPerYear,
        undefined,
        asOfDate,
        accrualStartDate,
      );
    }

    // Validate and evaluate formula
    try {
      const result = this.evaluateFormula(formula, employee, policy, assignment, maxDaysPerYear, asOfDate);
      this.logger.debug(
        `Custom formula accrual for employee ${employee.id}, policy ${policy.id}: formula=${formula}, result=${result}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Invalid formula syntax for employee ${employee.id}, policy ${policy.id}, formula: ${formula}. Error: ${error.message}`,
      );
      // Fall back to pro-rated calculation
      return this.calculateProRatedAccrual(
        employee,
        policy,
        assignment,
        maxDaysPerYear,
        undefined,
        asOfDate,
        accrualStartDate,
      );
    }
  }

  /**
   * Evaluate custom formula
   * Supports variables: yearsOfService, monthsOfService, daysOfService, maxDays, hireDate, asOfDate
   */
  private evaluateFormula(
    formula: string,
    employee: Employee,
    policy: LeavePolicy,
    assignment: EmployeeLeavePolicyAssignment,
    maxDaysPerYear: number,
    asOfDate: Date,
  ): number {
    // Simple formula evaluator - can be enhanced with a proper expression evaluator library
    // For now, support basic arithmetic operations and common variables

    let evaluatedFormula = formula;

    // Calculate service years/months/days
    const hireDate = employee.hireDate ? new Date(employee.hireDate) : new Date();
    const serviceYears = this.calculateYearsBetween(hireDate, asOfDate);
    const serviceMonths = this.calculateMonthsBetween(hireDate, asOfDate);
    const serviceDays = this.calculateDaysBetween(hireDate, asOfDate);

    // Replace variables in formula
    evaluatedFormula = evaluatedFormula.replace(/\byearsOfService\b/g, serviceYears.toString());
    evaluatedFormula = evaluatedFormula.replace(/\bmonthsOfService\b/g, serviceMonths.toString());
    evaluatedFormula = evaluatedFormula.replace(/\bdaysOfService\b/g, serviceDays.toString());
    evaluatedFormula = evaluatedFormula.replace(/\bmaxDays\b/g, maxDaysPerYear.toString());

    // Evaluate formula (basic arithmetic only - for production, use a proper expression evaluator)
    try {
      // eslint-disable-next-line no-eval
      const result = eval(evaluatedFormula);
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      throw new Error(`Formula evaluation failed: ${error.message}`);
    }
  }

  /**
   * Calculate accrual start date (considering waiting period)
   */
  calculateAccrualStartDate(
    employee: Employee,
    policy: LeavePolicy,
    assignment: EmployeeLeavePolicyAssignment,
  ): Date {
    if (!employee.hireDate) {
      return new Date();
    }

    const hireDate = new Date(employee.hireDate);
    const waitingPeriodDays = policy.waitingPeriodDays || 0;

    if (waitingPeriodDays === 0) {
      return hireDate;
    }

    const startDate = new Date(hireDate);
    startDate.setDate(startDate.getDate() + waitingPeriodDays);

    // Use assignment effective start date if later
    const assignmentStart = new Date(assignment.effectiveStartDate);
    if (assignmentStart > startDate) {
      return assignmentStart;
    }

    return startDate;
  }

  /**
   * Get year start date based on calculation basis
   */
  private getYearStart(employee: Employee, policy: LeavePolicy, accrualStartDate: Date): Date {
    const basis = policy.accrualCalculationBasis || AccrualCalculationBasis.CALENDAR_YEAR;

    switch (basis) {
      case AccrualCalculationBasis.CALENDAR_YEAR:
        return new Date(accrualStartDate.getFullYear(), 0, 1); // January 1

      case AccrualCalculationBasis.HIRE_ANNIVERSARY:
        if (!employee.hireDate) {
          return new Date(accrualStartDate.getFullYear(), 0, 1);
        }
        const hireDate = new Date(employee.hireDate);
        const currentYear = accrualStartDate.getFullYear();
        const anniversaryDate = new Date(currentYear, hireDate.getMonth(), hireDate.getDate());

        if (anniversaryDate < accrualStartDate) {
          // Anniversary already passed this year, use next year's anniversary
          return new Date(currentYear + 1, hireDate.getMonth(), hireDate.getDate());
        }

        return anniversaryDate;

      case AccrualCalculationBasis.FISCAL_YEAR:
        // Default to April 1 (can be configured in policy metadata)
        const fiscalYearStartMonth = (policy.policyMetadata?.fiscalYearStartMonth as number) || 3; // 0-indexed (3 = April)
        const fiscalYearStartDay = (policy.policyMetadata?.fiscalYearStartDay as number) || 1;
        const currentDate = new Date(accrualStartDate);
        let fiscalYearStart = new Date(currentDate.getFullYear(), fiscalYearStartMonth, fiscalYearStartDay);

        if (fiscalYearStart > accrualStartDate) {
          // Fiscal year hasn't started yet this calendar year, use previous year
          fiscalYearStart = new Date(currentDate.getFullYear() - 1, fiscalYearStartMonth, fiscalYearStartDay);
        }

        return fiscalYearStart;

      default:
        return new Date(accrualStartDate.getFullYear(), 0, 1);
    }
  }

  /**
   * Get year end date based on calculation basis
   */
  private getYearEnd(employee: Employee, policy: LeavePolicy, yearStart: Date): Date {
    const basis = policy.accrualCalculationBasis || AccrualCalculationBasis.CALENDAR_YEAR;

    switch (basis) {
      case AccrualCalculationBasis.CALENDAR_YEAR:
        return new Date(yearStart.getFullYear(), 11, 31); // December 31

      case AccrualCalculationBasis.HIRE_ANNIVERSARY:
        if (!employee.hireDate) {
          return new Date(yearStart.getFullYear(), 11, 31);
        }
        const hireDate = new Date(employee.hireDate);
        const nextAnniversary = new Date(
          yearStart.getFullYear() + 1,
          hireDate.getMonth(),
          hireDate.getDate(),
        );
        // Day before next anniversary
        nextAnniversary.setDate(nextAnniversary.getDate() - 1);
        return nextAnniversary;

      case AccrualCalculationBasis.FISCAL_YEAR:
        const fiscalYearStartMonth = (policy.policyMetadata?.fiscalYearStartMonth as number) || 3;
        const fiscalYearStartDay = (policy.policyMetadata?.fiscalYearStartDay as number) || 1;
        const nextFiscalYearStart = new Date(
          yearStart.getFullYear() + 1,
          fiscalYearStartMonth,
          fiscalYearStartDay,
        );
        // Day before next fiscal year start
        nextFiscalYearStart.setDate(nextFiscalYearStart.getDate() - 1);
        return nextFiscalYearStart;

      default:
        return new Date(yearStart.getFullYear(), 11, 31);
    }
  }

  /**
   * Calculate default accrual rate based on max days per year and frequency
   */
  private calculateDefaultAccrualRate(maxDaysPerYear: number, frequency: AccrualFrequency): number {
    const periodsPerYear = this.getPeriodsPerYear(frequency);
    return maxDaysPerYear / periodsPerYear;
  }

  /**
   * Get number of periods per year based on frequency
   */
  private getPeriodsPerYear(frequency: AccrualFrequency): number {
    switch (frequency) {
      case AccrualFrequency.DAILY:
        return 365;
      case AccrualFrequency.WEEKLY:
        return 52;
      case AccrualFrequency.MONTHLY:
        return 12;
      case AccrualFrequency.YEARLY:
        return 1;
      default:
        return 12; // Default to monthly
    }
  }

  /**
   * Calculate periods elapsed between two dates based on frequency
   */
  private calculatePeriodsElapsed(frequency: AccrualFrequency, startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    switch (frequency) {
      case AccrualFrequency.DAILY:
        return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      case AccrualFrequency.WEEKLY:
        return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)));

      case AccrualFrequency.MONTHLY:
        return Math.max(
          0,
          (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()),
        );

      case AccrualFrequency.YEARLY:
        return Math.max(0, end.getFullYear() - start.getFullYear());

      default:
        return 0;
    }
  }

  /**
   * Calculate years between two dates
   */
  private calculateYearsBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let years = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < start.getDate())) {
      years--;
    }

    return years;
  }

  /**
   * Calculate months between two dates
   */
  private calculateMonthsBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  }

  /**
   * Calculate days between two dates
   */
  private calculateDaysBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
}
