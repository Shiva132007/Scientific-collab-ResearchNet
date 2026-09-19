import axiosClient from "./axios";

export const sendCollaborationRequest = (data) => axiosClient.post("/collaboration-requests/", data);
export const getSentRequests = () => axiosClient.get("/collaboration-requests/sent");
export const getIncomingRequests = () => axiosClient.get("/collaboration-requests/incoming");
export const acceptRequest = (id) => axiosClient.put(`/collaboration-requests/${id}/accept`);
export const declineRequest = (id) => axiosClient.put(`/collaboration-requests/${id}/decline`);
