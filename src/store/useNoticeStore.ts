import { create } from 'zustand';

export interface AnalysisResult {
  agency: string | null;
  notice_type: string | null;
  tax_year: number | null;
  client_name_on_notice: string | null;
  response_due_date: string | null;
  summary: string | null;
}

interface NoticeState {
  // Wizard step
  currentStep: 1 | 2;

  // Step 1: Notice upload
  taxYear: string;
  selectedFile: File | null;
  uploadedFilePath: string | null;
  uploadProgress: number;
  isUploading: boolean;
  isAnalyzing: boolean;
  analysisResult: AnalysisResult | null;
  showReviewModal: boolean;
  isDragging: boolean;
  uploadError: string | null;

  // Step 2: Tax return upload
  taxReturnFile: File | null;
  taxReturnFilePath: string | null;
  taxReturnUploadProgress: number;
  isTaxReturnUploading: boolean;
  isTaxReturnDragging: boolean;
  taxReturnUploadError: string | null;

  // Submission
  isSaving: boolean;
  submitted: boolean;

  // Actions
  setCurrentStep: (step: 1 | 2) => void;
  setTaxYear: (year: string) => void;
  setSelectedFile: (file: File | null) => void;
  setUploadedFilePath: (path: string | null) => void;
  setUploadProgress: (progress: number | ((prev: number) => number)) => void;
  setIsUploading: (v: boolean) => void;
  setIsAnalyzing: (v: boolean) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setShowReviewModal: (v: boolean) => void;
  setIsDragging: (v: boolean) => void;
  setUploadError: (error: string | null) => void;

  setTaxReturnFile: (file: File | null) => void;
  setTaxReturnFilePath: (path: string | null) => void;
  setTaxReturnUploadProgress: (progress: number | ((prev: number) => number)) => void;
  setIsTaxReturnUploading: (v: boolean) => void;
  setIsTaxReturnDragging: (v: boolean) => void;
  setTaxReturnUploadError: (error: string | null) => void;

  setIsSaving: (v: boolean) => void;
  setSubmitted: (v: boolean) => void;

  /** Reset the entire wizard to its initial state */
  reset: () => void;
}

const initialState = {
  currentStep: 1 as const,
  taxYear: '2025',
  selectedFile: null,
  uploadedFilePath: null,
  uploadProgress: 0,
  isUploading: false,
  isAnalyzing: false,
  analysisResult: null,
  showReviewModal: false,
  isDragging: false,
  uploadError: null,
  taxReturnFile: null,
  taxReturnFilePath: null,
  taxReturnUploadProgress: 0,
  isTaxReturnUploading: false,
  isTaxReturnDragging: false,
  taxReturnUploadError: null,
  isSaving: false,
  submitted: false,
};

export const useNoticeStore = create<NoticeState>((set) => ({
  ...initialState,

  setCurrentStep: (step) => set({ currentStep: step }),
  setTaxYear: (year) => set({ taxYear: year }),
  setSelectedFile: (file) => set({ selectedFile: file }),
  setUploadedFilePath: (path) => set({ uploadedFilePath: path }),
  setUploadProgress: (progress) =>
    set((state) => ({
      uploadProgress: typeof progress === 'function' ? progress(state.uploadProgress) : progress,
    })),
  setIsUploading: (v) => set({ isUploading: v }),
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setShowReviewModal: (v) => set({ showReviewModal: v }),
  setIsDragging: (v) => set({ isDragging: v }),
  setUploadError: (error) => set({ uploadError: error }),

  setTaxReturnFile: (file) => set({ taxReturnFile: file }),
  setTaxReturnFilePath: (path) => set({ taxReturnFilePath: path }),
  setTaxReturnUploadProgress: (progress) =>
    set((state) => ({
      taxReturnUploadProgress:
        typeof progress === 'function' ? progress(state.taxReturnUploadProgress) : progress,
    })),
  setIsTaxReturnUploading: (v) => set({ isTaxReturnUploading: v }),
  setIsTaxReturnDragging: (v) => set({ isTaxReturnDragging: v }),
  setTaxReturnUploadError: (error) => set({ taxReturnUploadError: error }),

  setIsSaving: (v) => set({ isSaving: v }),
  setSubmitted: (v) => set({ submitted: v }),

  reset: () => set(initialState),
}));
