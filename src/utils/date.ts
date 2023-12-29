import format from "date-fns/format";

const DATE_FORMAT_STRING = "iii, dd MMM yyyy HH:mm:ss xx";

// DATE_RFC822
export function getFormattedCurrentDate() {
  return format(Date.now(), DATE_FORMAT_STRING);
}
