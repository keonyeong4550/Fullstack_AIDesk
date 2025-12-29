import { configureStore } from "@reduxjs/toolkit";
import loginSlice from "./slices/loginSlice";
import pinSlice from "./slices/pinSlice";
import fileBoxSlice from "./slices/fileBoxSlice";

export default configureStore({
  reducer: {
    loginSlice: loginSlice,
    pinSlice: pinSlice,
    fileBox: fileBoxSlice,
  },
});
