import axiosClient from "./axios";

export const getDashboardStats = () => axiosClient.get("/dashboard/stats");
