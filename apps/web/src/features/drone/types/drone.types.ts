export interface DronePhotoLog {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  imageUrl: string;
  capturedBy?: string;
  tags?: string[];
}
