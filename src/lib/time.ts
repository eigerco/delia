export const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // in seconds

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (diff < 60) return rtf.format(-diff, "second");
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), "hour");

  return rtf.format(-Math.floor(diff / 86400), "day");
};
