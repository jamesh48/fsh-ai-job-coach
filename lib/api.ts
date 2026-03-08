import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { AiRecommendationResponse } from '@/features/ai/types'
import type { DailyLog, LogFormValues } from '@/features/logs/types'
import type { AppSettings, SettingsFormValues } from '@/features/settings/types'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Log', 'Settings'],
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
    getAiRecommendation: builder.mutation<AiRecommendationResponse, void>({
      query: () => ({ url: '/ai/recommendation', method: 'POST' }),
    }),
    getSettings: builder.query<AppSettings, void>({
      query: () => '/settings',
      providesTags: ['Settings'],
    }),
    updateSettings: builder.mutation<AppSettings, SettingsFormValues>({
      query: (body) => ({ url: '/settings', method: 'PUT', body }),
      invalidatesTags: ['Settings'],
    }),
  }),
})

export const {
  useGetLogsQuery,
  useAddLogMutation,
  useUpdateLogMutation,
  useDeleteLogMutation,
  useGetAiRecommendationMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} = api
