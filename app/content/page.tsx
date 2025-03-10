"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAllMdxFiles, GitHubContent } from "@/lib/github";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

// Funktion zum Formatieren des Datums
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export default function ContentPage() {
  const router = useRouter();
  const [contents, setContents] = useState<GitHubContent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Abrufen der Inhalte aus dem GitHub-Repository
        let fetchedContents = await fetchAllMdxFiles();
        console.log("Fetched contents:", fetchedContents);

        // Sortieren nach Datum absteigend
        fetchedContents.sort((a, b) => {
          if (a.date && b.date) {
            return (
              new Date(b.date.split(".").reverse().join("-")).getTime() -
              new Date(a.date?.split(".").reverse().join("-") || "").getTime()
            );
          }
          return 0;
        });
        console.log("Sorted contents:", fetchedContents);

        setContents(fetchedContents);
      } catch (e) {
        const errorMessage =
          e instanceof Error
            ? e.message
            : "Ein unbekannter Fehler ist aufgetreten";
        setError(errorMessage);
        console.error("Fehler beim Abrufen der GitHub-Inhalte:", errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Leeres Abhängigkeitsarray, um sicherzustellen, dass die Daten nur einmal abgerufen werden

  const handleEditClick = (path: string) => {
    router.push(`/editor?path=${encodeURIComponent(path)}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold text-gray-900">MDX Inhalte</h1>
          <p className="mt-2 text-sm text-gray-700">
            Eine Liste aller MDX-Dateien in Ihrem Repository, einschließlich
            Titel und Datum.
          </p>
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b bg-white/75 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter sm:pl-6 lg:pl-8"
                  >
                    Titel
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b bg-white/75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Datum
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b bg-white/75 py-3.5 pl-3 pr-4 backdrop-blur backdrop-filter sm:pr-6 lg:pr-8"
                  >
                    <span className="sr-only">Bearbeiten</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {contents.map((item, itemIdx) => (
                  <tr key={item.path}>
                    <td
                      className={classNames(
                        itemIdx !== contents.length - 1 ? "border-b" : "",
                        "whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 lg:pl-8"
                      )}
                    >
                      {item.title || item.name}
                    </td>
                    <td
                      className={classNames(
                        itemIdx !== contents.length - 1 ? "border-b" : "",
                        "whitespace-nowrap px-3 py-4 text-sm text-gray-500"
                      )}
                    >
                      {item.date ? formatDate(item.date) : ""}
                    </td>
                    <td
                      className={classNames(
                        itemIdx !== contents.length - 1 ? "border-b" : "",
                        "relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 lg:pr-8"
                      )}
                    >
                      <button
                        onClick={() => handleEditClick(item.path)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Bearbeiten<span className="sr-only">, {item.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {error && (
              <div className="mt-4 text-red-600">
                <p>Fehler: {error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
