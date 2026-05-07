export type NearbyRunNotificationUser = {
  userId: string;
  expoPushToken: string;
};

export type UserOnboardingState = {
  hasCompletedOnboarding: boolean;
  consentDataBrokering: boolean;
};

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findOnboardingById(userId: string): Promise<UserOnboardingState | null>;

  patchOnboarding(
    userId: string,
    patch: Partial<
      Pick<UserOnboardingState, 'hasCompletedOnboarding' | 'consentDataBrokering'>
    >,
  ): Promise<void>;

  updateLastKnownLocation(
    userId: string,
    latitude: number,
    longitude: number,
    expoPushToken?: string | null,
  ): Promise<void>;

  findNearbyWithExpoTokens(
    excludeUserId: string,
    centerLatitude: number,
    centerLongitude: number,
    radiusKm: number,
  ): Promise<NearbyRunNotificationUser[]>;
}
