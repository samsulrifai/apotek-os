import { RouterProvider } from "react-router-dom"
import { router } from "./app/router"
import { Toaster } from "./components/ui/toaster"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { ThemeProvider } from "./app/providers/ThemeProvider"

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
