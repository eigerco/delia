import { ChevronDownCircle, Download, FilePlus, User } from "lucide-react";
import { useRef } from "react";
import { Link, useLocation } from "react-router";
import { ACCOUNT_PATH, DEAL_CREATION_PATH, DOWNLOAD_PATH } from "../lib/consts";

type Page = {
  path: string;
  label: string;
  icon: React.ReactNode;
};

const pages: Page[] = [
  { path: ACCOUNT_PATH, label: "Account", icon: <User className="w-4 h-4 mr-2" /> },
  { path: DEAL_CREATION_PATH, label: "Deal Creation", icon: <FilePlus className="w-4 h-4 mr-2" /> },
  { path: DOWNLOAD_PATH, label: "Deal Retrieval", icon: <Download className="w-4 h-4 mr-2" /> },
];

/**
 * A dropdown menu that links to all other app pages except the current one.
 */
export function NavDropdown() {
  const location = useLocation();
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  const handleSelect = () => {
    dropdownRef.current?.removeAttribute("open");
  };

  return (
    <div className="relative gap-6">
      <details ref={dropdownRef} className="group relative">
        <summary className="flex items-center gap-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-sm cursor-pointer">
          Navigate
          <ChevronDownCircle className="w-4 h-4 text-gray-500" />
        </summary>
        <ul className="absolute mt-1 bg-white border rounded shadow p-1 z-10">
          {pages
            .filter((page) => page.path !== location.pathname)
            .map((page) => (
              <li key={page.path}>
                <Link
                  to={page.path}
                  onClick={handleSelect}
                  className="flex items-center gap-2 px-3 py-1 hover:bg-gray-100 whitespace-nowrap min-w-[160px]"
                >
                  {page.icon}
                  {page.label}
                </Link>
              </li>
            ))}
        </ul>
      </details>
    </div>
  );
}
