import api from "./api";
import { DashboardData } from "../types/dashboard";

export const getDashboard = async (days = 31): Promise<DashboardData> => {
  const { data } = await api.get("/dashboard", { params: { days } });
  return data as DashboardData;
};
