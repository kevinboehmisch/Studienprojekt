"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LandingPage() {
  const router = useRouter();

  const handleLoslegenClick = () => {
    router.push("/setup");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="text-xl font-semibold">
                <span className="flex items-center">
                  <svg
                    xmlns=""
                    className="h-6 w-6 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="black"
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
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="#"
                className="text-gray-600 hover:text-gray-900"
              ></Link>
              <Link href="#" className="text-gray-600 hover:text-gray-900">
                Über uns
              </Link>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
                Anmelden
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-24 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Der wissenschaftliche Schreibprozess,
                <br />
                neu definiert durch KI-Unterstützung.
              </h1>
              <p className="mt-6 text-lg text-gray-900">
                Revolutionieren Sie Ihre wissenschaftliche Arbeit mit
                intelligenter Unterstützung beim Schreiben, Recherchieren und
                Formatieren.
              </p>
              <div className="mt-8">
                <button
                  onClick={handleLoslegenClick}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-md text-lg font-medium"
                >
                  Loslegen
                </button>
              </div>

              <div className="mt-12 grid gap-6 md:grid-cols-2">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="font-bold text-gray-800 text-lg">
                    Perfekte Struktur
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Automatische Gliederung nach akademischen Standards mit
                    logischem Aufbau
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="font-bold text-gray-800 text-lg">
                    Smarte Quellenarbeit
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Effiziente Literaturverwaltung und korrekte Zitationen ohne
                    manuellen Aufwand
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="font-bold text-gray-800 text-lg">
                    Zeitersparnis
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Beschleunigen Sie Ihren Schreibprozess durch intelligente
                    Textvorschläge
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="font-bold text-gray-800 text-lg">
                    Makellose Formatierung
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Konsistente Formatierung nach wissenschaftlichen Standards
                    auf Knopfdruck
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-12 lg:mt-0">
              <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                {/* Platzhalter für ein Screenshot oder Illustration */}
                <div className="bg-gray-200 h-80 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-24 w-24 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
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
