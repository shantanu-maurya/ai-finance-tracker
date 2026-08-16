import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { getErrorMessage } from '../utils/api';

export const fetchTransactions = createAsyncThunk(
  'transactions/fetch',
  async (params, { getState, rejectWithValue }) => {
    try {
      const filters = params || getState().transactions.filters;

      // Blank filters are stripped so the backend never receives
      // `?category=`, which would filter on an empty string.
      const query = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined && value !== null)
      );

      const { data } = await api.get('/transactions', { params: query });
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Could not load transactions'));
    }
  }
);

export const createTransaction = createAsyncThunk(
  'transactions/create',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await api.post('/transactions', payload);
      // Refetch so pagination totals and the active sort stay correct.
      dispatch(fetchTransactions());
      return data.transaction;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Could not save the transaction'));
    }
  }
);

export const updateTransaction = createAsyncThunk(
  'transactions/update',
  async ({ id, updates }, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await api.put(`/transactions/${id}`, updates);
      dispatch(fetchTransactions());
      return data.transaction;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Could not update the transaction'));
    }
  }
);

export const deleteTransaction = createAsyncThunk(
  'transactions/delete',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await api.delete(`/transactions/${id}`);
      dispatch(fetchTransactions());
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Could not delete the transaction'));
    }
  }
);

const defaultFilters = {
  page: 1,
  limit: 10,
  type: '',
  category: '',
  search: '',
  sort: 'latest'
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState: {
    items: [],
    pagination: { page: 1, limit: 10, total: 0, pages: 1 },
    filters: { ...defaultFilters },
    loading: false,
    saving: false,
    error: null
  },
  reducers: {
    setFilters: (state, action) => {
      // Any filter change resets to page 1 - staying on page 4 of a
      // now-2-page result set shows an empty table.
      const changingPage = Object.keys(action.payload).length === 1 && 'page' in action.payload;
      state.filters = {
        ...state.filters,
        ...action.payload,
        ...(changingPage ? {} : { page: 1 })
      };
    },
    resetFilters: (state) => {
      state.filters = { ...defaultFilters };
    },
    clearTransactionError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.transactions;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // create / update / delete share the same saving + error handling.
    [createTransaction, updateTransaction, deleteTransaction].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.saving = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state) => {
          state.saving = false;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.saving = false;
          state.error = action.payload;
        });
    });
  }
});

export const { setFilters, resetFilters, clearTransactionError } = transactionsSlice.actions;
export default transactionsSlice.reducer;
