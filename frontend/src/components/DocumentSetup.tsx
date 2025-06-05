// src/components/DocumentSetup.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateSimpleText } from "../services/llmService";
import {
  Loader2,
  Wand2,
  Plus,
  Trash2,
  GripVertical,
  ListTree,
} from "lucide-react";

import {
  OutlineItem,
  NumberedOutlineItem,
  parseGeneratedOutlineText,
  addOutlineItemRecursively,
  updateOutlineItemTitleRecursively,
  deleteOutlineItemRecursively,
  generateNumberedDisplayOutline,
} from "../utils/outlineUtils";

const DocumentSetup: React.FC = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [outlineTitle, setOutlineTitle] = useState("");

  const [documentConfig, setDocumentConfig] = useState({
    pageCount: 10,
    citationStyle: "APA",
    documentType: "Bachelorarbeit",
    language: "Deutsch",
  });

  // Load existing config from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedConfig = localStorage.getItem("documentConfig");
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          if (config.outlineTitle) setOutlineTitle(config.outlineTitle);
          if (config.outline && Array.isArray(config.outline))
            setOutline(config.outline);
          if (config.pageCount)
            setDocumentConfig((prev) => ({
              ...prev,
              pageCount: config.pageCount,
            }));
          if (config.citationStyle)
            setDocumentConfig((prev) => ({
              ...prev,
              citationStyle: config.citationStyle,
            }));
          if (config.documentType)
            setDocumentConfig((prev) => ({
              ...prev,
              documentType: config.documentType,
            }));
          if (config.language)
            setDocumentConfig((prev) => ({
              ...prev,
              language: config.language,
            }));
        } catch (e) {
          console.error(
            "Fehler beim Laden der Konfiguration aus localStorage:",
            e
          );
        }
      }
    }
  }, []);

  const displayOutline = useMemo(() => {
    return generateNumberedDisplayOutline(outline);
  }, [outline]);

  const handleGenerateKiOutline = async () => {
    if (!outlineTitle.trim()) {
      alert("Bitte geben Sie ein Thema für Ihre Arbeit ein.");
      return;
    }
    setIsGenerating(true);
    try {
      const prompt = `Erstelle eine strukturierte Gliederung für eine ${documentConfig.documentType} zum Thema "${outlineTitle}" auf ${documentConfig.language}.
      Die Arbeit soll etwa ${documentConfig.pageCount} Seiten umfassen.
      Formatiere die Gliederung exakt wie folgt, ohne zusätzliche Erklärungen oder Formatierungen (kein Markdown, keine fettgedruckten Titel):
      1. Hauptkapitel Titel
      1.1 Unterkapitel Titel
      1.2 Unterkapitel Titel
      2. Weiteres Hauptkapitel
      2.1 Dessen Unterkapitel
      2.1.1 Unter-Unterkapitel (falls sinnvoll)
      Gib NUR die Gliederung aus. Beginne direkt mit dem ersten Punkt. Achte auf korrekte Nummerierung und Einrückung nur durch die Nummerierung selbst.`;

      const responseText = await generateSimpleText(prompt);
      console.log("Raw LLM Outline Response:", responseText);
      const parsed = parseGeneratedOutlineText(responseText);
      setOutline(parsed);
    } catch (error) {
      console.error("Fehler beim Generieren der Gliederung:", error);
      alert(
        "Fehler beim Generieren der Gliederung. Bitte versuchen Sie es erneut."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddOutlineItem = (parentId?: string) => {
    setOutline((prevOutline) =>
      addOutlineItemRecursively(prevOutline, parentId)
    );
  };

  const handleUpdateOutlineItem = (id: string, newTitle: string) => {
    setOutline((prevOutline) =>
      updateOutlineItemTitleRecursively(prevOutline, id, newTitle)
    );
  };

  const handleDeleteOutlineItem = (id: string) => {
    setOutline((prevOutline) => deleteOutlineItemRecursively(prevOutline, id));
  };

  const renderOutlineForSetupUI = (
    itemsToRender: NumberedOutlineItem[],
    depth = 0
  ): JSX.Element[] => {
    return itemsToRender.map((item) => (
      <div
        key={item.id}
        className="space-y-1"
        style={{ marginLeft: `${depth * 15}px` }}
      >
        <div className="flex items-center group py-0.5">
          <span className="mr-2 text-sm text-gray-500 w-10 text-right shrink-0">
            {item.numberedTitle.split(" ")[0]}
          </span>
          <GripVertical className="w-4 h-4 text-gray-400 mr-1 cursor-move flex-shrink-0 opacity-50 group-hover:opacity-100" />
          <input
            type="text"
            value={item.title}
            onChange={(e) => handleUpdateOutlineItem(item.id, e.target.value)}
            placeholder="Titel des Kapitels"
            className="flex-1 px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 text-sm focus:border-blue-500 bg-white"
          />
          {item.level < 3 && ( // Erlaube Hinzufügen bis Level 3 (ergibt Level 4 Kinder)
            <button
              onClick={() => handleAddOutlineItem(item.id)}
              className="ml-1 p-1 text-blue-500 hover:bg-blue-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Unterkapitel hinzufügen"
            >
              {" "}
              <Plus size={14} />{" "}
            </button>
          )}
          <button
            onClick={() => handleDeleteOutlineItem(item.id)}
            className="ml-1 p-1 text-red-500 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Löschen"
          >
            {" "}
            <Trash2 size={14} />{" "}
          </button>
        </div>
        {item.children && item.children.length > 0 && (
          <div className="pt-1">
            {renderOutlineForSetupUI(
              item.children as NumberedOutlineItem[],
              depth + 1
            )}
          </div>
        )}
      </div>
    ));
  };

  const steps = [
    {
      title: "Umfang festlegen",
      description: "Wählen Sie die gewünschte Länge Ihrer Arbeit in Seiten.",
      component: (
        <div className="flex items-center space-x-4">
          {" "}
          <span className="w-24 text-gray-600 text-sm">Seitenzahl:</span>{" "}
          <input
            type="range"
            min="5"
            max="150"
            value={documentConfig.pageCount}
            onChange={(e) =>
              setDocumentConfig({
                ...documentConfig,
                pageCount: parseInt(e.target.value),
              })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />{" "}
          <span className="w-16 text-center font-semibold text-sm">
            {" "}
            {documentConfig.pageCount} Seiten{" "}
          </span>{" "}
        </div>
      ),
    },
    {
      title: "Zitierweise auswählen",
      description:
        "Bestimmen Sie den Zitierstil (APA, Harvard, MLA, Chicago,Hochschule Esslingen etc.)",
      component: (
        <div className="flex flex-col space-y-2">
          {" "}
          <select
            value={documentConfig.citationStyle}
            onChange={(e) =>
              setDocumentConfig({
                ...documentConfig,
                citationStyle: e.target.value,
              })
            }
            className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          >
            {" "}
            <option value="APA">APA</option>{" "}
            <option value="Harvard">Harvard</option>{" "}
            <option value="MLA">MLA</option>{" "}
            <option value="Chicago">Chicago</option>{" "}
            <option value="IEEE">IEEE</option>{" "}
            <option value="Hochschule Esslingen">Hochschule Esslingen</option>{" "}
          </select>{" "}
        </div>
      ),
    },
    {
      title: "Dokumenttyp definieren",
      description:
        "Legen Sie fest, welche Art von wissenschaftlicher Arbeit erstellt werden soll.",
      component: (
        <div className="grid grid-cols-2 gap-3">
          {" "}
          {[
            "Bachelorarbeit",
            "Masterarbeit",
            "Dissertation",
            "Hausarbeit",
            "Seminararbeit",
            "Forschungsartikel",
          ].map((type) => (
            <label
              key={type}
              className={`flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all ${
                documentConfig.documentType === type
                  ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                  : "border-gray-300 bg-white"
              }`}
            >
              {" "}
              <input
                type="radio"
                name="documentType"
                value={type}
                checked={documentConfig.documentType === type}
                onChange={() =>
                  setDocumentConfig({ ...documentConfig, documentType: type })
                }
                className="mr-3 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />{" "}
              <span className="font-medium text-sm">{type}</span>{" "}
            </label>
          ))}{" "}
        </div>
      ),
    },
    {
      title: "Sprache bestimmen",
      description: "Wählen Sie die Sprache für Ihr Dokument aus.",
      component: (
        <div className="flex items-center space-x-4">
          {" "}
          <span className="w-20 text-gray-600 text-sm">Sprache:</span>{" "}
          <select
            value={documentConfig.language}
            onChange={(e) =>
              setDocumentConfig({ ...documentConfig, language: e.target.value })
            }
            className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 flex-1 text-sm bg-white"
          >
            {" "}
            <option value="Deutsch">Deutsch</option>{" "}
            <option value="English">English (US)</option>{" "}
            <option value="EnglishUK">English (UK)</option>{" "}
          </select>{" "}
        </div>
      ),
    },
    {
      title: "Gliederung erstellen",
      description:
        "Erstellen Sie eine Gliederung für Ihre Arbeit - manuell oder mit KI-Unterstützung.",
      component: (
        <div className="space-y-4">
          {" "}
          <div className="space-y-1">
            {" "}
            <label className="text-sm font-medium text-gray-700">
              {" "}
              Thema Ihrer Arbeit (für KI-Gliederung):{" "}
            </label>{" "}
            <div className="flex space-x-2">
              {" "}
              <input
                type="text"
                value={outlineTitle}
                onChange={(e) => setOutlineTitle(e.target.value)}
                placeholder="z.B. Künstliche Intelligenz in der Medizin"
                className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              />{" "}
              <button
                onClick={handleGenerateKiOutline}
                disabled={isGenerating || !outlineTitle.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm font-medium shadow-sm transition-colors"
              >
                {" "}
                {isGenerating ? (
                  <>
                    {" "}
                    <Loader2 className="w-4 h-4 animate-spin" />{" "}
                    <span>Generiere...</span>{" "}
                  </>
                ) : (
                  <>
                    {" "}
                    <Wand2 size={16} /> <span>KI-Vorschlag</span>{" "}
                  </>
                )}{" "}
              </button>{" "}
            </div>{" "}
          </div>{" "}
          <div className="border rounded-lg p-4 min-h-[250px] max-h-[400px] overflow-y-auto bg-gray-50/50 space-y-2">
            {" "}
            {displayOutline.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                {" "}
                <ListTree
                  size={32}
                  className="mx-auto mb-2 text-gray-400"
                />{" "}
                <p className="font-medium">Gliederung ist leer.</p>{" "}
                <p className="text-xs mt-1">
                  {" "}
                  Geben Sie ein Thema ein und generieren Sie einen Vorschlag
                  oder fügen Sie manuell Kapitel hinzu.{" "}
                </p>{" "}
              </div>
            ) : (
              renderOutlineForSetupUI(displayOutline)
            )}{" "}
          </div>{" "}
          <button
            onClick={() => handleAddOutlineItem()}
            className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center space-x-2 text-sm font-medium transition-colors"
          >
            {" "}
            <Plus size={16} /> <span>Hauptkapitel hinzufügen</span>{" "}
          </button>{" "}
        </div>
      ),
    },
  ];

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      const fullConfig = {
        ...documentConfig,
        outline: outline,
        outlineTitle: outlineTitle,
      };
      localStorage.setItem("documentConfig", JSON.stringify(fullConfig));
      console.log(
        "Saving to localStorage (pure titles):",
        JSON.stringify(fullConfig, null, 2)
      );
      router.push("/chat");
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-slate-800">
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 mr-2 text-blue-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {" "}
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>{" "}
                    <path d="M2 17l10 5 10-5"></path>{" "}
                    <path d="M2 12l10 5 10-5"></path>{" "}
                  </svg>
                  PaperPilot
                </span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 bg-slate-50 p-6 border-r border-slate-200">
                <h2 className="text-xl font-semibold mb-6 text-slate-700">
                  {" "}
                  Dokument einrichten{" "}
                </h2>
                <div className="space-y-1.5">
                  {steps.map((step, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`w-full p-3 rounded-lg flex items-center text-left transition-all duration-150 ease-in-out group ${
                        currentStep === index
                          ? "bg-blue-500 text-white shadow-md"
                          : "hover:bg-slate-200/70 text-slate-600"
                      } ${
                        currentStep > index ? "bg-slate-100 text-slate-500" : ""
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs font-semibold flex-shrink-0 border-2 ${
                          currentStep === index
                            ? "bg-white text-blue-600 border-blue-300"
                            : currentStep > index
                            ? "bg-green-500 text-white border-green-300"
                            : "bg-white text-slate-500 border-slate-300 group-hover:border-slate-400"
                        }`}
                      >
                        {" "}
                        {currentStep > index ? "✓" : index + 1}{" "}
                      </div>
                      <div>
                        {" "}
                        <p
                          className={`font-medium text-sm ${
                            currentStep === index
                              ? "text-white"
                              : "text-slate-700 group-hover:text-slate-800"
                          }`}
                        >
                          {" "}
                          {step.title}{" "}
                        </p>{" "}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:w-2/3 p-8">
                <div className="mb-2">
                  {" "}
                  <span className="text-xs text-slate-500 font-medium">
                    SCHRITT {currentStep + 1} VON {steps.length}
                  </span>{" "}
                </div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {" "}
                  {steps[currentStep].title}{" "}
                </h3>
                <p className="text-slate-500 mt-1.5 mb-6 text-sm">
                  {" "}
                  {steps[currentStep].description}{" "}
                </p>
                <div className="py-4 min-h-[300px]">
                  {" "}
                  {steps[currentStep].component}{" "}
                </div>
                <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center">
                  <button
                    onClick={handlePrevStep}
                    className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {" "}
                    {currentStep === 0 ? "Abbrechen" : "Zurück"}{" "}
                  </button>
                  <div className="flex space-x-1.5">
                    {" "}
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          currentStep === index
                            ? "bg-blue-500 scale-125"
                            : currentStep > index
                            ? "bg-green-500"
                            : "bg-slate-300"
                        }`}
                      />
                    ))}{" "}
                  </div>
                  <button
                    onClick={handleNextStep}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {" "}
                    {currentStep === steps.length - 1
                      ? "Konfiguration speichern & starten"
                      : "Weiter"}{" "}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-8">
            {" "}
            © {new Date().getFullYear()} PaperPilot. Alle Einstellungen werden
            lokal in Ihrem Browser gespeichert.{" "}
          </p>
        </div>
      </main>
    </div>
  );
};

export default DocumentSetup;
