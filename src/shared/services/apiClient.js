import axios from "axios";
import toast from "react-hot-toast";
import { getToken, clearToken } from "../utils/session";

const acApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20000,
});

acApiClient.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const defaultMessages = {
  400: "اطلاعات ارسال‌شده صحیح نیست",
  401: "دسترسی غیرمجاز است، دوباره وارد شوید",
  403: "شما اجازه‌ی دسترسی به این بخش را ندارید",
  404: "موردی یافت نشد",
  500: "خطای سرور، لطفا بعدا تلاش کنید",
};

const MAX_RETRIES = 1;

acApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (!error.response) {
      const retryCount = config?.retryCount ?? 0;
      const canRetry = config?.method === "get" && retryCount < MAX_RETRIES;

      if (canRetry) {
        config.retryCount = retryCount + 1;
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * config.retryCount)
        );
        return acApiClient(config);
      }

      toast.error("ارتباط با سرور برقرار نشد");
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    const notLoggedIn =
      status === 401 &&
      typeof data?.message === "string" &&
      data.message.includes("لاگین");

    if (notLoggedIn && window.location.pathname.startsWith("/dashboard")) {
      clearToken();
      window.location.href = "/login";
    } else {
      const message =
        data?.message || defaultMessages[status] || "مشکلی پیش آمد";
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default acApiClient;
