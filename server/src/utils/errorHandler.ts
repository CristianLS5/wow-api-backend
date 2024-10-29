import { Response } from "express";
import axios, { AxiosError } from "axios";

export const handleApiError = (
  error: unknown,
  res: Response,
  context: string
) => {
  console.error(`Error ${context}:`, error);

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    console.error("API error details:", {
      response: axiosError.response?.data,
      status: axiosError.response?.status,
    });
  }

  res.status(500).json({
    error: `Failed to ${context}`,
    details:
      process.env.NODE_ENV === "development"
        ? error instanceof Error
          ? error.message
          : "Unknown error"
        : undefined,
  });
};
