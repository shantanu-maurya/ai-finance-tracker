import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { getErrorMessage } from '../utils/api';

/**
 * Owns all read-only analytics state: the dashboard summary, the AI insights,
 * and the spending prediction.
 *
 * The dashboard summary lives here rather than in its own slice because the
 * Dashboard and the Budget page both need it - Budget overlays the saved
 * category limits on the live spend figures - and a shared slice means one
 * fetch instead of two competing ones.
 */

export const fetchDashboard = createAsyncThunk(
  'insights/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/dashboard/summary');
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Could not load the dashboard'));
    }
  }
);

export const fetchInsights = createAsyncThunk(
  'insights/fetchInsights',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/ai/insights');
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Could not generate insights'));
    }
  }
);

export const fetchPrediction = createAsyncThunk(
  'insights/fetchPrediction',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/ai/predict');
      return data.prediction;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Could not generate a prediction'));
    }
  }
);

const insightsSlice = createSlice({
  name: 'insights',
  initialState: {
    summary: null,
    monthlyTrend: [],
    categoryBreakdown: [],
    recentTransactions: [],
    dashboardLoading: false,
    dashboardError: null,

    insights: [],
    recommendations: [],
    provider: null, // 'openai' | 'heuristic' - drives the badge on the Insights page
    insightsSummary: null,
    insightsLoading: false,
    insightsError: null,

    prediction: null,
    predictionLoading: false
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.dashboardLoading = true;
        state.dashboardError = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.dashboardLoading = false;
        state.summary = action.payload.summary;
        state.monthlyTrend = action.payload.monthlyTrend;
        state.categoryBreakdown = action.payload.categoryBreakdown;
        state.recentTransactions = action.payload.recentTransactions;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardError = action.payload;
      })

      .addCase(fetchInsights.pending, (state) => {
        state.insightsLoading = true;
        state.insightsError = null;
      })
      .addCase(fetchInsights.fulfilled, (state, action) => {
        state.insightsLoading = false;
        state.insights = action.payload.insights;
        state.recommendations = action.payload.recommendations;
        state.provider = action.payload.provider;
        state.insightsSummary = action.payload.summary;
      })
      .addCase(fetchInsights.rejected, (state, action) => {
        state.insightsLoading = false;
        state.insightsError = action.payload;
      })

      .addCase(fetchPrediction.pending, (state) => {
        state.predictionLoading = true;
      })
      .addCase(fetchPrediction.fulfilled, (state, action) => {
        state.predictionLoading = false;
        state.prediction = action.payload;
      })
      .addCase(fetchPrediction.rejected, (state) => {
        state.predictionLoading = false;
      });
  }
});

export default insightsSlice.reducer;
