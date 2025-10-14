import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import credientialReducer from './slices/credientialSlice';
import connectionReducer from './slices/leaseSlice';
import dashbordReducer from './slices/dashboardSlice';


export const store = configureStore({
  reducer: {
    user: userReducer,
    credential: credientialReducer,
    lease: connectionReducer,
    dashboard : dashbordReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
