import { useRef } from "react";
import { Link, useLocation } from "react-router";
import { ACCOUNT_PATH, DEAL_CREATION_PATH, DOWNLOAD_PATH } from "../lib/consts";

type Page = {
  path: string;
  label: string;
};

const pages: Page[] = [
  { path: ACCOUNT_PATH, label: "Account" },
  { path: DEAL_CREATION_PATH, label: "Deal Creation" },
  { path: DOWNLOAD_PATH, label: "Deal Retrieval" },
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
    <div className="relative mr-6">
      <details ref={dropdownRef} className="group">
        <summary className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-sm cursor-pointer">
          Navigate
        </summary>
        <ul className="absolute mt-1 bg-white border rounded shadow p-1 z-10">
          {pages
            .filter((page) => page.path !== location.pathname)
            .map((page) => (
              <li key={page.path}>
                <Link
                  to={page.path}
                  onClick={handleSelect}
                  className="block px-3 py-1 hover:bg-gray-100 whitespace-nowrap"
                >
                  {page.label}
                </Link>
              </li>
            ))}
        </ul>
      </details>
    </div>
  );
}
