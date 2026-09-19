import axiosClient from "./axios";

export const getResearchers = () => axiosClient.get("/researchers/");
export const getMyProfile = () => axiosClient.get("/researchers/me");
export const updateMyProfile = (data) => axiosClient.put("/researchers/me", data);
export const discoverResearchers = (params) => axiosClient.get("/researchers/discover", { params });
export const getResearcher = (id) => axiosClient.get(`/researchers/${id}`);
export const createResearcher = (data) => axiosClient.post("/researchers/", data);
export const updateResearcher = (id, data) => axiosClient.put(`/researchers/${id}`, data);
export const deleteResearcher = (id) => axiosClient.delete(`/researchers/${id}`);
export const getInstitutions = () => axiosClient.get("/institutions/");
export const getDepartments = () => axiosClient.get("/departments/");
export const lookupOrcid = (orcidId) => axiosClient.get(`/researchers/orcid-lookup/${encodeURIComponent(orcidId)}`);

