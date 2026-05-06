export type NearbyRunNotificationUser = {
  userId: string;
  expoPushToken: string;
};

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
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
