import axiosClient from "./axios";

export const getAuditLogs = (limit = 50) => axiosClient.get(`/audit/?limit=${limit}`);
