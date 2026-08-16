import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { getErrorMessage } from '../utils/api';

const storedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
};

const persistSession = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const signup = createAsyncThunk('auth/signup', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/signup', payload);
    persistSession(data.token, data.user);
    return data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Could not create your account'));
  }
});

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', payload);
    persistSession(data.token, data.user);
    return data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Could not sign you in'));
  }
});

/** Re-validates the stored token on app load, so a stale token logs out cleanly. */
export const refreshUser = createAsyncThunk('auth/refreshUser', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Session expired'));
  }
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.put('/auth/profile', payload);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Could not update your profile'));
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.put('/auth/password', payload);
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Could not update your password'));
    }
  }
);

export const fetchAccountStats = createAsyncThunk(
  'auth/fetchAccountStats',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/auth/stats');
      return data.stats;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Could not load account statistics'));
    }
  }
);

const initialState = {
  user: storedUser(),
  token: localStorage.getItem('token') || null,
  // `true` until refreshUser settles, so ProtectedRoute does not bounce a
  // logged-in user to /login during the first render.
  initialising: Boolean(localStorage.getItem('token')),
  loading: false,
  error: null,
  message: null,
  stats: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      state.user = null;
      state.token = null;
      state.stats = null;
      state.error = null;
      state.message = null;
    },
    clearAuthFeedback: (state) => {
      state.error = null;
      state.message = null;
    }
  },
  extraReducers: (builder) => {
    const authFulfilled = (state, action) => {
      state.loading = false;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.error = null;
    };

    builder
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, authFulfilled)
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, authFulfilled)
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(refreshUser.pending, (state) => {
        state.initialising = true;
      })
      .addCase(refreshUser.fulfilled, (state, action) => {
        state.initialising = false;
        state.user = action.payload;
      })
      .addCase(refreshUser.rejected, (state) => {
        // The axios interceptor already cleared storage on a 401.
        state.initialising = false;
        state.user = null;
        state.token = null;
      })

      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.message = action.payload.message || 'Profile updated';
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message || 'Password updated';
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchAccountStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  }
});

export const { logout, clearAuthFeedback } = authSlice.actions;
export default authSlice.reducer;
