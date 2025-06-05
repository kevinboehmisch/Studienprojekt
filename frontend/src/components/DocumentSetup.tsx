"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DocumentSetup() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const [documentConfig, setDocumentConfig] = useState({
    title: "", // 🆕 Projektname-Feld hinzufügen
    pageCount: 10,
    citationStyle: "APA",
    documentType: "Bachelor",
    language: "Deutsch",
  });

  const steps = [
    {
      title: "Projekttitel vergeben",
      description: "Geben Sie Ihrem Projekt einen Namen",
      component: (
        <div className="flex flex-col space-y-2">
          <input
            type="text"
            placeholder="z. B. Bachelorarbeit KI"
            value={documentConfig.title}
            onChange={(e) =>
              setDocumentConfig({ ...documentConfig, title: e.target.value })
            }
            className="p-2 border rounded w-full"
          />
        </div>
      ),
    },
    {
      title: "Umfang festlegen",
      description:
        "Wählen Sie die gewünschte Länge Ihrer Arbeit in Seiten oder Wörtern",
      component: (
        <div className="flex items-center space-x-4">
          <span className="w-24 text-gray-600">Seitenzahl:</span>
          <input
            type="range"
            min="1"
            max="10"
            value={documentConfig.pageCount}
            onChange={(e) =>
              setDocumentConfig({
                ...documentConfig,
                pageCount: parseInt(e.target.value),
              })
            }
            className="w-full"
          />
          <span className="w-8 text-center">{documentConfig.pageCount}</span>
        </div>
      ),
    },
    {
      title: "Zitierweise auswählen",
      description:
        "Bestimmen Sie den Zitierstil (APA, Harvard, MLA, Chicago etc.)",
      component: (
        <div className="flex flex-col space-y-2">
          <select
            value={documentConfig.citationStyle}
            onChange={(e) =>
              setDocumentConfig({
                ...documentConfig,
                citationStyle: e.target.value,
              })
            }
            className="p-2 border rounded"
          >
            <option value="APA">APA</option>
            <option value="Harvard">Harvard</option>
            <option value="MLA">MLA</option>
            <option value="Chicago">Chicago</option>
            <option value="Hochschule Esslingen">Hochschule Esslingen</option>
          </select>
        </div>
      ),
    },
    {
      title: "Dokumenttyp definieren",
      description:
        "Legen Sie fest, welche Art von wissenschaftlicher Arbeit erstellt werden soll",
      component: (
        <div className="flex space-x-4">
          {["Bachelor", "Master", "Benutzerdefiniert"].map((type) => (
            <label key={type} className="flex items-center">
              <input
                type="radio"
                name="documentType"
                checked={documentConfig.documentType === type}
                onChange={() =>
                  setDocumentConfig({ ...documentConfig, documentType: type })
                }
                className="mr-2"
              />
              {type}
            </label>
          ))}
        </div>
      ),
    },
    {
      title: "Sprache bestimmen",
      description: "Wählen Sie die Sprache für Ihr Dokument aus",
      component: (
        <div className="flex items-center space-x-4">
          <span className="w-24">Sprache:</span>
          <select
            value={documentConfig.language}
            onChange={(e) =>
              setDocumentConfig({ ...documentConfig, language: e.target.value })
            }
            className="p-2 border rounded"
          >
            <option value="Deutsch">Deutsch</option>
            <option value="English">English</option>
          </select>
        </div>
      ),
    },
  ];

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      const documentConfigWithMeta = {
        ...documentConfig,
        createdAt: new Date().toLocaleDateString(),
        title:
          documentConfig.title.trim() ||
          `Projekt vom ${new Date().toLocaleDateString()}`,
      };

      const existing = JSON.parse(localStorage.getItem("projects") || "[]");
      localStorage.setItem(
        "projects",
        JSON.stringify([...existing, documentConfigWithMeta])
      );
      localStorage.setItem(
        "documentConfig",
        JSON.stringify(documentConfigWithMeta)
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-semibold">
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  PaperPilot
                </span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="flex">
              {/* Sidebar mit Schritten */}
              <div className="w-1/3 bg-gray-50 p-6">
                <h2 className="text-xl font-semibold mb-6">
                  Dokument Konfigurieren
                </h2>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg cursor-pointer flex items-center ${
                        currentStep === index
                          ? "bg-blue-50 border-l-4 border-blue-500"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => setCurrentStep(index)}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                          currentStep === index
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{step.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hauptinhalt */}
              <div className="w-2/3 p-8">
                <h3 className="text-lg font-semibold">
                  {steps[currentStep].title}
                </h3>
                <p className="text-gray-600 mt-2 mb-6">
                  {steps[currentStep].description}
                </p>

                <div className="py-4">{steps[currentStep].component}</div>

                <div className="mt-8 flex justify-between">
                  <button
                    onClick={handlePrevStep}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    {currentStep === 0 ? "Zurück" : "Zurück"}
                  </button>

                  <div className="flex space-x-2">
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          currentStep === index ? "bg-blue-500" : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleNextStep}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    {currentStep === steps.length - 1 ? "Starten" : "Weiter"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between">
            <div className="text-gray-500 text-sm">
              © 2025 PaperPilot. Alle Rechte vorbehalten.
            </div>
            <div className="flex space-x-6">
              <Link
                href="#"
                className="text-gray-500 hover:text-gray-900 text-sm"
              >
                Datenschutz
              </Link>
              <Link
                href="#"
                className="text-gray-500 hover:text-gray-900 text-sm"
              >
                AGB
              </Link>
              <Link
                href="#"
                className="text-gray-500 hover:text-gray-900 text-sm"
              >
                Impressum
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
