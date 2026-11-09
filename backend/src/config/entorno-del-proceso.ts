export function entornoDelProceso(): NodeJS.ProcessEnv {
  return { ...process.env };
}
