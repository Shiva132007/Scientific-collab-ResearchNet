import axiosClient from "./axios";

export const globalSearch = (q) => axiosClient.get("/search/", { params: { q } });
