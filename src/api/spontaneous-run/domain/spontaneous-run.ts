export interface SpontaneousRun {
  id: string;
  creatorId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  startTime: Date;
  maxParticipants: number;
  vibe: string;
  createdAt: Date;
}
