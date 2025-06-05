"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  type: string;
  pageCount: number;
  citationStyle: string;
  language: string;
  createdAt: number;
}

export default function LandingPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("projects");
    if (stored) {
      setProjects(JSON.parse(stored));
    }
  }, []);

  const handleOpen = (project: Project) => {
    localStorage.setItem("documentConfig", JSON.stringify(project));
    router.push(`/chat?projectId=${project.id}`);
  };

  const handleDelete = (id: string) => {
    const filtered = projects.filter((p) => p.id !== id);
    setProjects(filtered);
    localStorage.setItem("projects", JSON.stringify(filtered));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-semibold text-black">
              PaperPilot
            </Link>
            <Link
              href="/setup"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Neues Projekt
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">
          Meine Projekte
        </h1>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleOpen(project)}
                className="relative bg-white border rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50 transition-all"
              >
                {/* Mülleimer-Icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Öffnen verhindern
                    handleDelete(project.id);
                  }}
                  title="Projekt löschen"
                 className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition cursor-pointer"

                >
                  <Trash2 size={18} />
                </button>

                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  {project.name}
                </h3>
                <p className="text-sm text-gray-600">
                  • {project.pageCount} Seiten
                  <br />
                  {project.citationStyle} • {project.language}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center mt-12">
            Noch keine Projekte angelegt. Klicke oben auf{" "}
            <strong>„Neues Projekt“</strong>, um zu starten.
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4 text-center text-sm text-gray-500">
        © 2025 PaperPilot
      </footer>
    </div>
  );
}
