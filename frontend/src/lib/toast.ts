import toast from "react-hot-toast";
import axios, { AxiosError } from "axios";

/**
 * Extract error message from various error sources
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      detail?: string;
      message?: string;
      error?: string;
      [key: string]: unknown;
    }>;

    // Try to extract detailed error message from response
    if (axiosError.response?.data) {
      const data = axiosError.response.data;

      // Common API error response formats
      if (typeof data.detail === "string") {
        return data.detail;
      }
      if (typeof data.message === "string") {
        return data.message;
      }
      if (typeof data.error === "string") {
        return data.error;
      }

      // Handle array of errors (common DRF format)
      if (
        typeof data === "object" &&
        data !== null &&
        !Array.isArray(data)
      ) {
        const firstKey = Object.keys(data)[0];
        const value = data[firstKey];
        if (Array.isArray(value) && value.length > 0) {
          return String(value[0]);
        }
        if (typeof value === "string") {
          return value;
        }
      }

      // Fallback to stringified data
      if (Object.keys(data).length > 0) {
        return JSON.stringify(data);
      }
    }

    // Status code based fallback
    const statusMessage = getStatusMessage(axiosError.response?.status);
    if (statusMessage) {
      return statusMessage;
    }

    return axiosError.message || "An API error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error) || "An unexpected error occurred";
};

/**
 * Get user-friendly message for HTTP status codes
 */
const getStatusMessage = (status?: number): string | null => {
  const statusMessages: Record<number, string> = {
    400: "Invalid request. Please check your input.",
    401: "Authentication failed. Please login again.",
    403: "You don't have permission to perform this action.",
    404: "The requested resource was not found.",
    409: "Conflict: The resource already exists or has been modified.",
    422: "Validation failed. Please check your input.",
    429: "Too many requests. Please try again later.",
    500: "Server error. Please try again later.",
    502: "Service temporarily unavailable.",
    503: "Service is under maintenance. Please try again later.",
  };

  return statusMessages[status || 0] || null;
};

/**
 * Show error toast with extracted message
 */
export const errorToast = (
  error: unknown,
  fallbackMessage: string = "An error occurred"
): string => {
  const message = getErrorMessage(error) || fallbackMessage;
  toast.error(message, {
    position: "bottom-center",
    duration: 4000,
    style: {
      borderRadius: "8px",
      background: "#ef4444",
      color: "#fff",
    },
  });
  return message;
};

/**
 * Show success toast
 */
export const successToast = (message: string): void => {
  toast.success(message, {
    position: "bottom-center",
    duration: 3000,
    style: {
      borderRadius: "8px",
      background: "#10b981",
      color: "#fff",
    },
  });
};

/**
 * Show info toast
 */
export const infoToast = (message: string): void => {
  toast(message, {
    position: "bottom-center",
    duration: 3000,
    icon: "ℹ️",
    style: {
      borderRadius: "8px",
      background: "#3b82f6",
      color: "#fff",
    },
  });
};

/**
 * Show warning toast
 */
export const warningToast = (message: string): void => {
  toast(message, {
    position: "bottom-center",
    duration: 3000,
    icon: "⚠️",
    style: {
      borderRadius: "8px",
      background: "#f59e0b",
      color: "#fff",
    },
  });
};
