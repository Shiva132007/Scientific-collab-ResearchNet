import axiosClient from "./axios";

export const registerUser = (data) =>{
    return axiosClient.post("/users/register",data);
};

export const verifyEmail = (email, otp) => {
    return axiosClient.post("/users/verify-email", { email, otp });
};

export const resendVerification = (email) => {
    return axiosClient.post("/users/resend-verification", { email });
};

export const loginUser = (email,password) =>{
    const formData = new URLSearchParams();
    formData.append("username",email);
    formData.append("password",password);

    return axiosClient.post("/users/login", formData, {
        headers: {"Content-Type":"application/x-www-form-urlencoded"},
    });
};

export const verifyLoginOtp = (email, otp) => {
    return axiosClient.post("/users/login/verify", { email, otp });
};

export const getCurrentUser = () =>{
    return axiosClient.get("/users/me");
};

export const changePassword = (data) => {
    return axiosClient.put("/users/change-password", data);
};

export const logoutUser = ()=>{
    localStorage.removeItem("token");
};
