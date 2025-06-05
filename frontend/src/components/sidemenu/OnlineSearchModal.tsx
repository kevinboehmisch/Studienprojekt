// src/components/sidemenu/OnlineSearchModal.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, X, Loader2, CheckSquare, Square, FileText, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import {
    searchArxivOnline,
    batchImportPdfsFromUrls,
    ArxivPaperResultFE,
    ImportFromUrlPayloadFE,
    BatchImportResultItemFE
} from '@/services/documentService';

interface OnlineSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  sideMenuWidth: number; 
}

const OnlineSearchModal: React.FC<OnlineSearchModalProps> = ({ isOpen, onClose, onImportSuccess, sideMenuWidth }) => {
  const [userPrompt, setUserPrompt] = useState('');
  const [searchResults, setSearchResults] = useState<ArxivPaperResultFE[]>([]);
  const [selectedPapers, setSelectedPapers] = useState<Set<string>>(new Set());
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isLoadingImport, setIsLoadingImport] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<BatchImportResultItemFE[] | null>(null);
  const [showImportNotification, setShowImportNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleSearch = async () => {
    if (!userPrompt.trim()) {
      setSearchError("Bitte Suchbegriff eingeben.");
      return;
    }
    setIsLoadingSearch(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedPapers(new Set());
    setImportStatus(null);
    setShowImportNotification(null);
    try {
      const response = await searchArxivOnline(userPrompt);
      setSearchResults(response.results || []);
      if (!response.results || response.results.length === 0) {
        setSearchError(response.message || "Keine Ergebnisse.");
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Fehler bei Suche.");
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const togglePaperSelection = (arxivId: string) => {
    setSelectedPapers(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(arxivId)) {
        newSelection.delete(arxivId);
      } else {
        newSelection.add(arxivId);
      }
      return newSelection;
    });
  };

  useEffect(() => {
    if (showImportNotification) {
      const timer = setTimeout(() => {
        setShowImportNotification(null);
        if (showImportNotification.type === 'success' && importStatus?.every(item => item.status === 'success')) {
            onClose();
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showImportNotification, importStatus, onClose]);

  const handleImportSelected = async () => {
    if (selectedPapers.size === 0) {
      setShowImportNotification({type: 'error', message: "Wählen Sie mind. ein Paper."});
      return;
    }
    setIsLoadingImport(true);
    setImportStatus(null);
    setShowImportNotification(null);

    const papersToImport: ImportFromUrlPayloadFE[] = searchResults
      .filter(paper => selectedPapers.has(paper.arxiv_id))
      .map(paper => ({
        pdf_url: paper.pdf_url,
        original_filename: `${paper.arxiv_id}_${paper.title.replace(/[^a-zA-Z0-9_]/g, '-').substring(0, 50)}.pdf`,
        title: paper.title,
        authors: paper.authors,
        publication_year: paper.published_date ? parseInt(paper.published_date.substring(0, 4)) : undefined,
        arxiv_id: paper.arxiv_id,
      }));

    try {
      const response = await batchImportPdfsFromUrls(papersToImport);
      setImportStatus(response.results);
      const successfulImports = response.results.filter(r => r.status === 'success').length;
      const totalAttempted = papersToImport.length;

      if (successfulImports > 0) {
        onImportSuccess();
      }
      if (successfulImports === totalAttempted) {
        setShowImportNotification({type: 'success', message: `${successfulImports} Paper erfolgreich importiert!`});
      } else if (successfulImports > 0) {
        setShowImportNotification({type: 'success', message: `${successfulImports} von ${totalAttempted} Papern importiert. Einige fehlgeschlagen.`});
      } else {
         setShowImportNotification({type: 'error', message: `Import aller ${totalAttempted} Paper fehlgeschlagen.`});
      }

    } catch (error) {
      setShowImportNotification({type: 'error', message: error instanceof Error ? error.message : "Fehler beim Batch-Import."});
    } finally {
      setIsLoadingImport(false);
    }
  };

  return (
    <div
        className={`fixed top-0 bottom-0 right-0 h-full bg-white shadow-2xl 
                   flex flex-col z-[1000] transition-transform duration-300 ease-in-out
                   ${isOpen ? 'translate-x-0' : 'translate-x-full'} 
                   w-full max-w-lg sm:max-w-xl md:max-w-2xl`}
    >
      <div
        className="h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-700">Online-Suche (arXiv)</h3>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Suchbereich - HIER SIND DIE ÄNDERUNGEN */}
        <div className="p-3 space-y-2 border-b border-gray-200 flex-shrink-0"> {/* Padding p-3, space-y-2 */}
          <div className="flex space-x-2 items-center">
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="arXiv durchsuchen..."
              className="flex-grow px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm" // py-1.5 für weniger Höhe, rounded-md
              disabled={isLoadingSearch || isLoadingImport}
              onKeyPress={(e) => e.key === 'Enter' && !isLoadingSearch && userPrompt.trim() && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={isLoadingSearch || isLoadingImport || !userPrompt.trim()}
              className="p-2 bg-gray-800 text-white rounded-full hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1" // p-2 für kleineren runden Button, bg-gray-800, hover:bg-black, rounded-full
              title="Suchen"
            >
              {isLoadingSearch ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} {/* Icon-Größe 16 */}
            </button>
          </div>
          {searchError && <p className="text-xs text-red-500 mt-1.5">{searchError}</p>} {/* Kleinerer Margin oben */}
        </div>

        {/* Ergebnisbereich */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-gray-50">
          {isLoadingSearch && <div className="text-center py-6"><Loader2 className="animate-spin h-7 w-7 text-blue-500 mx-auto" /></div>}
          {!isLoadingSearch && searchResults.length === 0 && !searchError && (
            <div className="text-center py-10 text-gray-400">
                <Search size={36} className="mx-auto mb-2 opacity-50"/>
                <p className="text-sm">Bitte Suchbegriffe eingeben.</p>
            </div>
          )}
          
          {searchResults.map(paper => (
            <div
              key={paper.arxiv_id}
              onClick={() => togglePaperSelection(paper.arxiv_id)}
              className={`p-3 border rounded-lg flex items-start space-x-3 cursor-pointer transition-all 
                          ${selectedPapers.has(paper.arxiv_id)
                              ? 'bg-blue-100 border-blue-400 shadow-md'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}
            >
              <div className="mt-0.5 pt-px flex-shrink-0">
                {selectedPapers.has(paper.arxiv_id) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-gray-300" />}
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="font-medium text-gray-800 text-sm leading-tight">{paper.title}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {paper.authors.slice(0, 2).join(', ')}{paper.authors.length > 2 ? ' et al.' : ''} - {paper.published_date.substring(0,4)}
                </p>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed line-clamp-2" title={paper.full_abstract}>
                  {paper.abstract_summary_llm || paper.full_abstract}
                </p>
                <div className="mt-1.5">
                  <a
                      href={paper.arxiv_page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center"
                  >
                    Auf arXiv <ExternalLink size={12} className="ml-1" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Import-Benachrichtigung */}
        {showImportNotification && (
          <div className={`mx-4 my-3 p-3 rounded-md text-sm shadow-lg flex items-center justify-between text-white ${
              showImportNotification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } flex-shrink-0`}>
            <div className="flex items-center">
              {showImportNotification.type === 'success' ? <CheckCircle size={18} className="mr-2"/> : <AlertTriangle size={18} className="mr-2"/>}
              <span>{showImportNotification.message}</span>
            </div>
            <button onClick={() => setShowImportNotification(null)} className="ml-2 opacity-70 hover:opacity-100">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Footer mit Import-Button */}
        {searchResults.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-100 flex-shrink-0 flex justify-end">
            <button
              onClick={handleImportSelected}
              disabled={isLoadingImport || isLoadingSearch || selectedPapers.size === 0}
              className="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-60 flex items-center shadow-sm"
            >
              {isLoadingImport ? <Loader2 size={18} className="animate-spin mr-2" /> : <FileText size={16} className="mr-2" />}
              {selectedPapers.size > 0 ? `${selectedPapers.size} Paper importieren` : "Auswahl importieren"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineSearchModal;