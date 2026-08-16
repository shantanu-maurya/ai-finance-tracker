import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { getErrorMessage } from '../utils/api';

export const fetchBudget = createAsyncThunk('budget/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/budget');
    return data.budget;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Could not load your budget'));
  }
});

/**
 * POST handles both create and update thanks to the upsert on the server, so
 * the UI needs a single save flow rather than separate first-time and edit
 * paths.
 */
export const saveBudget = createAsyncThunk('budget/save', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/budget', payload);
    return data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Could not save your budget'));
  }
});

const budgetSlice = createSlice({
  name: 'budget',
  initialState: {
    budget: { monthlyBudget: 0, categoryBudgets: [] },
    loading: false,
    saving: false,
    error: null,
    message: null
  },
  reducers: {
    clearBudgetFeedback: (state) => {
      state.error = null;
      state.message = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBudget.fulfilled, (state, action) => {
        state.loading = false;
        state.budget = action.payload;
      })
      .addCase(fetchBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(saveBudget.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.message = null;
      })
      .addCase(saveBudget.fulfilled, (state, action) => {
        state.saving = false;
        state.budget = action.payload.budget;
        state.message = action.payload.message || 'Budget saved';
      })
      .addCase(saveBudget.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  }
});

export const { clearBudgetFeedback } = budgetSlice.actions;
export default budgetSlice.reducer;
