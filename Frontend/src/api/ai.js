import axiosClient from "./axios";

export const askAssistant = (message) => axiosClient.post("/ai/chat", { message });
