import { IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Widget Order Item DTO
 */
export class WidgetOrderItemDto {
  @IsNumber()
  @Type(() => Number)
  id: number;

  @IsNumber()
  @Type(() => Number)
  order: number;
}

/**
 * Update Widget Order DTO
 */
export class UpdateWidgetOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetOrderItemDto)
  widgetOrders: WidgetOrderItemDto[];
}
