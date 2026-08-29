import api from "./api";
import { AppUser } from "../types/user";

export const getMe = async (): Promise<AppUser> => {
  const { data } = await api.get("/users/me");
  return data as AppUser;
};

export const updateProfilePhoto = async (
  uri: string
): Promise<{ message: string; profilePhoto: string }> => {
  const formData = new FormData();
  const extension = uri.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";

  formData.append("photo", {
    uri,
    type: mimeType,
    name: `profile.${extension}`,
  } as unknown as Blob);

  const { data } = await api.put("/users/me/photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data as { message: string; profilePhoto: string };
};
