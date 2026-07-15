import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  // At least 8 chars, one letter and one number - adjust to your product's password policy.
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  tenantName!: string;

  // Only lowercase letters, numbers and hyphens - keeps it URL-safe.
  @IsString()
  @IsNotEmpty()
  @MaxLength(63)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'tenantSlug must contain only lowercase letters, numbers and hyphens',
  })
  tenantSlug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
