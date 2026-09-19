import axios from "axios";
const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "https://scientific-collab-researchnet.onrender.com",
    headers:{
        'Content-Type':"application/json",
    },
});

axiosClient.interceptors.request.use((config)=>{
    const token = localStorage.getItem("token");
    if (token){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosClient.interceptors.response.use(
    (response)=>response,
    (error)=>{
        if(error.response?.status === 401){
            localStorage.removeItem("token");
        }
        return Promise.reject(error)
    }
)

export default axiosClient;