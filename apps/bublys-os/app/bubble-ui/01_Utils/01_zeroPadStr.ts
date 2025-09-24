export default function zeroPadStr(num: number, places: number): string {
  if (!(places >= 0 && Number.isInteger(places))) {
    throw new Error(`桁数は正の整数でなければなりません。: ${places}`);
  }

  return String(num).padStart(places, "0");
}
