import axiosClient from "./axios";

export const getPublicationReport = () => axiosClient.get("/reports/publications");
export const getResearcherReport = () => axiosClient.get("/reports/researchers");
export const getCollaborationReport = () => axiosClient.get("/reports/collaborations");
export const getInstitutionReport = () => axiosClient.get("/reports/institutions");
export const getSavedReports = () => axiosClient.get("/reports/saved");
export const createSavedReport = (data) => axiosClient.post("/reports/saved", data);

export const getCsvExportUrl = (reportType) => `http://127.0.0.1:8000/reports/export/csv?report_type=${reportType}`;
export const getPdfExportUrl = (reportType) => `http://127.0.0.1:8000/reports/export/pdf?report_type=${reportType}`;
