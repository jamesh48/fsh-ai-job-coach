import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { DailyLog, LogFormValues } from '@/features/logs/types'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Log'],
  endpoints: (builder) => ({
    getLogs: builder.query<DailyLog[], void>({
      query: () => '/logs',
      providesTags: ['Log'],
    }),
    addLog: builder.mutation<DailyLog, LogFormValues>({
      query: (body) => ({ url: '/logs', method: 'POST', body }),
      invalidatesTags: ['Log'],
    }),
    updateLog: builder.mutation<DailyLog, DailyLog>({
      query: ({ id, ...body }) => ({ url: `/logs/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Log'],
    }),
    deleteLog: builder.mutation<void, string>({
      query: (id) => ({ url: `/logs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Log'],
    }),
  }),
})

export const {
  useGetLogsQuery,
  useAddLogMutation,
  useUpdateLogMutation,
  useDeleteLogMutation,
} = api
