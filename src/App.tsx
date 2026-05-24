import { RouterProvider } from "react-router-dom"
import { router } from "./app/router"
import { Toaster } from "./components/ui/toaster"
import { ErrorBoundary } from "./components/ErrorBoundary"

function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <Toaster />
    </ErrorBoundary>
  )
}

export default App
