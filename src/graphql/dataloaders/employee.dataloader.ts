import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { In } from 'typeorm';
import { EmployeeRepository } from '../../employees/repositories/employee.repository';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Employee DataLoader
 * 
 * Batch loads employees by ID to prevent N+1 queries.
 * Caches results per request.
 */
@Injectable({ scope: Scope.REQUEST })
export class EmployeeDataLoader {
  private readonly loader: DataLoader<number, Employee | null>;

  constructor(private readonly employeeRepository: EmployeeRepository) {
    this.loader = new DataLoader<number, Employee | null>(
      async (ids: readonly number[]): Promise<(Employee | null)[]> => {
        // Batch load all employees using TypeORM's In operator
        const employees = await this.employeeRepository.find({
          where: { id: In([...ids]) },
        });
        
        // Create a map for quick lookup
        const employeeMap = new Map<number, Employee>();
        employees.forEach((employee) => {
          employeeMap.set(employee.id, employee);
        });
        
        // Return employees in the same order as requested IDs
        return ids.map((id) => employeeMap.get(id) || null);
      },
      {
        // Cache results for the duration of the request
        cache: true,
      },
    );
  }

  /**
   * Load a single employee by ID
   */
  async load(id: number): Promise<Employee | null> {
    return this.loader.load(id);
  }

  /**
   * Load multiple employees by IDs
   */
  async loadMany(ids: number[]): Promise<(Employee | null)[]> {
    return this.loader.loadMany(ids);
  }
}
