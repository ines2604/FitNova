export type AppUser = {
  id: number;
  full_name: string;
  email: string;
  profile_photo?: string | null;
  email_verified?: boolean;
  role?: string;
  created_at?: string;
};
