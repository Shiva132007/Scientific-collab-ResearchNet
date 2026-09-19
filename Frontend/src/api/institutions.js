import axiosClient from "./axios";

export const getInstitutions = () => axiosClient.get("/institutions/");
export const getInstitution = (id) => axiosClient.get(`/institutions/${id}`);
export const createInstitution = (data) => axiosClient.post("/institutions/", data);
export const updateInstitution = (id, data) =>
  axiosClient.put("/institutions/", data, { params: { institution_id: id } });
export const deleteInstitution = (id) => axiosClient.delete(`/institutions/${id}`);
