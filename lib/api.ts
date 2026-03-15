import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type {
  AiRecommendationResponse,
  StoredRecommendationResponse,
} from '@/features/ai/types'
import type { DailyLog, LogFormValues } from '@/features/logs/types'
import type { AppSettings, SettingsFormValues } from '@/features/settings/types'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Log', 'Settings', 'AiRecommendation'],
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
    getStoredRecommendation: builder.query<StoredRecommendationResponse, void>({
      query: () => '/ai/recommendation',
      providesTags: ['AiRecommendation'],
    }),
    getAiRecommendation: builder.mutation<
      AiRecommendationResponse,
      { date: string }
    >({
      query: (body) => ({ url: '/ai/recommendation', method: 'POST', body }),
      invalidatesTags: ['AiRecommendation'],
    }),
    summarizeJob: builder.mutation<
      { summary: string },
      { description: string }
    >({
      query: (body) => ({ url: '/ai/summarize', method: 'POST', body }),
    }),
    draftImpression: builder.mutation<
      { impression: string },
      {
        jobTitle?: string
        company?: string
        priority?: string
        roleDescription?: string
      }
    >({
      query: (body) => ({ url: '/ai/impression', method: 'POST', body }),
    }),
    summarizeNotes: builder.mutation<{ summary: string }, { notes: string }>({
      query: (body) => ({ url: '/ai/summarize-notes', method: 'POST', body }),
    }),
    generatePlan: builder.mutation<
      { plan: string },
      {
        startDate?: string
        durationWeeks?: number
        priorities?: string
        additionalContext?: string
      }
    >({
      query: (body) => ({ url: '/ai/generate-plan', method: 'POST', body }),
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
  useGetStoredRecommendationQuery,
  useGetAiRecommendationMutation,
  useSummarizeJobMutation,
  useDraftImpressionMutation,
  useSummarizeNotesMutation,
  useGeneratePlanMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} = api
