import axiosClient from "./axios";

export const getPublications = (status) => {
  const params = status ? { status } : {};
  return axiosClient.get("/publications/", { params });
};

export const getPublication = (id) => axiosClient.get(`/publications/${id}`);

export const createPublication = (data) => axiosClient.post("/publications/", data);

export const updatePublication = (id, data) => axiosClient.put(`/publications/${id}`, data);

export const updatePublicationStatus = (id, status) =>
  axiosClient.put(`/publications/${id}/status`, { status });

export const deletePublication = (id) => axiosClient.delete(`/publications/${id}`);

export const uploadPublicationFile = (publicationId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  return axiosClient.post(`/publications/${publicationId}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const addAuthor = (publicationId, data) =>
  axiosClient.post(`/publications/${publicationId}/authors`, data);

export const getAuthors = (publicationId) =>
  axiosClient.get(`/publications/${publicationId}/authors`);

export const removeAuthor = (publicationId, researcherId) =>
  axiosClient.delete(`/publications/${publicationId}/authors/${researcherId}`);

export const lookupDoi = (doi) =>
  axiosClient.get(`/publications/doi-lookup/${encodeURIComponent(doi)}`);

export const exportCitation = (id, format = "bibtex") =>
  axiosClient.get(`/publications/${id}/export-citation`, {
    params: { format },
    responseType: "text",
  });

