// src/components/sidemenu/SourcesPanel.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BookOpen, Plus, Trash2, Loader2, AlertCircle, X, Check, UploadCloud, Search as SearchIconLucide } from 'lucide-react'; // Search als SearchIconLucide umbenannt wegen Konflikt
import {
    getDocuments,
    deleteDocument,
    uploadAndStorePdf,
    DocumentDisplayFE
} from '@/services/documentService';
import OnlineSearchModal from './OnlineSearchModal';

interface SourcesPanelProps {
}

interface NotificationState {
  type: 'success' | 'error' | null;
  message: string | null;
}

const SourcesPanel: React.FC<SourcesPanelProps> = (props) => {
  const [sources, setSources] = useState<DocumentDisplayFE[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmingDeleteFor, setConfirmingDeleteFor] = useState<string | null>(null);
  const [actionNotification, setActionNotification] = useState<NotificationState>({ type: null, message: null });
  const [showAddSourceOptions, setShowAddSourceOptions] = useState(false);
  const [showOnlineSearchModal, setShowOnlineSearchModal] = useState(false);

  // Beispiel: Breite des SideMenu (IconBar 64px + Panel 288px = 352px)
  // Dieser Wert muss der tatsächlichen Breite des geöffneten SideMenu-Panels entsprechen.
  // Idealerweise würde dieser Wert vom SideMenu selbst kommen oder dynamisch ermittelt.
  const OPENED_SIDEMENU_WIDTH_PX = 352; 


  const fetchSourcesData = useCallback(async (showInitialLoadingSpinner: boolean = true) => {
    if (showInitialLoadingSpinner) setIsLoading(true);
    setError(null);
    try {
      const fetchedSources = await getDocuments();
      setSources(fetchedSources);
    } catch (err) {
      console.error("Fehler beim Laden der Quellen im SourcesPanel:", err);
      setError(err instanceof Error ? err.message : "Ein unbekannter Fehler ist beim Laden der Quellen aufgetreten.");
    } finally {
      if (showInitialLoadingSpinner) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSourcesData();
  }, [fetchSourcesData]);

  useEffect(() => {
    if (actionNotification.message) {
      const timer = setTimeout(() => {
        setActionNotification({ type: null, message: null });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionNotification]);

  const handleDeleteRequest = (sourceId: string) => {
    setConfirmingDeleteFor(sourceId);
    setActionNotification({ type: null, message: null });
  };

  const confirmDelete = async (sourceId: string, sourceName: string) => {
    setIsDeleting(sourceId);
    setActionNotification({ type: null, message: null });
    try {
        await deleteDocument(sourceId);
        setSources(prevSources => prevSources.filter(source => source.id !== sourceId));
        setActionNotification({ type: 'success', message: `Quelle "${sourceName}" gelöscht.` });
    } catch (err) {
        console.error("Fehler beim Löschen der Quelle:", err);
        const deleteError = err instanceof Error ? err.message : "Fehler beim Löschen.";
        setActionNotification({ type: 'error', message: `Löschfehler: ${deleteError}` });
    } finally {
        setConfirmingDeleteFor(null);
        setIsDeleting(null);
    }
  };

  const cancelDelete = () => {
    setConfirmingDeleteFor(null);
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
    if (file) {
        if (file.type !== "application/pdf") {
            setActionNotification({ type: 'error', message: "Ungültiger Dateityp. Es werden nur PDF-Dateien unterstützt." });
            return;
        }
        setIsLoading(true);
        setActionNotification({ type: null, message: null });
        try {
            const result = await uploadAndStorePdf(file);
            await fetchSourcesData(false);
            setActionNotification({ type: 'success', message: `Datei "${result.original_filename}" erfolgreich hochgeladen!` });
        } catch (err) {
            console.error("Fehler beim Hochladen der PDF im SourcesPanel:", err);
            const uploadError = err instanceof Error ? err.message : "Fehler beim Hochladen der PDF.";
            setActionNotification({ type: 'error', message: `Upload-Fehler: ${uploadError}` });
        } finally {
            setIsLoading(false);
        }
    }
  };

  const handleTriggerLocalUpload = () => {
    fileInputRef.current?.click();
    setShowAddSourceOptions(false);
    setActionNotification({ type: null, message: null });
  };

  const handleTriggerOnlineSearch = () => {
    setShowOnlineSearchModal(true);
    setShowAddSourceOptions(false);
    setActionNotification({ type: null, message: null });
  };
  
  const handleImportSuccessFromModal = () => {
    fetchSourcesData(false);
    setActionNotification({ type: 'success', message: 'Ausgewählte Online-Quellen erfolgreich importiert und verarbeitet.' });
  };

  if (isLoading && sources.length === 0) {
    return (
      <div className="p-4 flex flex-col justify-center items-center text-gray-500 h-full">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600 mb-2" />
        <span>Quellen werden geladen...</span>
      </div>
    );
  }

  if (error && sources.length === 0 && !isLoading) {
    return (
      <div className="p-4 m-3 bg-red-50 border border-red-200 rounded-md text-center">
          <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-red-700">Fehler beim Laden der Quellen</p>
          <p className="mt-1 text-xs text-red-600 break-words">{error}</p>
          <button
              onClick={() => { setError(null); fetchSourcesData(true); }}
              className="mt-3 px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-md font-semibold"
          >
              Erneut versuchen
          </button>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2.5 h-full flex flex-col">
      {actionNotification.message && (
        <div className={`p-3 mb-3 rounded-md text-sm ${
            actionNotification.type === 'success' ? 'bg-green-50 border border-green-300 text-green-700'
                                                 : 'bg-red-50 border border-red-300 text-red-700'
        } flex items-center justify-between flex-shrink-0`}>
          <span>{actionNotification.message}</span>
          <button onClick={() => setActionNotification({ type: null, message: null })} className="ml-2">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex-grow overflow-y-auto space-y-2.5">
        {sources.length === 0 && !isLoading && !error && (
            <div className="text-center py-8 text-gray-500">
                <BookOpen size={36} className="mx-auto mb-3 opacity-60" />
                <p className="text-md font-medium">Noch keine Quellen vorhanden.</p>
                <p className="text-xs mt-1.5">Klicken Sie auf "Quelle hinzufügen", um zu beginnen.</p>
            </div>
        )}

        {sources.map(source => {
          const displayName = source.title || source.original_filename;
          const citationInfo = [source.author, source.publication_year?.toString()].filter(Boolean).join(', ');
          const isConfirmingThis = confirmingDeleteFor === source.id;
          const isCurrentlyDeletingThis = isDeleting === source.id;

          return (
            <div
              key={source.id}
              className={`group flex items-center p-2.5 rounded-lg bg-white border border-gray-200 shadow-sm transition-all duration-150 ease-in-out ${isConfirmingThis ? ' bg-red-50 border-red-200 ' : 'hover:bg-gray-100'}`}
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-md mr-3 flex-shrink-0 flex items-center justify-center">
                  <BookOpen size={20} className="text-indigo-500"/>
              </div>

              {isConfirmingThis ? (
                <div className="flex-grow flex flex-col sm:flex-row sm:items-center sm:justify-between min-w-0">
                  <p className="text-sm text-gray-700 font-medium mb-2 sm:mb-0 sm:mr-2">Wirklich löschen?</p>
                  <div className="flex space-x-2 flex-shrink-0">
                    <button
                      onClick={cancelDelete}
                      disabled={isCurrentlyDeletingThis}
                      className="p-1.5 rounded-full hover:bg-gray-200 text-gray-600 disabled:opacity-50"
                      title="Abbrechen"
                    >
                      <X size={18} />
                    </button>
                    <button
                      onClick={() => confirmDelete(source.id, displayName)}
                      disabled={isCurrentlyDeletingThis}
                      className="p-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:bg-red-300 flex items-center justify-center"
                      title="Bestätigen"
                    >
                      {isCurrentlyDeletingThis ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden flex-grow min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate" title={displayName}>
                      {displayName}
                    </p>
                    {citationInfo && (
                        <p className="text-xs text-gray-500 truncate mt-0.5" title={citationInfo}>
                            {citationInfo}
                        </p>
                    )}
                  </div>
                  <div className="ml-2 flex-shrink-0">
                      <button
                        onClick={() => handleDeleteRequest(source.id)}
                        disabled={isLoading || isDeleting !== null}
                        title="Quelle löschen"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={16} />
                      </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      
      <input
          type="file" ref={fileInputRef} onChange={handleFileSelected}
          accept="application/pdf" className="hidden"
      />
      <div className="relative mt-auto pt-3 flex-shrink-0">
          <button
              onClick={() => setShowAddSourceOptions(prev => !prev)}
              disabled={isLoading}
              className="w-full flex items-center justify-center py-2.5 px-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus size={18} className="mr-1.5" />
            Quelle hinzufügen
          </button>

          {showAddSourceOptions && (
              <div className="absolute bottom-full left-0 right-0 mb-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2 space-y-2">
                  <button
                      onClick={handleTriggerLocalUpload}
                      className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                      <UploadCloud size={16} className="mr-2 text-blue-500"/> Lokale Datei hochladen
                  </button>
                  <button
                      onClick={handleTriggerOnlineSearch}
                      className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                      <SearchIconLucide size={16} className="mr-2 text-green-500"/> Online suchen (arXiv)
                  </button>
              </div>
          )}
      </div>

      <OnlineSearchModal
        isOpen={showOnlineSearchModal}
        onClose={() => setShowOnlineSearchModal(false)}
        onImportSuccess={handleImportSuccessFromModal}
        sideMenuWidth={OPENED_SIDEMENU_WIDTH_PX}
      />
    </div>
  );
};

export default SourcesPanel;