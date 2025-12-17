import { BrowserRouter, Routes, Route } from "react-router-dom";
import CheckoutForm from "./components/Checkout/CheckoutForm";
import { ThemeProvider } from "@ds-cola/react";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider brand="Voomp" theme="light">
        <Routes>
          <Route path="/" element={<CheckoutForm />} />
          <Route path="/checkout" element={<CheckoutForm />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
