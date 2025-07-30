// Simple state management for file upload
let currentFile: File | null = null;

export const fileState = {
  setFile: (file: File) => {
    currentFile = file;
  },
  getFile: () => currentFile,
  clearFile: () => {
    currentFile = null;
  },
}; 