"use client";

import {
  useMutation,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";

export function useApiMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    successMessage?: string;
  }
) {
  const { successMessage, onSuccess, onError, ...rest } = options;

  return useMutation<TData, TError, TVariables, TContext>({
    ...rest,
    onSuccess: (data, variables, context, mutation) => {
      if (successMessage) toast.success(successMessage);
      onSuccess?.(data, variables, context, mutation);
    },
    onError: (error: any, variables, context, mutation) => {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Erro inesperado";
      toast.error(String(msg));
      onError?.(error, variables, context, mutation);
    },
  });
}