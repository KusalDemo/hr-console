import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyMfaDto {
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  code: string;
}
