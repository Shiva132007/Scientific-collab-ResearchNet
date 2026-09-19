import axiosClient from "./axios";

export const addCitation = (data) => axiosClient.post("/citations/", data);
export const removeCitation = (citingId, citedId) => axiosClient.delete(`/citations/${citingId}/${citedId}`);
export const getCitationsMade = (pubId) => axiosClient.get(`/citations/citing/${pubId}`);
export const getCitationsReceived = (pubId) => axiosClient.get(`/citations/cited/${pubId}`);
