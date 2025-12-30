import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getFileList } from "../api/fileBoxApi";

// 초기 상태
const initialState = {
  fileList: [], // 파일 목록 데이터
  totalCount: 0,
  page: 1,
  size: 10,
  loading: false,
  error: null,
  refresh: false, // 리스트 갱신 트리거
};

// 비동기 액션: 파일 리스트 가져오기
export const fetchFilesAsync = createAsyncThunk(
  "fileBox/fetchFiles",
  async ({ pageParam, filter }, thunkAPI) => {
    try {
      const response = await getFileList(pageParam, filter);
      return response;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

const fileBoxSlice = createSlice({
  name: "fileBox",
  initialState,
  reducers: {
    // 리스트 강제 갱신용 리듀서
    refreshFiles: (state) => {
      state.refresh = !state.refresh;
    },
    clearFileState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFilesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFilesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.fileList = action.payload.dtoList; // PageResponseDTO 구조 가정
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchFilesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { refreshFiles, clearFileState } = fileBoxSlice.actions;
export default fileBoxSlice.reducer;
