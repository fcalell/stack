// The one copy of MSW the workbench runs, for a plugin's handler module to
// import by this package's name: a handler built on another copy would not
// match the worker the host starts.
export * from "msw";
