import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/NotFound";
import SimulatorPageVSCode from "@/pages/desktop/SimulatorPageVSCode";

const queryClient = new QueryClient();



const App = () => {
  // Hardcode basename for GitHub Pages deployment
  const basename = '/PJ-Y86-64-Simulator';

  return (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
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
