import axiosClient from "./axios";

export const getConferences = () => axiosClient.get("/conferences/");
export const getConference = (id) => axiosClient.get(`/conferences/${id}`);
export const createConference = (data) => axiosClient.post("/conferences/", data);
export const updateConference = (id, data) => axiosClient.put(`/conferences/${id}`, data);
export const deleteConference = (id) => axiosClient.delete(`/conferences/${id}`);
export const registerConferenceParticipation = (confId, data) => axiosClient.post(`/conferences/${confId}/participations`, data);
export const removeConferenceParticipation = (confId, researcherId) => axiosClient.delete(`/conferences/${confId}/participations/${researcherId}`);
