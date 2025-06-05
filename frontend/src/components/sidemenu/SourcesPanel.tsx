'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BookOpen, Plus, Trash2, Loader2, AlertCircle, X, Check } from 'lucide-react';
import {
    getDocuments,
    deleteDocument,
    uploadAndStorePdf,
    DocumentDisplayFE
} from '@/services/documentService';

interface SourcesPanelProps {
}

interface NotificationState {
  type: 'success' | 'error' | null;
  message: string | null;
}

const SourcesPanel: React.FC<SourcesPanelProps> = (props) => {
  const [sources, setSources] = useState<DocumentDisplayFE[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // ID der Quelle, die gerade gelöscht wird
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmingDeleteFor, setConfirmingDeleteFor] = useState<string | null>(null); // ID der Quelle für Inline-Bestätigung
  const [actionNotification, setActionNotification] = useState<NotificationState>({ type: null, message: null });

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

  const handleAddSourceClick = () => {
    fileInputRef.current?.click();
    setActionNotification({ type: null, message: null });
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
    <div className="p-3 space-y-2.5">

      {actionNotification.message && (
        <div className={`p-3 mb-3 rounded-md text-sm ${
            actionNotification.type === 'success' ? 'bg-green-50 border border-green-300 text-green-700'
                                                 : 'bg-red-50 border border-red-300 text-red-700'
        } flex items-center justify-between`}>
          <span>{actionNotification.message}</span>
          <button onClick={() => setActionNotification({ type: null, message: null })} className="ml-2">
            <X size={18} />
          </button>
        </div>
      )}

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
            className={`group flex items-center p-2.5 rounded-lg bg-white border border-gray-200 shadow-sm transition-all duration-150 ease-in-out ${isConfirmingThis ? ' bg-red-50 ' : 'hover:bg-gray-100'}`}
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

      <input
          type="file" ref={fileInputRef} onChange={handleFileSelected}
          accept="application/pdf" className="hidden"
      />
      {!(isLoading && sources.length === 0) && !(error && sources.length === 0 && !isLoading) && (
        <button
            onClick={handleAddSourceClick}
            disabled={isLoading}
            className="w-full mt-3 flex items-center justify-center py-2.5 px-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading && actionNotification.type !== 'success' && actionNotification.type !== 'error' ? (
            <Loader2 size={18} className="mr-2 animate-spin" />
          ) : (
            <Plus size={18} className="mr-1.5" />
          )}
          Quelle hinzufügen
        </button>
      )}
    </div>
  );
};

export default SourcesPanel;