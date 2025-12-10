import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class SimpleUserResponseDto {
  @Expose()
  id!: string;

  @Expose()
  displayName!: string;

  @Expose()
  avatarUrl!: string | null;
}
