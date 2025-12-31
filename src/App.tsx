import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/NotFound";
import SimulatorPageVSCode from "@/pages/desktop/SimulatorPageVSCode";

const queryClient = new QueryClient();



const App = () => {
  const rawBase = import.meta.env.BASE_URL ?? '/';
  const basename =
    rawBase === '/' ? '' : rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

  return (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter basename={basename}>
          <Routes>
            <Route path="/" element={<SimulatorPageVSCode />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
  );
};

export default App;
