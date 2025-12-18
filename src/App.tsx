import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@ds-cola/react";
import CheckoutForm from "./components/Checkout/CheckoutForm";
import Analytics from "./components/Admin/Analytics";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider brand="Voomp" theme="light">
        <Routes>
          <Route path="/" element={<CheckoutForm />} />
          <Route path="/checkout" element={<CheckoutForm />} />
          <Route path="/admin" element={<Analytics />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
