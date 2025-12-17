import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CheckoutForm from './components/Checkout/CheckoutForm';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CheckoutForm />} />
        <Route path="/checkout" element={<CheckoutForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
