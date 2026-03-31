import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Video, 
  FolderOpen, 
  Plus, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Image as ImageIcon,
  Trash2,
  ChevronRight,
  Camera as CameraIcon,
  Video as VideoIcon,
  Check,
  Download,
  FileArchive,
  Upload,
  File
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { StorageService, ContainerFile, ContainerFolder } from './services/storageService';
import { cn } from './lib/utils';

// --- Types ---

type AppState = 'HOME' | 'CAPTURE_CODE' | 'CAPTURE_VIDEO' | 'CAPTURE_PHOTOS' | 'CAPTURE_CONFIRM' | 'VIEW_LIST' | 'VIEW_DETAIL' | 'UPLOAD_FILES';

interface CaptureData {
  code: string;
  videoBlob: Blob | null;
  photoBlobs: Blob[];
  photoNames: string[];
}

// --- Components ---

export default function App() {
  const [state, setState] = useState<AppState>('HOME');
  const [captureData, setCaptureData] = useState<CaptureData>({
    code: '',
    videoBlob: null,
    photoBlobs: [],
    photoNames: []
  });
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folders, setFolders] = useState<ContainerFolder[]>([]);
  const [currentFiles, setCurrentFiles] = useState<ContainerFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    type: 'confirm' | 'alert';
  }>({
    show: false,
    title: '',
    message: '',
    type: 'alert'
  });

  // Load folders on mount and when returning to list
  useEffect(() => {
    if (state === 'VIEW_LIST' || state === 'HOME') {
      loadFolders();
    }
  }, [state]);

  const loadFolders = async () => {
    const list = await StorageService.listContainers();
    setFolders(list);
  };

  const handleNewCapture = () => {
    setCaptureData({ code: '', videoBlob: null, photoBlobs: [], photoNames: [] });
    setState('CAPTURE_CODE');
  };

  const handleViewContainers = () => {
    setState('VIEW_LIST');
  };

  const handleFolderSelect = async (code: string) => {
    setSelectedFolder(code);
    const files = await StorageService.getContainerFiles(code);
    setCurrentFiles(files);
    setState('VIEW_DETAIL');
  };

  const handleBack = () => {
    if (state === 'CAPTURE_CODE') setState('HOME');
    else if (state === 'CAPTURE_VIDEO') setState('CAPTURE_CODE');
    else if (state === 'CAPTURE_PHOTOS') setState('CAPTURE_VIDEO');
    else if (state === 'CAPTURE_CONFIRM') setState('CAPTURE_PHOTOS');
    else if (state === 'VIEW_LIST') setState('HOME');
    else if (state === 'VIEW_DETAIL') setState('VIEW_LIST');
  };

  const downloadFile = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    currentFiles.forEach(file => {
      if (file.blob) {
        downloadFile(file.blob, `${selectedFolder}_${file.name}`);
      }
    });
  };

  const downloadAsZip = async () => {
    if (!selectedFolder) return;
    
    try {
      const zip = new JSZip();
      const folder = zip.folder(selectedFolder);
      
      if (!folder) return;

      const photoFolder = folder.folder('photo');
      const videoFolder = folder.folder('video');

      currentFiles.forEach(file => {
        if (file.blob) {
          if (file.name.endsWith('.mp4')) {
            videoFolder?.file(file.name, file.blob);
          } else {
            photoFolder?.file(file.name, file.blob);
          }
        }
      });

      const content = await zip.generateAsync({ type: 'blob' });
      downloadFile(content, `${selectedFolder}.zip`);
    } catch (err) {
      setModal({
        show: true,
        title: 'Error',
        message: 'Failed to create ZIP file. Please try again.',
        type: 'alert'
      });
    }
  };

  const showAlert = (title: string, message: string) => {
    setModal({ show: true, title, message, type: 'alert' });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModal({ show: true, title, message, onConfirm, type: 'confirm' });
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-blue-100">
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between bg-white border-b border-neutral-200 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            {state !== 'HOME' && (
              <button 
                onClick={handleBack}
                className="p-2 -ml-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="font-bold text-lg tracking-tight">
              {state === 'HOME' ? 'Container Inspector' : 
               state.startsWith('CAPTURE') ? 'New Capture' : 
               state === 'VIEW_LIST' ? 'Containers' : 'Folder View'}
            </h1>
          </div>
          {state === 'HOME' && (
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <Camera size={16} />
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col p-6">
          <AnimatePresence mode="wait">
            {state === 'HOME' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col gap-4 mt-8"
              >
                <button 
                  onClick={handleNewCapture}
                  className="group relative flex items-center justify-between p-6 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-xl font-bold">New Capture</span>
                    <span className="text-blue-100 text-sm">Start inspection flow</span>
                  </div>
                  <Plus size={32} className="opacity-80 group-hover:rotate-90 transition-transform" />
                </button>

                <button 
                  onClick={handleViewContainers}
                  className="group relative flex items-center justify-between p-6 bg-white border border-neutral-200 text-neutral-800 rounded-2xl shadow-sm active:scale-95 transition-all"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-xl font-bold">View Containers</span>
                    <span className="text-neutral-500 text-sm">Browse saved files</span>
                  </div>
                  <FolderOpen size={32} className="text-neutral-400" />
                </button>

                <div className="mt-12 p-6 rounded-2xl bg-neutral-100 border border-neutral-200">
                  <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">Recent Stats</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <span className="block text-2xl font-bold text-neutral-800">{folders.length}</span>
                      <span className="text-xs text-neutral-500">Total Containers</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <span className="block text-2xl font-bold text-neutral-800">Local</span>
                      <span className="text-xs text-neutral-500">Storage Mode</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {state === 'CAPTURE_CODE' && (
              <CaptureCodeStep 
                onNext={async (code) => {
                  try {
                    // Auto-create folder even if empty
                    await StorageService.createFolder(code);
                    
                    // Check if there are existing files to resume
                    const existingFiles = await StorageService.getContainerFiles(code);
                    const videoFile = existingFiles.find(f => f.name === 'video_1.mp4');
                    const photoFiles = existingFiles.filter(f => f.name.startsWith('photo_'));
                    
                    setCaptureData({
                      code,
                      videoBlob: videoFile?.blob || null,
                      photoBlobs: photoFiles.map(f => f.blob!).filter(Boolean),
                      photoNames: photoFiles.map(f => f.name)
                    });
                    
                    // If video exists, skip to photos
                    if (videoFile) {
                      setState('CAPTURE_PHOTOS');
                    } else {
                      setState('CAPTURE_VIDEO');
                    }
                  } catch (err) {
                    console.error("Error creating folder:", err);
                    setError("Failed to initialize folder.");
                  }
                }}
                onUpload={(code) => {
                  setCaptureData(prev => ({ ...prev, code }));
                  setState('UPLOAD_FILES');
                }}
                onCancel={() => setState('HOME')}
              />
            )}

            {state === 'UPLOAD_FILES' && (
              <UploadStep 
                containerCode={captureData.code}
                onNext={() => handleFolderSelect(captureData.code)}
                onBack={() => setState('CAPTURE_CODE')}
                onCancel={() => setState('HOME')}
              />
            )}

            {state === 'CAPTURE_VIDEO' && (
              <CaptureVideoStep 
                containerCode={captureData.code}
                onNext={async (blob) => {
                  try {
                    // Auto-save video
                    await StorageService.saveFile(captureData.code, 'video', 'video_1.mp4', blob);
                    setCaptureData(prev => ({ ...prev, videoBlob: blob }));
                    setState('CAPTURE_PHOTOS');
                  } catch (err) {
                    console.error("Error saving video:", err);
                    setError("Failed to auto-save video.");
                  }
                }}
                onBack={() => setState('CAPTURE_CODE')}
                onCancel={() => {
                  showConfirm(
                    "Cancel Capture",
                    "Are you sure you want to cancel? All current progress for this container will be lost.",
                    () => setState('HOME')
                  );
                }}
              />
            )}

            {state === 'CAPTURE_PHOTOS' && (
              <CapturePhotosStep 
                containerCode={captureData.code}
                initialPhotos={captureData.photoBlobs}
                initialNames={captureData.photoNames}
                onNext={(blobs, names) => {
                  setCaptureData(prev => ({ ...prev, photoBlobs: blobs, photoNames: names }));
                  setState('CAPTURE_CONFIRM');
                }}
                onBack={() => setState('CAPTURE_VIDEO')}
                onCancel={() => {
                  showConfirm(
                    "Cancel Capture",
                    "Are you sure you want to cancel? All current progress for this container will be lost.",
                    () => setState('HOME')
                  );
                }}
              />
            )}

            {state === 'CAPTURE_CONFIRM' && (
              <CaptureConfirmStep 
                data={captureData}
                onConfirm={async () => {
                  // Everything is already auto-saved!
                  // Just finalize and go to folder view
                  handleFolderSelect(captureData.code);
                }}
                onCancel={() => setState('HOME')}
                onRetakeVideo={() => {
                  showConfirm(
                    "Retake Video",
                    "This will overwrite the existing video. Continue?",
                    async () => {
                      try {
                        await StorageService.deleteFile(captureData.code, 'video', 'video_1.mp4');
                        setCaptureData(prev => ({ ...prev, videoBlob: null }));
                        setState('CAPTURE_VIDEO');
                      } catch (err) {
                        console.error("Error deleting video for retake:", err);
                        // Still proceed to retake even if delete fails (it might not exist)
                        setState('CAPTURE_VIDEO');
                      }
                    }
                  );
                }}
                onRetakePhotos={() => {
                  showConfirm(
                    "Retake Photos",
                    "This will clear all current photos for this container. Continue?",
                    async () => {
                      try {
                        // Delete all photo files
                        for (const name of captureData.photoNames) {
                          await StorageService.deleteFile(captureData.code, 'photo', name);
                        }
                        setCaptureData(prev => ({ ...prev, photoBlobs: [], photoNames: [] }));
                        setState('CAPTURE_PHOTOS');
                      } catch (err) {
                        console.error("Error deleting photos for retake:", err);
                        setState('CAPTURE_PHOTOS');
                      }
                    }
                  );
                }}
              />
            )}

            {state === 'VIEW_LIST' && (
              <motion.div 
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                {folders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                    <FolderOpen size={48} strokeWidth={1} className="mb-4" />
                    <p>No containers found</p>
                  </div>
                ) : (
                  folders.map((folder) => (
                    <div key={folder.name} className="flex items-center gap-2">
                      <button 
                        onClick={() => handleFolderSelect(folder.name)}
                        className="flex-1 flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-xl hover:border-blue-300 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <FolderOpen size={20} />
                          </div>
                          <div className="text-left">
                            <span className="block font-semibold text-neutral-800">{folder.name}</span>
                            <span className="text-xs text-neutral-500">Karga_Container / {folder.name}</span>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-neutral-300" />
                      </button>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Temporarily set selected folder to fetch its files
                          const files = await StorageService.getContainerFiles(folder.name);
                          const zip = new JSZip();
                          const zipFolder = zip.folder(folder.name);
                          if (zipFolder) {
                            const photoFolder = zipFolder.folder('photo');
                            const videoFolder = zipFolder.folder('video');
                            files.forEach(file => {
                              if (file.blob) {
                                if (file.name.endsWith('.mp4')) videoFolder?.file(file.name, file.blob);
                                else photoFolder?.file(file.name, file.blob);
                              }
                            });
                            const content = await zip.generateAsync({ type: 'blob' });
                            downloadFile(content, `${folder.name}.zip`);
                          }
                        }}
                        className="p-4 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Download ZIP"
                      >
                        <FileArchive size={20} />
                      </button>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          showConfirm(
                            "Delete Container",
                            `Are you sure you want to delete ${folder.name} and all its files? This cannot be undone.`,
                            async () => {
                              try {
                                await StorageService.deleteContainer(folder.name);
                                await loadFolders();
                              } catch (err) {
                                showAlert("Error", "Failed to delete folder. Please try again.");
                                console.error(err);
                              }
                            }
                          );
                        }}
                        className="p-4 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete Folder"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {state === 'VIEW_DETAIL' && selectedFolder && (
              <motion.div 
                key="detail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900">{selectedFolder}</h2>
                    <p className="text-sm text-neutral-500">Karga_Container / {selectedFolder}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={downloadAsZip}
                      title="Download as ZIP"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <FileArchive size={20} />
                      <span className="text-xs font-bold">ZIP</span>
                    </button>
                    <button 
                      onClick={downloadAll}
                      title="Download All Files"
                      className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                      <Download size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        showConfirm(
                          "Delete Container",
                          "Delete this container and all its files? This cannot be undone.",
                          async () => {
                            try {
                              await StorageService.deleteContainer(selectedFolder);
                              setState('VIEW_LIST');
                            } catch (err) {
                              showAlert("Error", "Failed to delete folder.");
                            }
                          }
                        );
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-xs flex items-start gap-3">
                  <div className="p-1 bg-blue-100 rounded-full mt-0.5">
                    <Check size={12} />
                  </div>
                  <p>Files are stored in the browser's private storage. Use the <b>Download</b> button to save them to your device's public Downloads folder.</p>
                </div>

                {/* Video Section */}
                <section>
                  <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2"><VideoIcon size={14} /> Video Recording</span>
                    <div className="flex items-center gap-4">
                      {currentFiles.find(f => f.name.endsWith('.mp4')) && (
                        <>
                          <button 
                            onClick={() => {
                              const file = currentFiles.find(f => f.name.endsWith('.mp4'));
                              if (file?.blob) downloadFile(file.blob, `${selectedFolder}_video_1.mp4`);
                            }}
                            className="text-blue-600 text-[10px] font-bold uppercase tracking-tighter"
                          >
                            Download
                          </button>
                          <button 
                            onClick={() => {
                              showConfirm(
                                "Delete Video",
                                "Are you sure you want to delete this video?",
                                async () => {
                                  try {
                                    await StorageService.deleteFile(selectedFolder, 'video', 'video_1.mp4');
                                    handleFolderSelect(selectedFolder);
                                  } catch (err) {
                                    showAlert("Error", "Failed to delete video.");
                                  }
                                }
                              );
                            }}
                            className="text-red-500 text-[10px] font-bold uppercase tracking-tighter"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </h3>
                  {currentFiles.find(f => f.name.endsWith('.mp4')) ? (
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-md relative group">
                      <video 
                        src={currentFiles.find(f => f.name.endsWith('.mp4'))?.url} 
                        controls 
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-neutral-200 rounded-2xl text-center text-neutral-400">
                      No video found
                    </div>
                  )}
                </section>

                {/* Photos Section */}
                <section>
                  <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CameraIcon size={14} /> Photo Gallery ({currentFiles.filter(f => f.name.endsWith('.jpg')).length})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {currentFiles.filter(f => f.name.endsWith('.jpg')).map((file, idx) => (
                      <div key={file.name} className="aspect-square bg-neutral-200 rounded-xl overflow-hidden shadow-sm relative group">
                        <img 
                          src={file.url} 
                          alt={file.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full">
                          Photo {idx + 1}
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              if (file.blob) downloadFile(file.blob, `${selectedFolder}_${file.name}`);
                            }}
                            className="p-1.5 bg-blue-600 text-white rounded-lg"
                          >
                            <Download size={12} />
                          </button>
                          <button 
                            onClick={() => {
                              showConfirm(
                                "Delete Photo",
                                "Are you sure you want to delete this photo?",
                                async () => {
                                  try {
                                    await StorageService.deleteFile(selectedFolder, 'photo', file.name);
                                    handleFolderSelect(selectedFolder);
                                  } catch (err) {
                                    showAlert("Error", "Failed to delete photo.");
                                  }
                                }
                              );
                            }}
                            className="p-1.5 bg-red-500 text-white rounded-lg"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="fixed bottom-6 left-6 right-6 bg-red-600 text-white p-4 rounded-xl shadow-xl flex items-center justify-between z-[100]"
            >
              <div className="flex items-center gap-3">
                <XCircle size={20} />
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded">
                <Check size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Modals */}
        <AnimatePresence>
          {modal.show && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              >
                <h3 className="text-xl font-bold text-neutral-900 mb-2">{modal.title}</h3>
                <p className="text-neutral-500 mb-6">{modal.message}</p>
                <div className="flex gap-3">
                  {modal.type === 'confirm' ? (
                    <>
                      <button 
                        onClick={() => setModal(prev => ({ ...prev, show: false }))}
                        className="flex-1 py-3 bg-neutral-100 text-neutral-600 font-bold rounded-xl active:scale-95 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          modal.onConfirm?.();
                          setModal(prev => ({ ...prev, show: false }));
                        }}
                        className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-red-100"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setModal(prev => ({ ...prev, show: false }))}
                      className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-blue-100"
                    >
                      OK
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Step Components ---

function CaptureCodeStep({ onNext, onUpload, onCancel }: { onNext: (code: string) => void, onUpload: (code: string) => void, onCancel: () => void }) {
  const [code, setCode] = useState('');
  const [exists, setExists] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setChecking(true);
    const alreadyExists = await StorageService.folderExists(code.trim());
    setChecking(false);

    if (alreadyExists) {
      setExists(true);
    } else {
      onNext(code.trim());
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-6"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Enter Container Code</h2>
        <p className="text-neutral-500">This will be used as the folder name.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input 
          autoFocus
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setExists(false);
          }}
          placeholder="e.g. VIS-001"
          className="w-full p-4 text-2xl font-mono border-2 border-neutral-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all uppercase"
        />

        {exists && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex flex-col gap-3">
            <p className="font-semibold">Folder already exists!</p>
            <p>Do you want to continue and add files to the existing folder?</p>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => onNext(code)}
                className="flex-1 py-2 bg-amber-600 text-white rounded-lg font-medium"
              >
                Continue Capture
              </button>
              <button 
                type="button"
                onClick={() => onUpload(code)}
                className="flex-1 py-2 bg-white border border-amber-200 text-amber-600 rounded-lg font-medium"
              >
                Upload Files
              </button>
            </div>
          </div>
        )}

        {!exists && (
          <div className="flex flex-col gap-3">
            <button 
              type="submit"
              disabled={!code.trim() || checking}
              className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-100 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {checking ? 'Checking...' : (
                <>
                  <Camera size={20} /> Next: Camera Capture
                </>
              )}
            </button>
            <button 
              type="button"
              disabled={!code.trim() || checking}
              onClick={() => onUpload(code.trim())}
              className="w-full p-4 bg-white border border-neutral-200 text-neutral-800 rounded-2xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              <Upload size={20} className="text-blue-600" /> Next: Upload Files
            </button>
          </div>
        )}
      </form>
    </motion.div>
  );
}

function CaptureVideoStep({ 
  containerCode, 
  onNext, 
  onBack,
  onCancel
}: { 
  containerCode: string, 
  onNext: (blob: Blob) => void, 
  onBack: () => void,
  onCancel: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode }, 
        audio: true 
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startRecording = () => {
    if (!stream) return;
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      setRecordedBlob(blob);
      try {
        // Auto-save immediately on stop
        await StorageService.saveFile(containerCode, 'video', 'video_1.mp4', blob);
      } catch (err) {
        console.error("Error auto-saving video:", err);
      }
    };
    
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    
    setTimer(0);
    timerRef.current = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (recordedBlob) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Save Video?</h2>
          <button 
            onClick={onCancel}
            className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>
        <p className="text-neutral-500">Review your recording for {containerCode}.</p>
      </div>
        <div className="aspect-video bg-black rounded-2xl overflow-hidden">
          <video src={URL.createObjectURL(recordedBlob)} controls className="w-full h-full object-cover" />
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => onNext(recordedBlob)}
            className="flex-1 p-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
          >
            <Check size={20} /> Save
          </button>
          <button 
            onClick={async () => {
              try {
                await StorageService.deleteFile(containerCode, 'video', 'video_1.mp4');
                setRecordedBlob(null);
              } catch (err) {
                console.error("Error deleting video for retake:", err);
                setRecordedBlob(null);
              }
            }}
            className="flex-1 p-4 bg-white border border-neutral-200 text-neutral-800 rounded-2xl font-bold"
          >
            Retake
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Record Video</h2>
          <button 
            onClick={onCancel}
            className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>
        <p className="text-neutral-500">Capture the container exterior.</p>
      </div>
      
      <div className="relative aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        
        {isRecording && (
          <div className="absolute top-6 left-6 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 animate-pulse shadow-lg">
            <div className="w-3 h-3 bg-white rounded-full" />
            REC {formatTime(timer)}
          </div>
        )}

        {!isRecording && (
          <button 
            onClick={toggleCamera}
            className="absolute top-6 right-6 bg-black/40 backdrop-blur-xl text-white p-3 rounded-full hover:bg-black/60 transition-colors shadow-lg"
          >
            <CameraIcon size={24} />
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 py-4">
        {!isRecording ? (
          <button 
            onClick={startRecording}
            className="w-20 h-20 bg-white border-4 border-neutral-200 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          >
            <div className="w-14 h-14 bg-red-600 rounded-full" />
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="w-20 h-20 bg-white border-4 border-neutral-200 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          >
            <div className="w-8 h-8 bg-red-600 rounded-md" />
          </button>
        )}
        <p className="text-sm font-medium text-neutral-400">
          {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
        </p>
      </div>
    </motion.div>
  );
}

function CapturePhotosStep({ 
  containerCode,
  initialPhotos = [],
  initialNames = [],
  onNext, 
  onBack,
  onCancel
}: { 
  containerCode: string,
  initialPhotos?: Blob[],
  initialNames?: string[],
  onNext: (blobs: Blob[], names: string[]) => void, 
  onBack: () => void,
  onCancel: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photos, setPhotos] = useState<Blob[]>(initialPhotos);
  const [photoNames, setPhotoNames] = useState<string[]>(initialNames);
  const [flash, setFlash] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialPhotos.map(b => URL.createObjectURL(b)));
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      photoUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode } 
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current || photos.length >= 10) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            // Auto-save photo immediately
            const fileName = `photo_${Date.now()}.jpg`;
            await StorageService.saveFile(containerCode, 'photo', fileName, blob);
            
            setPhotos(prev => [...prev, blob]);
            setPhotoNames(prev => [...prev, fileName]);
            setPhotoUrls(prev => [...prev, URL.createObjectURL(blob)]);
            setFlash(true);
            setTimeout(() => setFlash(false), 100);
          } catch (err) {
            console.error("Error auto-saving photo:", err);
          }
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const removePhoto = async (index: number) => {
    const fileName = photoNames[index];
    const urlToRemove = photoUrls[index];
    
    try {
      if (fileName) {
        await StorageService.deleteFile(containerCode, 'photo', fileName);
      }
      
      if (urlToRemove) URL.revokeObjectURL(urlToRemove);
      
      setPhotos(prev => prev.filter((_, i) => i !== index));
      setPhotoNames(prev => prev.filter((_, i) => i !== index));
      setPhotoUrls(prev => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error("Error deleting photo:", err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Take Photos</h2>
          <div className="flex items-center gap-3">
            <span className={cn(
              "px-3 py-1 rounded-full text-sm font-bold transition-colors",
              photos.length === 10 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
            )}>
              {photos.length}/10
            </span>
            <button 
              onClick={onCancel}
              className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>
        <p className="text-neutral-500">Capture 10 detailed photos of the container.</p>
      </div>

      <div className="relative aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        
        {flash && <div className="absolute inset-0 bg-white z-10" />}
        
        {/* Photo Counter Overlay */}
        <div className="absolute bottom-6 right-6 bg-black/40 backdrop-blur-xl text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
          {photos.length < 10 ? `Ready for Photo ${photos.length + 1}` : '10 Photos Captured'}
        </div>

        <button 
          onClick={toggleCamera}
          className="absolute top-6 right-6 bg-black/40 backdrop-blur-xl text-white p-3 rounded-full hover:bg-black/60 transition-colors shadow-lg"
        >
          <CameraIcon size={24} />
        </button>
      </div>

      {/* Photo Grid Preview */}
      <div className="grid grid-cols-5 gap-2 px-2">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div key={idx} className="aspect-square rounded-lg border-2 border-dashed border-neutral-200 overflow-hidden relative bg-neutral-50">
            {photoUrls[idx] ? (
              <>
                <img src={photoUrls[idx]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => removePhoto(idx)}
                  className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-lg"
                >
                  <Trash2 size={10} />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-300 text-[10px] font-bold">
                {idx + 1}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        <button 
          disabled={photos.length >= 10}
          onClick={takePhoto}
          className="w-20 h-20 bg-white border-4 border-neutral-200 rounded-full flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
        >
          <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white">
            <CameraIcon size={28} />
          </div>
        </button>

        {photos.length === 10 ? (
          <button 
            onClick={() => onNext(photos, photoNames)}
            className="w-full p-4 bg-green-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-100 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={24} /> Finish Photos
          </button>
        ) : (
          <p className="text-sm font-medium text-neutral-400">
            {10 - photos.length} photos remaining
          </p>
        )}
      </div>
    </motion.div>
  );
}

function CaptureConfirmStep({ 
  data, 
  onConfirm, 
  onCancel,
  onRetakeVideo,
  onRetakePhotos
}: { 
  data: CaptureData, 
  onConfirm: () => void, 
  onCancel: () => void,
  onRetakeVideo: () => void,
  onRetakePhotos: () => void
}) {
  const [saving, setSaving] = useState(false);
  const videoUrl = data.videoBlob ? URL.createObjectURL(data.videoBlob) : null;

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm();
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold">Review Capture</h2>
        <p className="text-neutral-500">Final check for {data.code}</p>
      </div>

      <div className="space-y-4">
        {/* Video Preview */}
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-3 border-b border-neutral-100 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Video</span>
            <button onClick={onRetakeVideo} className="text-blue-600 text-xs font-bold">Retake</button>
          </div>
          <div className="aspect-video bg-black">
            {videoUrl && <video src={videoUrl} controls playsInline className="w-full h-full object-cover" />}
          </div>
        </div>

        {/* Photos Summary */}
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-3 border-b border-neutral-100 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Photos ({data.photoBlobs.length}/10)</span>
            <button onClick={onRetakePhotos} className="text-blue-600 text-xs font-bold">Retake All</button>
          </div>
          <div className="p-3 grid grid-cols-5 gap-1">
            {data.photoBlobs.map((blob, idx) => (
              <div key={idx} className="aspect-square bg-neutral-100 rounded-md overflow-hidden">
                <img src={URL.createObjectURL(blob)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <button 
          disabled={saving}
          onClick={handleConfirm}
          className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? 'Saving to Device...' : 'Confirm & Save'}
        </button>
        <button 
          disabled={saving}
          onClick={onCancel}
          className="w-full p-4 bg-white text-neutral-400 rounded-2xl font-bold"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

function UploadStep({ 
  containerCode, 
  onNext, 
  onBack, 
  onCancel 
}: { 
  containerCode: string, 
  onNext: () => void, 
  onBack: () => void, 
  onCancel: () => void 
}) {
  const [subfolder, setSubfolder] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    
    try {
      const targetSubfolder = subfolder.trim() || 'uploads';
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await StorageService.saveFile(containerCode, targetSubfolder, file.name, file);
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      onNext();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload files.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Upload Files</h2>
          <p className="text-neutral-500">Container: {containerCode}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Subfolder Name (Optional)</label>
          <input 
            type="text"
            value={subfolder}
            onChange={(e) => setSubfolder(e.target.value)}
            placeholder="e.g. documents, extra_photos"
            className="w-full p-4 border-2 border-neutral-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Select Files</label>
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-neutral-300 rounded-2xl cursor-pointer hover:bg-neutral-50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 text-neutral-400 mb-3" />
              <p className="text-sm text-neutral-500">Click to select photos or videos</p>
              <p className="text-xs text-neutral-400 mt-1">{files.length} files selected</p>
            </div>
            <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
          </label>
        </div>

        {files.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-neutral-50 rounded-xl">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-neutral-100 text-xs text-neutral-600">
                <File size={14} className="text-blue-500" />
                <span className="truncate flex-1">{f.name}</span>
                <span>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <button 
          disabled={files.length === 0 || uploading}
          onClick={handleUpload}
          className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {uploading ? `Uploading ${progress}%...` : 'Start Upload'}
        </button>
        <button 
          disabled={uploading}
          onClick={onCancel}
          className="w-full p-4 bg-white text-neutral-400 rounded-2xl font-bold"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
