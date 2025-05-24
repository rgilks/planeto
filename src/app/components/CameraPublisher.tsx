import { useCameraPublisher } from "@/hooks/useCameraPublisher";

export const CameraPublisher = ({ id }: { id: string }) => {
  useCameraPublisher(id);
  return null;
};
