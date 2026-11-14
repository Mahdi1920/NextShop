import { apiClient } from "@shared/api/clients";

export type UploadAvatarResponse = {
  url: string;
};

export const cloudinaryApi = {
  async uploadAvatar(file: File): Promise<UploadAvatarResponse> {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post<UploadAvatarResponse>("/cloudinary/avatar", form);
    return res.data;
  },

  async uploadStoreLogo(file: File): Promise<UploadAvatarResponse> {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post<UploadAvatarResponse>("/cloudinary/store/logo", form);
    return res.data;
  },

  async uploadStoreBanner(file: File): Promise<UploadAvatarResponse> {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post<UploadAvatarResponse>("/cloudinary/store/banner", form);
    return res.data;
  },

  async uploadProductImage(file: File): Promise<UploadAvatarResponse> {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post<UploadAvatarResponse>("/cloudinary/products/image", form);
    return res.data;
  },
};
