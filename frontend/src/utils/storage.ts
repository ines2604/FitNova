import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "@fitnova/token";
const USER_KEY = "@fitnova/user";

export type StoredUser = {
  id: number;
  fullName: string;
  email: string;
  profilePhoto?: string | null;
  role?: string;
  emailVerified?: boolean;
};

export const saveSession = async (token: string, user: StoredUser) => {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
};

export const getToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

export const getUser = async (): Promise<StoredUser | null> => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const updateStoredUser = async (partial: Partial<StoredUser>) => {
  const current = await getUser();
  if (!current) return;
  await AsyncStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...partial }));
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
};
