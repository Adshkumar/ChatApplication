import axios from 'axios';

// FOR DEPLOYED VERSION (Use this)
export const axiosInstance = axios.create({
    baseURL: "https://chatapplication-rs0f.onrender.com/api",
    withCredentials: true,
});

// FOR LOCAL DEVELOPMENT (Use this when testing on localhost)
// export const axiosInstance = axios.create({
//     baseURL: "http://localhost:5000/api",
//     withCredentials: true,
// });

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);